'use strict';

const express = require('express');
const pool = require('../db');
const {
  authorizeTransition, calculateRoyalties, digest, evaluateBacktest,
  validateContract, validateOverride, validateStatement
} = require('../domain/royaltyPolicy');
const { providerReadiness, requireProviders } = require('../services/providerBoundary');

module.exports = function buildGovernedRoyaltyRouter(authenticateToken) {
  const router = express.Router();
  router.use(authenticateToken);
  const tenant = (req) => String(req.user.tenantId);
  const roles = (...allowed) => (req, res, next) => allowed.includes(req.user.role) ? next() : res.status(403).json({ error: 'Insufficient royalty role' });

  async function transaction(work) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  function fail(res, error, fallback) {
    if (error.code === '23505') return res.status(409).json({ error: 'Version or idempotency conflict' });
    if (error.code === 'PROVIDER_NOT_READY') return res.status(503).json({ error: error.message });
    const status = error.status || (/required|invalid|must|outside|match|allowed|cannot|locked|reconcile/.test(error.message) ? 422 : 500);
    return res.status(status).json({ error: status === 500 ? fallback : error.message });
  }

  async function appendEvent(client, req, calculationId, eventType, payload, evidenceDigest = null) {
    await client.query(
      `INSERT INTO royalty_events(tenant_id,calculation_id,actor_id,event_type,payload,evidence_digest)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [tenant(req), calculationId || null, req.user.id, eventType, payload || {}, evidenceDigest]
    );
  }

  router.get('/providers/readiness', roles('auditor', 'admin', 'royalty_accountant'), (_req, res) => {
    const readiness = providerReadiness();
    res.status(readiness.ready ? 200 : 503).json(readiness);
  });

  router.post('/integrations/:provider/reconciliation', roles('data_operator', 'royalty_accountant', 'auditor', 'admin'), async (req, res) => {
    try {
      const provider = String(req.params.provider || '').toLowerCase();
      const idempotencyKey = String(req.get('Idempotency-Key') || '').trim();
      const { direction, externalCursor, recordCount, sourceDigest, providerEvidenceDigest, reconciliationStatus } = req.body || {};
      if (!idempotencyKey || !['pull', 'push'].includes(direction) || !String(externalCursor || '').trim() || !Number.isSafeInteger(recordCount) || recordCount < 0 || !/^[a-f0-9]{64}$/.test(String(sourceDigest || '')) || !/^[a-f0-9]{64}$/.test(String(providerEvidenceDigest || '')) || !['matched', 'mismatch'].includes(reconciliationStatus)) return res.status(422).json({ error: 'Typed idempotent sync cursor, counts, digests, and reconciliation status are required' });
      requireProviders([provider]);
      const result = await transaction(async (client) => {
        const replay = await client.query('SELECT * FROM royalty_integration_syncs WHERE tenant_id=$1 AND provider=$2 AND idempotency_key=$3', [tenant(req), provider, idempotencyKey]);
        if (replay.rows[0]) return { sync: replay.rows[0], replayed: true };
        const inserted = await client.query(
          `INSERT INTO royalty_integration_syncs
           (tenant_id,provider,idempotency_key,direction,external_cursor,record_count,source_digest,provider_evidence_digest,reconciliation_status,created_by)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
          [tenant(req), provider, idempotencyKey, direction, externalCursor, recordCount, sourceDigest, providerEvidenceDigest, reconciliationStatus, req.user.id]
        );
        await appendEvent(client, req, null, 'integration_reconciled', { provider, direction, recordCount, reconciliationStatus }, providerEvidenceDigest);
        return { sync: inserted.rows[0], replayed: false };
      });
      if (result.sync.reconciliation_status === 'mismatch') return res.status(409).json({ error: 'Provider synchronization does not reconcile', ...result });
      return res.status(result.replayed ? 200 : 201).json(result);
    } catch (error) {
      return fail(res, error, 'Provider synchronization reconciliation failed');
    }
  });

  router.post('/accounting-periods', roles('royalty_accountant', 'admin'), async (req, res) => {
    try {
      const { periodStart, periodEnd } = req.body || {};
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(periodStart || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(periodEnd || '')) || periodStart > periodEnd) return res.status(422).json({ error: 'Valid accounting period dates are required' });
      const overlap = await pool.query(
        'SELECT id FROM royalty_accounting_periods WHERE tenant_id=$1 AND NOT ($3::date < period_start OR $2::date > period_end) LIMIT 1',
        [tenant(req), periodStart, periodEnd]
      );
      if (overlap.rows[0]) return res.status(409).json({ error: 'Accounting periods cannot overlap' });
      const result = await pool.query(
        "INSERT INTO royalty_accounting_periods(tenant_id,period_start,period_end,status) VALUES($1,$2,$3,'open') RETURNING *",
        [tenant(req), periodStart, periodEnd]
      );
      return res.status(201).json(result.rows[0]);
    } catch (error) {
      return fail(res, error, 'Accounting period could not be created');
    }
  });

  router.post('/accounting-periods/:id/review', roles('royalty_accountant', 'admin'), async (req, res) => {
    try {
      const result = await pool.query(
        "UPDATE royalty_accounting_periods SET status='review' WHERE id=$1 AND tenant_id=$2 AND status='open' RETURNING *",
        [req.params.id, tenant(req)]
      );
      if (!result.rows[0]) return res.status(409).json({ error: 'Only an open accounting period can enter review' });
      return res.json(result.rows[0]);
    } catch (error) {
      return fail(res, error, 'Accounting period review failed');
    }
  });

  router.post('/accounting-periods/:id/lock', roles('auditor', 'admin'), async (req, res) => {
    try {
      if (!/^[a-f0-9]{64}$/.test(String(req.body?.evidenceDigest || ''))) return res.status(422).json({ error: 'SHA-256 lock evidence is required' });
      const result = await transaction(async (client) => {
        const period = await client.query("SELECT * FROM royalty_accounting_periods WHERE id=$1 AND tenant_id=$2 AND status='review' FOR UPDATE", [req.params.id, tenant(req)]);
        if (!period.rows[0]) throw Object.assign(new Error('Only a reviewed accounting period can be locked'), { status: 409 });
        const calculationState = await client.query(
          `SELECT COUNT(*)::integer AS total,
                  COUNT(*) FILTER (WHERE status IN ('locked','corrected','reversed'))::integer AS finalized
           FROM royalty_calculation_runs WHERE tenant_id=$1 AND accounting_period_id=$2`,
          [tenant(req), req.params.id]
        );
        if (!calculationState.rows[0].total || calculationState.rows[0].total !== calculationState.rows[0].finalized) throw Object.assign(new Error('A period needs calculations and every calculation must be reconciled and individually locked'), { status: 409 });
        const locked = await client.query(
          "UPDATE royalty_accounting_periods SET status='locked',locked_by=$1,locked_at=NOW(),lock_evidence_digest=$2 WHERE id=$3 RETURNING *",
          [req.user.id, req.body.evidenceDigest, req.params.id]
        );
        await appendEvent(client, req, null, 'accounting_period_locked', { accountingPeriodId: Number(req.params.id) }, req.body.evidenceDigest);
        return locked.rows[0];
      });
      return res.json(result);
    } catch (error) {
      return fail(res, error, 'Accounting period lock failed');
    }
  });

  router.post('/statements', roles('data_operator', 'royalty_accountant', 'admin'), async (req, res) => {
    try {
      const idempotencyKey = String(req.get('Idempotency-Key') || '').trim();
      if (!idempotencyKey) return res.status(400).json({ error: 'Idempotency-Key is required' });
      const statement = { ...req.body, tenantId: tenant(req) };
      const validation = validateStatement(statement);
      if (!validation.ok) return res.status(422).json({ error: 'Usage statement rejected', details: validation.errors });
      const result = await transaction(async (client) => {
        const replay = await client.query('SELECT * FROM royalty_usage_statements WHERE tenant_id=$1 AND idempotency_key=$2', [tenant(req), idempotencyKey]);
        if (replay.rows[0]) return { statement: replay.rows[0], replayed: true };
        const inserted = await client.query(
          `INSERT INTO royalty_usage_statements
           (tenant_id,idempotency_key,source_system,statement_ref,statement_version,period_start,period_end,currency,source_digest,payload,status,created_by)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'validated',$11) RETURNING *`,
          [tenant(req), idempotencyKey, statement.sourceSystem, statement.statementId, statement.statementVersion, statement.periodStart, statement.periodEnd, statement.currency, statement.sourceDigest, statement, req.user.id]
        );
        for (const line of statement.lines) {
          await client.query(
            `INSERT INTO royalty_usage_lines
             (tenant_id,statement_id,usage_ref,recording_ref,work_ref,territory,usage_date,units,gross_amount_minor,deductions_minor,net_amount_minor,payload)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [tenant(req), inserted.rows[0].id, line.usageRef, line.recordingId || null, line.workId || null, line.territory, line.usageDate, line.units, line.grossAmountMinor, line.deductionsMinor, line.grossAmountMinor - line.deductionsMinor, line]
          );
        }
        await appendEvent(client, req, null, 'statement_ingested', { statementId: inserted.rows[0].id, statementVersion: statement.statementVersion }, validation.inputDigest);
        return { statement: inserted.rows[0], replayed: false };
      });
      return res.status(result.replayed ? 200 : 201).json(result);
    } catch (error) {
      return fail(res, error, 'Usage statement could not be persisted');
    }
  });

  router.post('/contracts', roles('rights_reviewer', 'admin'), async (req, res) => {
    try {
      const validation = validateContract(req.body || {});
      if (!validation.ok) return res.status(422).json({ error: 'Contract version rejected', details: validation.errors });
      const result = await pool.query(
        `INSERT INTO royalty_contract_versions
         (tenant_id,contract_ref,version,effective_from,effective_to,currency,terms,terms_digest,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [tenant(req), req.body.contractId, req.body.version, req.body.effectiveFrom, req.body.effectiveTo || null, req.body.currency, req.body, validation.contractDigest, req.user.id]
      );
      return res.status(201).json(result.rows[0]);
    } catch (error) {
      return fail(res, error, 'Contract version could not be persisted');
    }
  });

  router.post('/statements/:statementId/calculations', roles('royalty_accountant', 'admin'), async (req, res) => {
    try {
      const idempotencyKey = String(req.get('Idempotency-Key') || '').trim();
      if (!idempotencyKey) return res.status(400).json({ error: 'Idempotency-Key is required' });
      if (!Number.isInteger(Number(req.body?.accountingPeriodId))) return res.status(422).json({ error: 'accountingPeriodId is required' });
      const result = await transaction(async (client) => {
        const replay = await client.query('SELECT * FROM royalty_calculation_runs WHERE tenant_id=$1 AND idempotency_key=$2', [tenant(req), idempotencyKey]);
        if (replay.rows[0]) return { calculation: replay.rows[0], replayed: true };
        const statementResult = await client.query('SELECT * FROM royalty_usage_statements WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.statementId, tenant(req)]);
        if (!statementResult.rows[0]) throw Object.assign(new Error('Statement not found'), { status: 404 });
        const contractResult = await client.query('SELECT * FROM royalty_contract_versions WHERE id=$1 AND tenant_id=$2', [req.body.contractVersionId, tenant(req)]);
        if (!contractResult.rows[0]) throw Object.assign(new Error('Contract version not found'), { status: 404 });
        const accountingPeriod = await client.query(
          `SELECT id FROM royalty_accounting_periods WHERE id=$1 AND tenant_id=$2 AND status='open'
           AND $3::date BETWEEN period_start AND period_end`,
          [req.body.accountingPeriodId, tenant(req), statementResult.rows[0].period_end]
        );
        if (!accountingPeriod.rows[0]) throw new Error('Calculation requires an open accounting period containing the statement end date');
        const calculation = calculateRoyalties(statementResult.rows[0].payload, contractResult.rows[0].terms);
        const inserted = await client.query(
          `INSERT INTO royalty_calculation_runs
           (tenant_id,idempotency_key,statement_id,contract_version_id,accounting_period_id,status,revision,currency,totals,calculation_digest,explanation,created_by)
           VALUES($1,$2,$3,$4,$5,'calculated',1,$6,$7,$8,$9,$10) RETURNING *`,
          [tenant(req), idempotencyKey, statementResult.rows[0].id, contractResult.rows[0].id, accountingPeriod.rows[0].id, calculation.currency, calculation.totals, calculation.calculationDigest, { formula: 'integer minor units, basis points, deterministic remainder allocation', contractVersion: calculation.contractVersion }, req.user.id]
        );
        for (const line of calculation.lines) {
          await client.query(
            `INSERT INTO royalty_calculation_lines
             (tenant_id,calculation_id,usage_ref,gross_amount_minor,deductions_minor,net_amount_minor,royalty_pool_minor,allocations,explanation)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [tenant(req), inserted.rows[0].id, line.usageRef, line.grossAmountMinor, line.deductionsMinor, line.netAmountMinor, line.royaltyPoolMinor, line.allocations, line.explanation]
          );
        }
        await appendEvent(client, req, inserted.rows[0].id, 'calculation_created', { statementId: statementResult.rows[0].id, contractVersionId: contractResult.rows[0].id }, calculation.calculationDigest);
        return { calculation: inserted.rows[0], replayed: false };
      });
      return res.status(result.replayed ? 200 : 201).json(result);
    } catch (error) {
      return fail(res, error, 'Royalty calculation failed');
    }
  });

  router.post('/calculations/:id/approvals', roles('royalty_accountant', 'rights_reviewer', 'admin'), async (req, res) => {
    try {
      const approvalType = req.user.role === 'rights_reviewer' ? 'rights' : req.user.role === 'royalty_accountant' ? 'financial' : req.body.approvalType;
      if (!['financial', 'rights'].includes(approvalType) || !['approve', 'reject'].includes(req.body?.decision) || !String(req.body?.attestation || '').trim()) return res.status(422).json({ error: 'Typed decision and attestation are required' });
      const calculation = await pool.query('SELECT id,created_by,status FROM royalty_calculation_runs WHERE id=$1 AND tenant_id=$2', [req.params.id, tenant(req)]);
      if (!calculation.rows[0]) return res.status(404).json({ error: 'Calculation not found' });
      if (String(calculation.rows[0].created_by) === String(req.user.id)) return res.status(409).json({ error: 'Calculator cannot approve their own calculation' });
      if (!['review_pending', 'exception'].includes(calculation.rows[0].status)) return res.status(409).json({ error: 'Calculation is not awaiting review' });
      const attestationDigest = digest({ approvalType, decision: req.body.decision, attestation: req.body.attestation });
      const result = await pool.query(
        `INSERT INTO royalty_approvals(tenant_id,calculation_id,actor_id,approval_type,decision,attestation_digest)
         VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [tenant(req), req.params.id, req.user.id, approvalType, req.body.decision, attestationDigest]
      );
      return res.status(201).json(result.rows[0]);
    } catch (error) {
      return fail(res, error, 'Approval could not be recorded');
    }
  });

  router.post('/calculations/:id/overrides', roles('royalty_accountant', 'admin'), async (req, res) => {
    try {
      const validation = validateOverride(req.body || {}, req.user);
      if (!validation.ok) return res.status(422).json({ error: 'Override rejected', details: validation.errors });
      const result = await pool.query(
        `INSERT INTO royalty_overrides
         (tenant_id,calculation_id,field_name,old_value,new_value,reason,evidence_ref,evidence_digest,requested_by,status)
         SELECT $1,id,$3,$4,$5,$6,$7,$8,$9,'pending_rights_review'
         FROM royalty_calculation_runs WHERE id=$2 AND tenant_id=$1 RETURNING *`,
        [tenant(req), req.params.id, req.body.field, req.body.oldValue, req.body.newValue, req.body.reason, req.body.evidenceRef, validation.evidenceDigest, req.user.id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Calculation not found' });
      return res.status(201).json(result.rows[0]);
    } catch (error) {
      return fail(res, error, 'Override could not be persisted');
    }
  });

  router.post('/calculations/:id/overrides/:overrideId/review', roles('rights_reviewer', 'admin'), async (req, res) => {
    try {
      if (!['approved', 'rejected'].includes(req.body?.decision) || !String(req.body?.attestation || '').trim()) return res.status(422).json({ error: 'Decision and attestation are required' });
      const result = await pool.query(
        `UPDATE royalty_overrides SET status=$1,reviewed_by=$2,review_attestation_digest=$3,reviewed_at=NOW()
         WHERE id=$4 AND calculation_id=$5 AND tenant_id=$6 AND requested_by<>$2 AND status='pending_rights_review' RETURNING *`,
        [req.body.decision, req.user.id, digest(req.body.attestation), req.params.overrideId, req.params.id, tenant(req)]
      );
      if (!result.rows[0]) return res.status(409).json({ error: 'Override unavailable or self-review attempted' });
      return res.json(result.rows[0]);
    } catch (error) {
      return fail(res, error, 'Override review failed');
    }
  });

  router.post('/calculations/:id/transition', async (req, res) => {
    try {
      const revision = Number(req.get('If-Match'));
      if (!Number.isInteger(revision) || revision < 1) return res.status(400).json({ error: 'If-Match must be a positive revision' });
      const result = await transaction(async (client) => {
        const found = await client.query('SELECT * FROM royalty_calculation_runs WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenant(req)]);
        const calculation = found.rows[0];
        if (!calculation) throw Object.assign(new Error('Calculation not found'), { status: 404 });
        if (calculation.revision !== revision) throw Object.assign(new Error('Calculation revision conflict'), { status: 409 });
        const approvalRows = await client.query('SELECT actor_id AS "actorId",approval_type AS "approvalType",decision FROM royalty_approvals WHERE tenant_id=$1 AND calculation_id=$2', [tenant(req), calculation.id]);
        const reconciliationRows = await client.query('SELECT 1 FROM royalty_reconciliations WHERE tenant_id=$1 AND calculation_id=$2 AND matched=TRUE LIMIT 1', [tenant(req), calculation.id]);
        const overrideRows = await client.query("SELECT 1 FROM royalty_overrides WHERE tenant_id=$1 AND calculation_id=$2 AND status<>'approved' LIMIT 1", [tenant(req), calculation.id]);
        const periodRows = await client.query(
          "SELECT status FROM royalty_accounting_periods WHERE id=$1 AND tenant_id=$2 AND status='locked'",
          [calculation.accounting_period_id, tenant(req)]
        );
        let readyProviders = [];
        if (req.body?.nextStatus === 'posting_pending') readyProviders = requireProviders(['ledger', 'banking']).map((item) => item.name);
        const authorization = authorizeTransition({ current: calculation.status, next: req.body?.nextStatus, actor: req.user, calculation: { createdBy: calculation.created_by }, approvals: approvalRows.rows, providers: readyProviders, periodLocked: Boolean(periodRows.rows[0]), reconciled: Boolean(reconciliationRows.rows[0]), unresolvedOverrides: Boolean(overrideRows.rows[0]) });
        if (!authorization.ok) throw new Error(authorization.errors.join('; '));
        const updated = await client.query(
          'UPDATE royalty_calculation_runs SET status=$1,revision=revision+1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 AND revision=$4 RETURNING *',
          [req.body.nextStatus, calculation.id, tenant(req), revision]
        );
        if (req.body.nextStatus === 'posting_pending') {
          await client.query(
            `INSERT INTO royalty_posting_outbox(tenant_id,calculation_id,idempotency_key,payload)
             VALUES($1,$2,$3,$4) ON CONFLICT(tenant_id,idempotency_key) DO NOTHING`,
            [tenant(req), calculation.id, calculation.calculation_digest, { calculationDigest: calculation.calculation_digest, totals: calculation.totals, currency: calculation.currency }]
          );
        }
        await appendEvent(client, req, calculation.id, 'state_transition', { from: calculation.status, to: req.body.nextStatus, revision });
        return updated.rows[0];
      });
      return res.json(result);
    } catch (error) {
      return fail(res, error, 'Calculation transition failed');
    }
  });

  router.post('/calculations/:id/corrections', roles('royalty_accountant', 'admin'), async (req, res) => {
    try {
      if (!String(req.get('Idempotency-Key') || '').trim()) return res.status(400).json({ error: 'Idempotency-Key is required' });
      if (!String(req.body?.reason || '').trim() || !String(req.body?.evidenceRef || '').trim() || !Number.isInteger(Number(req.body?.openAccountingPeriodId)) || !Number.isInteger(Number(req.body?.correctedStatementId))) return res.status(422).json({ error: 'reason, evidenceRef, correctedStatementId, and openAccountingPeriodId are required' });
      const result = await transaction(async (client) => {
        const original = await client.query('SELECT * FROM royalty_calculation_runs WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenant(req)]);
        if (!original.rows[0]) throw Object.assign(new Error('Calculation not found'), { status: 404 });
        if (!['approved', 'posted', 'reconciled', 'locked', 'exception'].includes(original.rows[0].status)) throw new Error('Only reviewed calculations may be corrected');
        const period = await client.query("SELECT id FROM royalty_accounting_periods WHERE id=$1 AND tenant_id=$2 AND status='open'", [req.body.openAccountingPeriodId, tenant(req)]);
        if (!period.rows[0]) throw new Error('Correction requires an open accounting period');
        const correctedStatement = await client.query('SELECT * FROM royalty_usage_statements WHERE id=$1 AND tenant_id=$2', [req.body.correctedStatementId, tenant(req)]);
        if (!correctedStatement.rows[0]) throw Object.assign(new Error('Corrected statement version not found'), { status: 404 });
        const originalStatement = await client.query('SELECT statement_ref,statement_version FROM royalty_usage_statements WHERE id=$1', [original.rows[0].statement_id]);
        if (correctedStatement.rows[0].statement_ref !== originalStatement.rows[0].statement_ref || correctedStatement.rows[0].statement_version <= originalStatement.rows[0].statement_version) throw new Error('Correction must reference a newer version of the original statement');
        const contractId = Number(req.body.contractVersionId || original.rows[0].contract_version_id);
        const contract = await client.query('SELECT * FROM royalty_contract_versions WHERE id=$1 AND tenant_id=$2', [contractId, tenant(req)]);
        if (!contract.rows[0]) throw Object.assign(new Error('Contract version not found'), { status: 404 });
        const corrected = calculateRoyalties(correctedStatement.rows[0].payload, contract.rows[0].terms);
        const inserted = await client.query(
          `INSERT INTO royalty_calculation_runs
           (tenant_id,idempotency_key,statement_id,contract_version_id,status,revision,currency,totals,calculation_digest,explanation,created_by,supersedes_calculation_id,adjustment_type,accounting_period_id)
           VALUES($1,$2,$3,$4,'calculated',1,$5,$6,$7,$8,$9,$10,'correction',$11) RETURNING *`,
          [tenant(req), String(req.get('Idempotency-Key') || ''), correctedStatement.rows[0].id, contract.rows[0].id, corrected.currency, corrected.totals, corrected.calculationDigest, { reason: req.body.reason, evidenceRef: req.body.evidenceRef, formula: 'recalculated from versioned statement and effective contract' }, req.user.id, original.rows[0].id, period.rows[0].id]
        );
        for (const line of corrected.lines) await client.query(
          `INSERT INTO royalty_calculation_lines
           (tenant_id,calculation_id,usage_ref,gross_amount_minor,deductions_minor,net_amount_minor,royalty_pool_minor,allocations,explanation)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [tenant(req), inserted.rows[0].id, line.usageRef, line.grossAmountMinor, line.deductionsMinor, line.netAmountMinor, line.royaltyPoolMinor, line.allocations, line.explanation]
        );
        await client.query("UPDATE royalty_calculation_runs SET status='corrected',revision=revision+1,updated_at=NOW() WHERE id=$1", [original.rows[0].id]);
        await appendEvent(client, req, original.rows[0].id, 'correction_created', { replacementCalculationId: inserted.rows[0].id, reason: req.body.reason }, digest(req.body.evidenceRef));
        return inserted.rows[0];
      });
      return res.status(201).json(result);
    } catch (error) {
      return fail(res, error, 'Correction could not be recorded');
    }
  });

  router.post('/calculations/:id/reversals', roles('royalty_accountant', 'admin'), async (req, res) => {
    try {
      if (!String(req.get('Idempotency-Key') || '').trim()) return res.status(400).json({ error: 'Idempotency-Key is required' });
      if (!String(req.body?.reason || '').trim() || !Number.isInteger(Number(req.body?.openAccountingPeriodId))) return res.status(422).json({ error: 'reason and openAccountingPeriodId are required' });
      const result = await transaction(async (client) => {
        const original = await client.query('SELECT * FROM royalty_calculation_runs WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenant(req)]);
        if (!original.rows[0]) throw Object.assign(new Error('Calculation not found'), { status: 404 });
        if (!['approved', 'posted', 'reconciled', 'locked', 'exception'].includes(original.rows[0].status)) throw new Error('Only reviewed calculations may be reversed');
        const period = await client.query("SELECT id FROM royalty_accounting_periods WHERE id=$1 AND tenant_id=$2 AND status='open'", [req.body.openAccountingPeriodId, tenant(req)]);
        if (!period.rows[0]) throw new Error('Reversal requires an open accounting period');
        const totals = Object.fromEntries(Object.entries(original.rows[0].totals).map(([key, value]) => [key, -Number(value)]));
        const inserted = await client.query(
          `INSERT INTO royalty_calculation_runs
           (tenant_id,idempotency_key,statement_id,contract_version_id,status,revision,currency,totals,calculation_digest,explanation,created_by,supersedes_calculation_id,adjustment_type,accounting_period_id)
           VALUES($1,$2,$3,$4,'calculated',1,$5,$6,$7,$8,$9,$10,'reversal',$11) RETURNING *`,
          [tenant(req), String(req.get('Idempotency-Key') || ''), original.rows[0].statement_id, original.rows[0].contract_version_id, original.rows[0].currency, totals, digest({ original: original.rows[0].calculation_digest, totals, reason: req.body.reason }), { reason: req.body.reason }, req.user.id, original.rows[0].id, period.rows[0].id]
        );
        const originalLines = await client.query('SELECT * FROM royalty_calculation_lines WHERE calculation_id=$1 AND tenant_id=$2 ORDER BY id', [original.rows[0].id, tenant(req)]);
        for (const line of originalLines.rows) {
          const allocations = line.allocations.map((item) => ({ ...item, amountMinor: -Number(item.amountMinor), withholdingMinor: -Number(item.withholdingMinor), payableMinor: -Number(item.payableMinor) }));
          await client.query(
            `INSERT INTO royalty_calculation_lines
             (tenant_id,calculation_id,usage_ref,gross_amount_minor,deductions_minor,net_amount_minor,royalty_pool_minor,allocations,explanation)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [tenant(req), inserted.rows[0].id, `reversal:${line.usage_ref}`, -Number(line.gross_amount_minor), -Number(line.deductions_minor), -Number(line.net_amount_minor), -Number(line.royalty_pool_minor), allocations, `Reversal of calculation ${original.rows[0].id}: ${req.body.reason}`]
          );
        }
        await client.query("UPDATE royalty_calculation_runs SET status='reversed',revision=revision+1,updated_at=NOW() WHERE id=$1", [original.rows[0].id]);
        await appendEvent(client, req, original.rows[0].id, 'reversal_created', { reversalCalculationId: inserted.rows[0].id, reason: req.body.reason });
        return inserted.rows[0];
      });
      return res.status(201).json(result);
    } catch (error) {
      return fail(res, error, 'Reversal could not be recorded');
    }
  });

  router.post('/posting-outbox/:id/outcome', roles('payment_operator', 'admin'), async (req, res) => {
    try {
      if (!['posted', 'failed'].includes(req.body?.status) || (req.body.status === 'posted' && (!String(req.body.externalPostingId || '').trim() || !/^[a-f0-9]{64}$/.test(String(req.body.providerEvidenceDigest || ''))))) return res.status(422).json({ error: 'posted|failed outcome and reconciled provider evidence are required' });
      requireProviders(['ledger', 'banking']);
      const result = await transaction(async (client) => {
        const outbox = await client.query('SELECT * FROM royalty_posting_outbox WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenant(req)]);
        if (!outbox.rows[0]) throw Object.assign(new Error('Posting work not found'), { status: 404 });
        const outboxStatus = req.body.status === 'posted' ? 'delivered' : (outbox.rows[0].attempts >= 4 ? 'dead_letter' : 'retry');
        await client.query(
          'UPDATE royalty_posting_outbox SET status=$1,attempts=attempts+1,external_posting_id=$2,provider_evidence_digest=$3,last_error_code=$4,next_attempt_at=NOW()+INTERVAL \'5 minutes\' WHERE id=$5',
          [outboxStatus, req.body.externalPostingId || null, req.body.providerEvidenceDigest || null, req.body.errorCode || null, outbox.rows[0].id]
        );
        const calculationStatus = req.body.status === 'posted' ? 'posted' : 'exception';
        const calculation = await client.query('UPDATE royalty_calculation_runs SET status=$1,revision=revision+1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *', [calculationStatus, outbox.rows[0].calculation_id, tenant(req)]);
        if (req.body.status === 'failed') await client.query(
          `INSERT INTO royalty_integration_failures(tenant_id,calculation_id,provider,operation,retryable,error_code,sanitized_detail)
           VALUES($1,$2,$3,'post_royalties',$4,$5,'provider detail redacted')`,
          [tenant(req), outbox.rows[0].calculation_id, req.body.provider || 'ledger', outboxStatus !== 'dead_letter', String(req.body.errorCode || 'POST_FAILED').slice(0, 100)]
        );
        await appendEvent(client, req, outbox.rows[0].calculation_id, 'posting_outcome', { status: calculationStatus, externalPostingId: req.body.externalPostingId || null }, req.body.providerEvidenceDigest || null);
        return calculation.rows[0];
      });
      return res.status(req.body.status === 'posted' ? 200 : 502).json(result);
    } catch (error) {
      return fail(res, error, 'Posting outcome failed');
    }
  });

  router.post('/calculations/:id/reconciliations', roles('royalty_accountant', 'auditor', 'admin'), async (req, res) => {
    try {
      if (!Number.isSafeInteger(req.body?.ledgerAmountMinor) || !Number.isSafeInteger(req.body?.bankAmountMinor) || !/^[a-f0-9]{64}$/.test(String(req.body?.evidenceDigest || ''))) return res.status(422).json({ error: 'Integer ledger/bank amounts and SHA-256 evidence are required' });
      const calculation = await pool.query('SELECT totals,status FROM royalty_calculation_runs WHERE id=$1 AND tenant_id=$2', [req.params.id, tenant(req)]);
      if (!calculation.rows[0]) return res.status(404).json({ error: 'Calculation not found' });
      if (calculation.rows[0].status !== 'posted') return res.status(409).json({ error: 'Only posted calculations can be reconciled' });
      const expected = Number(calculation.rows[0].totals.payableMinor);
      const matched = expected === req.body.ledgerAmountMinor && expected === req.body.bankAmountMinor;
      const result = await pool.query(
        `INSERT INTO royalty_reconciliations
         (tenant_id,calculation_id,expected_amount_minor,ledger_amount_minor,bank_amount_minor,matched,evidence_digest,reconciled_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [tenant(req), req.params.id, expected, req.body.ledgerAmountMinor, req.body.bankAmountMinor, matched, req.body.evidenceDigest, req.user.id]
      );
      if (!matched) return res.status(409).json({ error: 'Posting does not reconcile', reconciliation: result.rows[0] });
      return res.status(201).json(result.rows[0]);
    } catch (error) {
      return fail(res, error, 'Reconciliation failed');
    }
  });

  router.post('/backtests', roles('auditor', 'admin'), async (req, res) => {
    try {
      const evaluation = evaluateBacktest(req.body?.fixtureVersion, req.body?.cases);
      const result = await pool.query(
        `INSERT INTO royalty_backtest_results(tenant_id,fixture_version,metrics,evidence_digest,passed,evaluated_by)
         VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [tenant(req), evaluation.fixtureVersion, evaluation, evaluation.evidenceDigest, evaluation.passed, req.user.id]
      );
      return res.status(evaluation.passed ? 201 : 422).json({ result: result.rows[0], evaluation });
    } catch (error) {
      return fail(res, error, 'Backtest evaluation failed');
    }
  });

  return router;
};
