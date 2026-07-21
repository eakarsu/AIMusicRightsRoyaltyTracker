BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS royalty_organizations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS royalty_tenant_memberships (
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('data_operator','royalty_accountant','rights_reviewer','payment_operator','auditor','admin')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id,user_id)
);

CREATE TABLE IF NOT EXISTS royalty_accounting_periods (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','review','locked')),
  locked_by INTEGER REFERENCES users(id),
  locked_at TIMESTAMPTZ,
  lock_evidence_digest CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_end >= period_start),
  UNIQUE (tenant_id,period_start,period_end)
);

CREATE TABLE IF NOT EXISTS royalty_usage_statements (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  idempotency_key TEXT NOT NULL,
  source_system TEXT NOT NULL,
  statement_ref TEXT NOT NULL,
  statement_version INTEGER NOT NULL CHECK (statement_version > 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  currency CHAR(3) NOT NULL,
  source_digest CHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ingested','validated','rejected','superseded')),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_end >= period_start),
  UNIQUE (tenant_id,idempotency_key),
  UNIQUE (tenant_id,source_system,statement_ref,statement_version)
);

CREATE TABLE IF NOT EXISTS royalty_usage_lines (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  statement_id BIGINT NOT NULL REFERENCES royalty_usage_statements(id),
  usage_ref TEXT NOT NULL,
  recording_ref TEXT,
  work_ref TEXT,
  territory CHAR(2) NOT NULL,
  usage_date DATE NOT NULL,
  units BIGINT NOT NULL CHECK (units >= 0),
  gross_amount_minor BIGINT NOT NULL CHECK (gross_amount_minor >= 0),
  deductions_minor BIGINT NOT NULL CHECK (deductions_minor >= 0),
  net_amount_minor BIGINT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (net_amount_minor = gross_amount_minor - deductions_minor),
  UNIQUE (tenant_id,statement_id,usage_ref)
);

CREATE TABLE IF NOT EXISTS royalty_contract_versions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  contract_ref TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  currency CHAR(3) NOT NULL,
  terms JSONB NOT NULL,
  terms_digest CHAR(64) NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  UNIQUE (tenant_id,contract_ref,version),
  UNIQUE (tenant_id,terms_digest)
);

CREATE TABLE IF NOT EXISTS royalty_calculation_runs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  idempotency_key TEXT NOT NULL,
  statement_id BIGINT NOT NULL REFERENCES royalty_usage_statements(id),
  contract_version_id BIGINT NOT NULL REFERENCES royalty_contract_versions(id),
  accounting_period_id BIGINT REFERENCES royalty_accounting_periods(id),
  supersedes_calculation_id BIGINT REFERENCES royalty_calculation_runs(id),
  adjustment_type TEXT CHECK (adjustment_type IN ('correction','reversal')),
  status TEXT NOT NULL CHECK (status IN ('calculated','review_pending','approved','posting_pending','posted','reconciled','exception','locked','corrected','reversed')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  currency CHAR(3) NOT NULL,
  totals JSONB NOT NULL,
  calculation_digest CHAR(64) NOT NULL,
  explanation JSONB NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id,idempotency_key),
  UNIQUE (tenant_id,calculation_digest)
);

CREATE TABLE IF NOT EXISTS royalty_calculation_lines (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  calculation_id BIGINT NOT NULL REFERENCES royalty_calculation_runs(id),
  usage_ref TEXT NOT NULL,
  gross_amount_minor BIGINT NOT NULL,
  deductions_minor BIGINT NOT NULL,
  net_amount_minor BIGINT NOT NULL,
  royalty_pool_minor BIGINT NOT NULL,
  allocations JSONB NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id,calculation_id,usage_ref)
);

CREATE TABLE IF NOT EXISTS royalty_approvals (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  calculation_id BIGINT NOT NULL REFERENCES royalty_calculation_runs(id),
  actor_id INTEGER NOT NULL REFERENCES users(id),
  approval_type TEXT NOT NULL CHECK (approval_type IN ('financial','rights')),
  decision TEXT NOT NULL CHECK (decision IN ('approve','reject')),
  attestation_digest CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id,calculation_id,actor_id,approval_type)
);

