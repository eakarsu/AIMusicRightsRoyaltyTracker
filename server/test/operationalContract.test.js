'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('migration defines durable version, approval, posting, reconciliation, and backtest state', () => {
  const sql = read('server', 'migrations', '001_governed_royalty_workflow.sql');
  for (const table of ['royalty_usage_statements', 'royalty_contract_versions', 'royalty_calculation_runs', 'royalty_approvals', 'royalty_overrides', 'royalty_posting_outbox', 'royalty_reconciliations', 'royalty_integration_syncs', 'royalty_backtest_results', 'royalty_events']) assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/);
});

test('migration protects financial evidence and contains no destructive data operation', () => {
  const sql = read('server', 'migrations', '001_governed_royalty_workflow.sql');
  assert.match(sql, /royalty_events_append_only/);
  assert.match(sql, /royalty_calculation_evidence_guard/);
  assert.match(sql, /royalty_period_lock_guard/);
  assert.doesNotMatch(sql, /\b(DROP TABLE|TRUNCATE|DELETE FROM|ALTER TABLE\s+\S+\s+DROP)\b/i);
});

test('server mounts only auth and the governed royalty surface', () => {
  const index = read('server', 'index.js');
  assert.match(index, /\/api\/governed-royalties/);
  for (const legacy of ['/api/payments', '/api/royalties', '/api/ai', '/api/gap-', 'royalty-optimizer', 'catalog-acquisition']) assert.doesNotMatch(index, new RegExp(legacy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('launcher is nondestructive and delegates lifecycle changes explicitly', () => {
  const launcher = read('start.sh');
  assert.doesNotMatch(launcher, /kill\s+-9|pkill|createdb|brew services|npm\s+(install|ci)|seed\.js|migrate\.sh/);
  assert.match(launcher, /Port \$port is occupied; no process was terminated/);
  assert.match(launcher, /JWT_SECRET must contain at least 32 characters/);
});

test('governed route exposes durable failure, correction, outbox, and reconciliation paths', () => {
  const route = read('server', 'routes', 'governedRoyalties.js');
  for (const evidence of ['Idempotency-Key', 'royalty_posting_outbox', 'dead_letter', '/corrections', '/reversals', '/reconciliations', 'royalty_integration_failures', '/backtests']) assert.match(route, new RegExp(evidence));
});
