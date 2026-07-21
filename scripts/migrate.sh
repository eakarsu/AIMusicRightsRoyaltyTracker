#!/usr/bin/env bash
set -Eeuo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "${MIGRATION_ACK:-}" != "apply-governed-royalty-001" ]]; then
  echo "Set MIGRATION_ACK=apply-governed-royalty-001 after reviewing the migration and backup/rollback plan." >&2
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required; this script never creates a database." >&2
  exit 1
fi
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$PROJECT_DIR/server/migrations/001_governed_royalty_workflow.sql"
