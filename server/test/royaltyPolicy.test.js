'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  allocateMinorUnits, authorizeTransition, calculateRoyalties,
  evaluateBacktest, validateContract, validateOverride, validateStatement
} = require('../domain/royaltyPolicy');
const { providerReadiness, requireProviders } = require('../services/providerBoundary');

function statement() {
  return {
    tenantId: 'tenant-1', sourceSystem: 'dsp-a', statementId: 'statement-2026-01', statementVersion: 2,
    periodStart: '2026-01-01', periodEnd: '2026-01-31', currency: 'USD', sourceDigest: 'a'.repeat(64),
    lines: [
      { usageRef: 'u-1', recordingId: 'isrc-1', territory: 'US', usageDate: '2026-01-10', units: 100, grossAmountMinor: 10000, deductionsMinor: 1000, netAmountMinor: 9000 },
      { usageRef: 'u-2', workId: 'iswc-2', territory: 'GB', usageDate: '2026-01-31', units: 7, grossAmountMinor: 1001, deductionsMinor: 1 }
    ]
  };
}

function contract() {
  return {
    contractId: 'contract-1', version: 'v3', effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31',
    currency: 'USD', royaltyRateBasisPoints: 1000, withholdingBasisPoints: 1000,
    splits: [{ partyId: 'artist', shareBasisPoints: 6000 }, { partyId: 'publisher', shareBasisPoints: 4000 }]
  };
}

test('validates versioned reconciled usage statements', () => {
  const result = validateStatement(statement());
  assert.equal(result.ok, true);
  assert.match(result.inputDigest, /^[a-f0-9]{64}$/);
});

test('rejects duplicate usage refs, unreconciled amounts, and missing ownership IDs', () => {
  const invalid = statement();
  invalid.lines[1] = { ...invalid.lines[0], recordingId: '', netAmountMinor: 3, deductionsMinor: 20000 };
  const result = validateStatement(invalid);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('unique')));
  assert.ok(result.errors.some((error) => error.includes('recordingId or workId')));
  assert.ok(result.errors.some((error) => error.includes('does not reconcile')));
});

test('validates effective contract versions and exact split totals', () => {
  assert.equal(validateContract(contract()).ok, true);
  const invalid = contract();
  invalid.splits[0].shareBasisPoints = 5000;
  invalid.effectiveTo = '2025-01-01';
  const result = validateContract(invalid);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('10000')));
  assert.ok(result.errors.some((error) => error.includes('effective dates')));
});

