#!/usr/bin/env bash
# One-time deploy of the Rift Duo bot to Cloudflare Workers.
# Run from the project folder:  bash scripts/setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m%s\033[0m\n' "$*"; exit 1; }

say "Step 1/6: checking Node.js"
command -v node >/dev/null || fail "Node.js is not installed."
node --version

say "Step 2/6: installing packages"
npm install --no-audit --no-fund

say "Step 3/6: Cloudflare login"
if npx wrangler whoami 2>/dev/null | grep -q "You are logged in"; then
  echo "Already logged in."
else
  echo "A browser window will open. Log in (or sign up free) and click Allow."
  npx wrangler login
fi

say "Step 4/6: deploying the Worker"
echo "If Wrangler asks you to pick a workers.dev subdomain, type any short name."
DEPLOY_OUT="$(npx wrangler deploy 2>&1 | tee /dev/stderr)"
URL="$(grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' <<<"$DEPLOY_OUT" | head -1)"
[ -n "$URL" ] || fail "Couldn't find the Worker URL in the deploy output above."
echo "Worker URL: $URL"

say "Step 5/6: secrets"
read -rsp "Paste the bot token from @BotFather (input hidden): " TOKEN; echo
[[ "$TOKEN" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]] || fail "That doesn't look like a bot token (it looks like 123456:ABC-def...)."
WEBHOOK_SECRET="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
printf '%s' "$TOKEN" | npx wrangler secret put TELEGRAM_TOKEN
printf '%s' "$WEBHOOK_SECRET" | npx wrangler secret put WEBHOOK_SECRET

read -rsp "Paste your Anthropic API key for screenshots and /ask (or press Enter to skip): " AKEY; echo
if [ -n "$AKEY" ]; then
  printf '%s' "$AKEY" | npx wrangler secret put ANTHROPIC_API_KEY
else
  echo "Skipped. Add it later with: npx wrangler secret put ANTHROPIC_API_KEY"
fi

# Saved locally (git-ignored) so scripts can re-run the webhook setup later.
printf 'WORKER_URL=%s\nWEBHOOK_SECRET=%s\n' "$URL" "$WEBHOOK_SECRET" > .deploy.env
chmod 600 .deploy.env

say "Step 6/6: connecting Telegram to the Worker"
sleep 3
RESULT="$(curl -fsS "$URL/setup?secret=$WEBHOOK_SECRET")" || fail "The /setup call failed. Wait a minute and run: bash scripts/reconnect.sh"
echo "$RESULT"
grep -q '"webhook":true' <<<"$RESULT" || fail "Telegram didn't accept the webhook. Check the token, then run: bash scripts/reconnect.sh"

say "Done. The bot is live."
cat <<'MSG'
Next:
  1. You and your duo partner each open a private chat with the bot and send /start, then /whoami.
     Write down both user IDs.
  2. Run:  bash scripts/set-players.sh
     This locks the bot to the two of you.
MSG
