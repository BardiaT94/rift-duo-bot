#!/usr/bin/env bash
# Re-registers the Telegram webhook and command menu (safe to run any time).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .deploy.env ] || { echo "No .deploy.env found. Run scripts/setup.sh first."; exit 1; }
source .deploy.env
curl -fsS "$WORKER_URL/setup?secret=$WEBHOOK_SECRET"; echo