test('calculates deterministic integer royalties with explainable withholding', () => {
  const result = calculateRoyalties(statement(), contract());
  assert.deepEqual(result.totals, { grossAmountMinor: 11001, deductionsMinor: 1001, netAmountMinor: 10000, royaltyPoolMinor: 1000, withholdingMinor: 100, payableMinor: 900 });
  assert.equal(result.lines[0].allocations[0].partyId, 'artist');
  assert.match(result.lines[0].explanation, /v3/);
  assert.match(result.calculationDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(result, calculateRoyalties(statement(), contract()));
});

test('deterministically assigns rounding remainder without losing a cent', () => {
  const allocated = allocateMinorUnits(1, [{ partyId: 'zeta', shareBasisPoints: 5000 }, { partyId: 'alpha', shareBasisPoints: 5000 }]);
  assert.deepEqual(allocated, [{ partyId: 'alpha', shareBasisPoints: 5000, amountMinor: 1 }, { partyId: 'zeta', shareBasisPoints: 5000, amountMinor: 0 }]);
  assert.equal(allocated.reduce((sum, item) => sum + item.amountMinor, 0), 1);
});

test('rejects currency mismatch and usage outside effective dates', () => {
  const mismatch = contract();
  mismatch.currency = 'EUR';
  assert.throws(() => calculateRoyalties(statement(), mismatch), /currencies must match/);
  const outside = statement();
  outside.lines[0].usageDate = '2027-01-01';
  assert.throws(() => calculateRoyalties(outside, contract()), /outside the contract/);
});

test('rejects aggregate minor-unit values outside the safe integer range', () => {
  const tooLarge = statement();
  tooLarge.lines = [0, 1].map((index) => ({ ...tooLarge.lines[0], usageRef: `huge-${index}`, grossAmountMinor: Number.MAX_SAFE_INTEGER, deductionsMinor: 0, netAmountMinor: Number.MAX_SAFE_INTEGER }));
  const fullRate = contract();
  fullRate.royaltyRateBasisPoints = 10000;
  assert.throws(() => calculateRoyalties(tooLarge, fullRate), /exceeds safe integer range/);
});

test('enforces distinct financial and rights review with no self approval', () => {
  const approvals = [
    { actorId: 20, approvalType: 'financial', decision: 'approve' },
    { actorId: 30, approvalType: 'rights', decision: 'approve' }
  ];
  assert.equal(authorizeTransition({ current: 'review_pending', next: 'approved', actor: { role: 'rights_reviewer' }, calculation: { createdBy: 10 }, approvals }).ok, true);
  approvals[0].actorId = 10;
  const rejected = authorizeTransition({ current: 'review_pending', next: 'approved', actor: { role: 'rights_reviewer' }, calculation: { createdBy: 10 }, approvals });
  assert.equal(rejected.ok, false);
  assert.ok(rejected.errors.some((error) => error.includes('own calculation')));
});

test('requires typed providers, payment segregation, and audit-only locks', () => {
  assert.equal(authorizeTransition({ current: 'approved', next: 'posting_pending', actor: { role: 'royalty_accountant' }, providers: ['ledger'] }).ok, false);
  assert.equal(authorizeTransition({ current: 'approved', next: 'posting_pending', actor: { role: 'royalty_accountant' }, providers: ['ledger', 'banking'] }).ok, true);
  assert.equal(authorizeTransition({ current: 'posting_pending', next: 'posted', actor: { role: 'royalty_accountant' } }).ok, false);
  assert.equal(authorizeTransition({ current: 'posting_pending', next: 'posted', actor: { role: 'payment_operator' } }).ok, true);
  assert.equal(authorizeTransition({ current: 'posted', next: 'reconciled', actor: { role: 'auditor' }, reconciled: false }).ok, false);
  assert.equal(authorizeTransition({ current: 'posted', next: 'reconciled', actor: { role: 'auditor' }, reconciled: true }).ok, true);
  assert.equal(authorizeTransition({ current: 'reconciled', next: 'locked', actor: { role: 'auditor' } }).ok, true);
});

test('locked periods permit linked corrections but no ordinary mutation', () => {
  assert.equal(authorizeTransition({ current: 'reconciled', next: 'locked', actor: { role: 'auditor' }, periodLocked: true }).ok, false);
  assert.equal(authorizeTransition({ current: 'locked', next: 'corrected', actor: { role: 'royalty_accountant' }, periodLocked: true }).ok, true);
});

test('overrides require accountable evidence and a changed value', () => {
  const valid = validateOverride({ field: 'territory', oldValue: 'US', newValue: 'GB', reason: 'source correction', evidenceRef: 'doc-7' }, { role: 'royalty_accountant' });
  assert.equal(valid.ok, true);
  assert.match(valid.evidenceDigest, /^[a-f0-9]{64}$/);
  assert.equal(validateOverride({ field: 'territory', oldValue: 'US', newValue: 'US' }, { role: 'payment_operator' }).ok, false);
});

test('backtests golden, correction, late data, boundary, and reversal scenarios', () => {
  const scenarios = ['golden', 'correction', 'late_data', 'effective_date_boundary', 'reversal'];
  const cases = scenarios.map((scenario, index) => {
    const usageStatement = statement();
    if (scenario === 'effective_date_boundary') usageStatement.lines[0].usageDate = contract().effectiveFrom;
    return {
      caseId: `case-${index}`, scenario, statement: usageStatement, contract: contract(),
      expectedPayableMinor: scenario === 'reversal' ? -900 : 900,
      supersedesCalculationDigest: scenario === 'correction' ? 'b'.repeat(64) : undefined,
      receivedAfterPeriodEnd: scenario === 'late_data',
      reversesCalculationDigest: scenario === 'reversal' ? 'c'.repeat(64) : undefined
    };
  });
  const result = evaluateBacktest('fixtures-2026-07', cases);
  assert.equal(result.passed, true);
  assert.equal(result.exactMatchRate, 1);
  assert.deepEqual(Object.values(result.scenarioCoverage), [true, true, true, true, true]);
  cases[0].expectedPayableMinor = 899;
  assert.equal(evaluateBacktest('fixtures-2026-07-bad', cases).passed, false);
});

test('authoritative provider boundary fails closed until explicitly complete', () => {
  assert.equal(providerReadiness({}).ready, false);
  assert.throws(() => requireProviders(['ledger', 'banking'], {}), /not ready/);
  assert.throws(() => requireProviders(['invented'], {}), /unknown providers/);
  const env = {};
  for (const name of ['LEDGER', 'BANKING', 'BILLING', 'CRM', 'MARKET_DATA', 'DOCUMENTS', 'FILINGS']) {
    env[`${name}_PROVIDER_ENABLED`] = 'true';
    env[`${name}_PROVIDER_URL`] = `https://${name.toLowerCase().replace('_', '-')}.example.invalid`;
    env[`${name}_PROVIDER_TOKEN`] = 'runtime-secret';
  }
  assert.equal(providerReadiness(env).ready, true);
  assert.deepEqual(requireProviders(['ledger', 'banking'], env).map((item) => item.name), ['ledger', 'banking']);
});

test('governed policy supports the calculation-to-lock path without autonomous payment', () => {
  const calculation = calculateRoyalties(statement(), contract());
  const approvals = [{ actorId: 20, approvalType: 'financial', decision: 'approve' }, { actorId: 30, approvalType: 'rights', decision: 'approve' }];
  assert.equal(authorizeTransition({ current: 'calculated', next: 'review_pending', actor: { role: 'royalty_accountant' } }).ok, true);
  assert.equal(authorizeTransition({ current: 'review_pending', next: 'approved', actor: { role: 'rights_reviewer' }, calculation: { createdBy: 10 }, approvals }).ok, true);
  assert.equal(authorizeTransition({ current: 'approved', next: 'posting_pending', actor: { role: 'royalty_accountant' }, providers: ['ledger', 'banking'] }).ok, true);
  assert.equal(authorizeTransition({ current: 'posting_pending', next: 'posted', actor: { role: 'payment_operator' } }).ok, true);
  assert.equal(authorizeTransition({ current: 'posted', next: 'reconciled', actor: { role: 'auditor' }, reconciled: calculation.totals.payableMinor === 900 }).ok, true);
  assert.equal(authorizeTransition({ current: 'reconciled', next: 'locked', actor: { role: 'auditor' } }).ok, true);
});