CREATE TABLE IF NOT EXISTS royalty_overrides (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  calculation_id BIGINT NOT NULL REFERENCES royalty_calculation_runs(id),
  field_name TEXT NOT NULL,
  old_value JSONB NOT NULL,
  new_value JSONB NOT NULL,
  reason TEXT NOT NULL,
  evidence_ref TEXT NOT NULL,
  evidence_digest CHAR(64) NOT NULL,
  requested_by INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending_rights_review','approved','rejected')),
  reviewed_by INTEGER REFERENCES users(id),
  review_attestation_digest CHAR(64),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (old_value <> new_value)
);

CREATE TABLE IF NOT EXISTS royalty_posting_outbox (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  calculation_id BIGINT NOT NULL REFERENCES royalty_calculation_runs(id),
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','retry','delivered','dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  external_posting_id TEXT,
  provider_evidence_digest CHAR(64),
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id,idempotency_key)
);

CREATE TABLE IF NOT EXISTS royalty_reconciliations (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  calculation_id BIGINT NOT NULL REFERENCES royalty_calculation_runs(id),
  expected_amount_minor BIGINT NOT NULL,
  ledger_amount_minor BIGINT NOT NULL,
  bank_amount_minor BIGINT NOT NULL,
  matched BOOLEAN NOT NULL,
  evidence_digest CHAR(64) NOT NULL,
  reconciled_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id,calculation_id,evidence_digest)
);

CREATE TABLE IF NOT EXISTS royalty_integration_failures (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  calculation_id BIGINT REFERENCES royalty_calculation_runs(id),
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  retryable BOOLEAN NOT NULL,
  error_code TEXT NOT NULL,
  sanitized_detail TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS royalty_integration_syncs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  provider TEXT NOT NULL CHECK (provider IN ('ledger','banking','billing','crm','market_data','documents','filings')),
  idempotency_key TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('pull','push')),
  external_cursor TEXT NOT NULL,
  record_count INTEGER NOT NULL CHECK (record_count >= 0),
  source_digest CHAR(64) NOT NULL,
  provider_evidence_digest CHAR(64) NOT NULL,
  reconciliation_status TEXT NOT NULL CHECK (reconciliation_status IN ('matched','mismatch')),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id,provider,idempotency_key),
  UNIQUE (tenant_id,provider,external_cursor,source_digest)
);

CREATE TABLE IF NOT EXISTS royalty_backtest_results (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  fixture_version TEXT NOT NULL,
  metrics JSONB NOT NULL,
  evidence_digest CHAR(64) NOT NULL,
  passed BOOLEAN NOT NULL,
  evaluated_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id,fixture_version,evidence_digest)
);

