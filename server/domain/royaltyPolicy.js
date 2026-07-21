'use strict';

const crypto = require('crypto');

const ROLES = Object.freeze([
  'data_operator', 'royalty_accountant', 'rights_reviewer',
  'payment_operator', 'auditor', 'admin'
]);
const TRANSITIONS = Object.freeze({
  calculated: new Set(['review_pending', 'exception']),
  review_pending: new Set(['approved', 'exception']),
  approved: new Set(['posting_pending', 'corrected', 'reversed']),
  posting_pending: new Set(['posted', 'exception']),
  posted: new Set(['reconciled', 'exception', 'corrected', 'reversed']),
  reconciled: new Set(['locked', 'corrected', 'reversed']),
  exception: new Set(['review_pending', 'corrected', 'reversed']),
  locked: new Set(['corrected', 'reversed']),
  corrected: new Set(),
  reversed: new Set()
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function isoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function integer(value, minimum = 0) {
  return Number.isSafeInteger(value) && value >= minimum;
}

function safeNumber(value, label) {
  const converted = Number(value);
  if (!Number.isSafeInteger(converted)) throw new Error(`${label} exceeds safe integer range`);
  return converted;
}

function roundedBasisPoints(amount, basisPoints) {
  return safeNumber((BigInt(amount) * BigInt(basisPoints) + 5000n) / 10000n, 'basis-point result');
}

function validateStatement(statement) {
  const errors = [];
  for (const field of ['tenantId', 'sourceSystem', 'statementId']) {
    if (!String(statement?.[field] || '').trim()) errors.push(`${field} is required`);
  }
  if (!integer(statement?.statementVersion, 1)) errors.push('statementVersion must be a positive integer');
  if (!isoDate(statement?.periodStart) || !isoDate(statement?.periodEnd) || statement.periodStart > statement.periodEnd) errors.push('a valid inclusive statement period is required');
  if (!/^[A-Z]{3}$/.test(String(statement?.currency || ''))) errors.push('currency must be ISO 4217 uppercase');
  if (!/^[a-f0-9]{64}$/.test(String(statement?.sourceDigest || ''))) errors.push('sourceDigest must be SHA-256');
  if (!Array.isArray(statement?.lines) || !statement.lines.length) errors.push('at least one usage line is required');
  const references = new Set();
  for (const [index, line] of (statement?.lines || []).entries()) {
    const prefix = `line ${index}`;
    if (!String(line?.usageRef || '').trim()) errors.push(`${prefix}: usageRef is required`);
    else if (references.has(line.usageRef)) errors.push(`${prefix}: usageRef must be unique`);
    else references.add(line.usageRef);
    if (!String(line?.recordingId || line?.workId || '').trim()) errors.push(`${prefix}: recordingId or workId is required`);
    if (!/^[A-Z]{2}$/.test(String(line?.territory || ''))) errors.push(`${prefix}: territory must be ISO alpha-2 uppercase`);
    if (!integer(line?.units)) errors.push(`${prefix}: units must be a non-negative safe integer`);
    if (!integer(line?.grossAmountMinor)) errors.push(`${prefix}: grossAmountMinor must be a non-negative safe integer`);
    if (!integer(line?.deductionsMinor) || line.deductionsMinor > line.grossAmountMinor) errors.push(`${prefix}: deductionsMinor is invalid`);
    if (line?.netAmountMinor !== undefined && line.netAmountMinor !== line.grossAmountMinor - line.deductionsMinor) errors.push(`${prefix}: supplied netAmountMinor does not reconcile`);
    if (!isoDate(line?.usageDate)) errors.push(`${prefix}: usageDate is required`);
  }
  return { ok: errors.length === 0, errors, inputDigest: digest(statement) };
}

function validateContract(contract) {
  const errors = [];
  for (const field of ['contractId', 'version', 'effectiveFrom']) if (!String(contract?.[field] || '').trim()) errors.push(`${field} is required`);
  if (!isoDate(contract?.effectiveFrom) || (contract?.effectiveTo && (!isoDate(contract.effectiveTo) || contract.effectiveTo < contract.effectiveFrom))) errors.push('contract effective dates are invalid');
  if (!/^[A-Z]{3}$/.test(String(contract?.currency || ''))) errors.push('contract currency must be ISO 4217 uppercase');
  if (!integer(contract?.royaltyRateBasisPoints) || contract.royaltyRateBasisPoints > 10000) errors.push('royaltyRateBasisPoints must be 0..10000');
  if (!integer(contract?.withholdingBasisPoints || 0) || (contract.withholdingBasisPoints || 0) > 10000) errors.push('withholdingBasisPoints must be 0..10000');
  if (!Array.isArray(contract?.splits) || !contract.splits.length) errors.push('contract splits are required');
  const parties = new Set();
  let total = 0;
  for (const [index, split] of (contract?.splits || []).entries()) {
    if (!String(split?.partyId || '').trim() || parties.has(split.partyId)) errors.push(`split ${index}: unique partyId is required`);
    parties.add(split?.partyId);
    if (!integer(split?.shareBasisPoints, 1)) errors.push(`split ${index}: positive shareBasisPoints are required`);
    total += Number(split?.shareBasisPoints || 0);
  }
  if (contract?.splits?.length && total !== 10000) errors.push('contract splits must total exactly 10000 basis points');
  return { ok: errors.length === 0, errors, contractDigest: digest(contract) };
}

function allocateMinorUnits(amount, splits) {
  const ranked = splits.map((split) => {
    const numerator = BigInt(amount) * BigInt(split.shareBasisPoints);
    return { partyId: split.partyId, shareBasisPoints: split.shareBasisPoints, amountMinor: safeNumber(numerator / 10000n, 'split allocation'), remainder: Number(numerator % 10000n) };
  });
  let unallocated = amount - ranked.reduce((sum, item) => sum + item.amountMinor, 0);
  ranked.sort((a, b) => b.remainder - a.remainder || String(a.partyId).localeCompare(String(b.partyId)));
  for (let index = 0; index < unallocated; index += 1) ranked[index].amountMinor += 1;
  return ranked.sort((a, b) => String(a.partyId).localeCompare(String(b.partyId))).map(({ remainder, ...item }) => item);
}

function calculateRoyalties(statement, contract) {
  const statementValidation = validateStatement(statement);
  const contractValidation = validateContract(contract);
  const errors = [...statementValidation.errors, ...contractValidation.errors];
  if (statement.currency !== contract.currency) errors.push('statement and contract currencies must match');
  for (const [index, line] of (statement.lines || []).entries()) {
    if (line.usageDate < contract.effectiveFrom || (contract.effectiveTo && line.usageDate > contract.effectiveTo)) errors.push(`line ${index}: usage is outside the contract effective dates`);
  }
  if (errors.length) throw new Error(errors.join('; '));
  const withholdingBps = contract.withholdingBasisPoints || 0;
  const lines = statement.lines.map((line) => {
    const netAmountMinor = line.grossAmountMinor - line.deductionsMinor;
    const royaltyPoolMinor = roundedBasisPoints(netAmountMinor, contract.royaltyRateBasisPoints);
    const allocations = allocateMinorUnits(royaltyPoolMinor, contract.splits).map((allocation) => {
      const withholdingMinor = roundedBasisPoints(allocation.amountMinor, withholdingBps);
      return { ...allocation, withholdingMinor, payableMinor: allocation.amountMinor - withholdingMinor };
    });
    return {
      usageRef: line.usageRef,
      recordingId: line.recordingId || null,
      workId: line.workId || null,
      usageDate: line.usageDate,
      grossAmountMinor: line.grossAmountMinor,
      deductionsMinor: line.deductionsMinor,
      netAmountMinor,
      royaltyPoolMinor,
      allocations,
      explanation: `net ${netAmountMinor} × ${contract.royaltyRateBasisPoints}bp; split ${contract.version}; withholding ${withholdingBps}bp`
    };
  });
  const sum = (name) => safeNumber(lines.reduce((total, line) => total + BigInt(line[name]), 0n), `${name} total`);
  const allocations = lines.flatMap((line) => line.allocations);
  const result = {
    statementId: statement.statementId,
    statementVersion: statement.statementVersion,
    contractId: contract.contractId,
    contractVersion: contract.version,
    currency: statement.currency,
    totals: {
      grossAmountMinor: sum('grossAmountMinor'), deductionsMinor: sum('deductionsMinor'),
      netAmountMinor: sum('netAmountMinor'), royaltyPoolMinor: sum('royaltyPoolMinor'),
      withholdingMinor: safeNumber(allocations.reduce((sumValue, item) => sumValue + BigInt(item.withholdingMinor), 0n), 'withholding total'),
      payableMinor: safeNumber(allocations.reduce((sumValue, item) => sumValue + BigInt(item.payableMinor), 0n), 'payable total')
    },
    lines
  };
  return { ...result, calculationDigest: digest(result) };
}

function authorizeTransition({ current, next, actor, calculation, approvals = [], providers = [], periodLocked = false, reconciled = false, unresolvedOverrides = false }) {
  const errors = [];
  if (!TRANSITIONS[current]?.has(next)) errors.push(`transition ${current} -> ${next} is not allowed`);
  if (!ROLES.includes(actor?.role)) errors.push('recognized royalty role is required');
  if (periodLocked && !['corrected', 'reversed'].includes(next)) errors.push('locked periods cannot be mutated');
  if (['review_pending'].includes(next) && !['royalty_accountant', 'admin'].includes(actor?.role)) errors.push('royalty accountant role is required');
  if (next === 'approved') {
    const approved = approvals.filter((item) => item.decision === 'approve');
    const types = new Set(approved.map((item) => item.approvalType));
    if (!types.has('financial') || !types.has('rights')) errors.push('financial and rights approvals are required');
    if (approved.some((item) => String(item.actorId) === String(calculation?.createdBy))) errors.push('calculator cannot approve their own calculation');
    if (new Set(approved.map((item) => String(item.actorId))).size < 2) errors.push('approvals must be from distinct reviewers');
    if (!['royalty_accountant', 'rights_reviewer', 'admin'].includes(actor?.role)) errors.push('reviewer role is required');
    if (unresolvedOverrides) errors.push('all overrides require independent rights review');
  }
  if (next === 'posting_pending') {
    if (!['royalty_accountant', 'admin'].includes(actor?.role)) errors.push('royalty accountant role is required to request posting');
    for (const required of ['ledger', 'banking']) if (!providers.includes(required)) errors.push(`${required} provider is required`);
  }
  if (next === 'posted' && !['payment_operator', 'admin'].includes(actor?.role)) errors.push('payment operator role is required');
  if (next === 'reconciled' && !['royalty_accountant', 'auditor', 'admin'].includes(actor?.role)) errors.push('accounting reviewer role is required');
  if (next === 'reconciled' && !reconciled) errors.push('matched ledger and bank reconciliation evidence is required');
  if (next === 'locked' && !['auditor', 'admin'].includes(actor?.role)) errors.push('auditor role is required to lock a reconciled result');
  if (['corrected', 'reversed'].includes(next) && !['royalty_accountant', 'admin'].includes(actor?.role)) errors.push('royalty accountant role is required for corrections or reversals');
  return { ok: errors.length === 0, errors };
}

function validateOverride(override, actor) {
  const errors = [];
  if (!['royalty_accountant', 'admin'].includes(actor?.role)) errors.push('royalty accountant role is required');
  if (!String(override?.field || '').trim() || !String(override?.reason || '').trim() || !String(override?.evidenceRef || '').trim()) errors.push('field, reason, and evidenceRef are required');
  if (override?.oldValue === undefined || override?.newValue === undefined || JSON.stringify(override.oldValue) === JSON.stringify(override.newValue)) errors.push('override must document a changed value');
  return { ok: errors.length === 0, errors, evidenceDigest: digest(override) };
}

function evaluateBacktest(fixtureVersion, cases) {
  if (!String(fixtureVersion || '').trim() || !Array.isArray(cases) || !cases.length) throw new Error('fixtureVersion and golden cases are required');
  const results = cases.map((item) => {
    const actual = calculateRoyalties(item.statement, item.contract);
    const actualPayableMinor = item.scenario === 'reversal' ? -actual.totals.payableMinor : actual.totals.payableMinor;
    const exact = actualPayableMinor === item.expectedPayableMinor;
    const scenarioEvidence = {
      golden: true,
      correction: /^[a-f0-9]{64}$/.test(String(item.supersedesCalculationDigest || '')),
      late_data: item.receivedAfterPeriodEnd === true,
      effective_date_boundary: item.statement.lines.some((line) => line.usageDate === item.contract.effectiveFrom || line.usageDate === item.contract.effectiveTo),
      reversal: /^[a-f0-9]{64}$/.test(String(item.reversesCalculationDigest || ''))
    };
    const requiredScenario = scenarioEvidence[item.scenario] === true;
    return { caseId: item.caseId, scenario: item.scenario, exact, requiredScenario, expectedPayableMinor: item.expectedPayableMinor, actualPayableMinor, calculationDigest: actual.calculationDigest };
  });
  const scenarioCoverage = Object.fromEntries(['golden', 'correction', 'late_data', 'effective_date_boundary', 'reversal'].map((scenario) => [scenario, results.some((item) => item.scenario === scenario && item.exact)]));
  return { fixtureVersion, caseCount: results.length, exactMatchRate: results.filter((item) => item.exact).length / results.length, scenarioCoverage, passed: results.every((item) => item.exact && item.requiredScenario) && Object.values(scenarioCoverage).every(Boolean), results, evidenceDigest: digest({ fixtureVersion, results }) };
}

module.exports = { ROLES, TRANSITIONS, allocateMinorUnits, authorizeTransition, calculateRoyalties, digest, evaluateBacktest, validateContract, validateOverride, validateStatement };
