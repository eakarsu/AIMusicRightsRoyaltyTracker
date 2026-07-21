#!/usr/bin/env bash
set -Eeuo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
(cd "$PROJECT_DIR/server" && npm ci)
(cd "$PROJECT_DIR/client" && npm ci)
echo "Lockfile-pinned dependencies installed. Review audit output before running the application."
