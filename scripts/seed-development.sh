#!/usr/bin/env bash
set -Eeuo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "${NODE_ENV:-development}" == "production" ]]; then
  echo "Development seed is disabled in production." >&2
  exit 1
fi
if [[ "${SEED_ACK:-}" != "seed-local-royalty-demo" ]]; then
  echo "Set SEED_ACK=seed-local-royalty-demo to run the existing local-only seed explicitly." >&2
  exit 1
fi
(cd "$PROJECT_DIR/server" && node seeds/seed.js)