CREATE TABLE IF NOT EXISTS royalty_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES royalty_organizations(id),
  calculation_id BIGINT REFERENCES royalty_calculation_runs(id),
  actor_id INTEGER REFERENCES users(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_digest CHAR(64),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS royalty_statement_period_idx ON royalty_usage_statements(tenant_id,period_start,period_end);
CREATE INDEX IF NOT EXISTS royalty_calculation_status_idx ON royalty_calculation_runs(tenant_id,status,updated_at);
CREATE INDEX IF NOT EXISTS royalty_outbox_ready_idx ON royalty_posting_outbox(status,next_attempt_at);
CREATE INDEX IF NOT EXISTS royalty_event_lookup_idx ON royalty_events(tenant_id,calculation_id,occurred_at);

CREATE OR REPLACE FUNCTION prevent_royalty_evidence_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'royalty evidence is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS royalty_events_append_only ON royalty_events;
CREATE TRIGGER royalty_events_append_only BEFORE UPDATE OR DELETE ON royalty_events
FOR EACH ROW EXECUTE FUNCTION prevent_royalty_evidence_mutation();
DROP TRIGGER IF EXISTS royalty_approvals_append_only ON royalty_approvals;
CREATE TRIGGER royalty_approvals_append_only BEFORE UPDATE OR DELETE ON royalty_approvals
FOR EACH ROW EXECUTE FUNCTION prevent_royalty_evidence_mutation();
DROP TRIGGER IF EXISTS royalty_contract_versions_append_only ON royalty_contract_versions;
CREATE TRIGGER royalty_contract_versions_append_only BEFORE UPDATE OR DELETE ON royalty_contract_versions
FOR EACH ROW EXECUTE FUNCTION prevent_royalty_evidence_mutation();
DROP TRIGGER IF EXISTS royalty_backtests_append_only ON royalty_backtest_results;
CREATE TRIGGER royalty_backtests_append_only BEFORE UPDATE OR DELETE ON royalty_backtest_results
FOR EACH ROW EXECUTE FUNCTION prevent_royalty_evidence_mutation();
DROP TRIGGER IF EXISTS royalty_statements_append_only ON royalty_usage_statements;
CREATE TRIGGER royalty_statements_append_only BEFORE UPDATE OR DELETE ON royalty_usage_statements
FOR EACH ROW EXECUTE FUNCTION prevent_royalty_evidence_mutation();
DROP TRIGGER IF EXISTS royalty_usage_lines_append_only ON royalty_usage_lines;
CREATE TRIGGER royalty_usage_lines_append_only BEFORE UPDATE OR DELETE ON royalty_usage_lines
FOR EACH ROW EXECUTE FUNCTION prevent_royalty_evidence_mutation();
DROP TRIGGER IF EXISTS royalty_calculation_lines_append_only ON royalty_calculation_lines;
CREATE TRIGGER royalty_calculation_lines_append_only BEFORE UPDATE OR DELETE ON royalty_calculation_lines
FOR EACH ROW EXECUTE FUNCTION prevent_royalty_evidence_mutation();
DROP TRIGGER IF EXISTS royalty_reconciliations_append_only ON royalty_reconciliations;
CREATE TRIGGER royalty_reconciliations_append_only BEFORE UPDATE OR DELETE ON royalty_reconciliations
FOR EACH ROW EXECUTE FUNCTION prevent_royalty_evidence_mutation();
DROP TRIGGER IF EXISTS royalty_integration_syncs_append_only ON royalty_integration_syncs;
CREATE TRIGGER royalty_integration_syncs_append_only BEFORE UPDATE OR DELETE ON royalty_integration_syncs
FOR EACH ROW EXECUTE FUNCTION prevent_royalty_evidence_mutation();

CREATE OR REPLACE FUNCTION prevent_royalty_calculation_rewrite() RETURNS trigger AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.statement_id IS DISTINCT FROM OLD.statement_id
     OR NEW.contract_version_id IS DISTINCT FROM OLD.contract_version_id
     OR NEW.accounting_period_id IS DISTINCT FROM OLD.accounting_period_id
     OR NEW.supersedes_calculation_id IS DISTINCT FROM OLD.supersedes_calculation_id
     OR NEW.adjustment_type IS DISTINCT FROM OLD.adjustment_type
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.totals IS DISTINCT FROM OLD.totals
     OR NEW.calculation_digest IS DISTINCT FROM OLD.calculation_digest
     OR NEW.explanation IS DISTINCT FROM OLD.explanation
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'calculation evidence cannot be rewritten';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS royalty_calculation_evidence_guard ON royalty_calculation_runs;
CREATE TRIGGER royalty_calculation_evidence_guard BEFORE UPDATE ON royalty_calculation_runs
FOR EACH ROW EXECUTE FUNCTION prevent_royalty_calculation_rewrite();

CREATE OR REPLACE FUNCTION prevent_locked_period_reopen() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'locked' AND NEW.status <> 'locked' THEN
    RAISE EXCEPTION 'locked accounting period cannot be reopened';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS royalty_period_lock_guard ON royalty_accounting_periods;
CREATE TRIGGER royalty_period_lock_guard BEFORE UPDATE ON royalty_accounting_periods
FOR EACH ROW EXECUTE FUNCTION prevent_locked_period_reopen();

COMMIT;
