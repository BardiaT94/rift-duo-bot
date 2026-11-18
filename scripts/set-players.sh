#!/usr/bin/env bash
# Locks the bot to the two of you (stored as a Cloudflare secret, not in git).
# Run from the project folder:  bash scripts/set-players.sh
set -euo pipefail
cd "$(dirname "$0")/.."

read -rp "Support player's Telegram user ID (from /whoami): " BID
read -rp "ADC player's Telegram user ID (from /whoami): " PID
[[ "$BID" =~ ^[0-9]+$ && "$PID" =~ ^[0-9]+$ ]] || { echo "IDs must be numbers."; exit 1; }

printf '%s' "$BID:Support:support,$PID:ADC:adc" | npx wrangler secret put PLAYERS
echo
echo "Done. Only the two of you can use the bot now. Send /start in the group."
