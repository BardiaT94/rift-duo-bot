# Rift Duo bot

A private Telegram bot for a support + ADC duo in Wild Rift. It helps in draft, on the loading screen, during the game and after it. It runs on Cloudflare Workers, so there is no server to keep on, and the free plan is enough.

## What it does

| When | Feature | How to use it |
| :--- | :--- | :--- |
| Draft | Draft board widget: tap the enemy ADC and support, see the best 3 duos, lock one | `/new` in your private chat with the bot |
| Draft | Same thing with plain buttons or text | `/buttons`, or type `vs kaisa nautilus` |
| Draft | If one of us already locked, the best partner for that pick | lock one on the board, or `we jinx` |
| Draft | Ban suggestions: bot laners that counter most of our pool, plus lanes we keep losing to | `/bans` |
| Draft or loading | Read a screenshot and fill in both teams | send the screenshot (needs the Claude key) |
| Loading screen | Game plan sent to both of you: lane matchup, combos, power spikes, spells, runes | lock a duo |
| Loading screen | Best build for this game: the 5 items and boots, each swap with its reason, and which item to rush | `enemy ahri lee jinx thresh darius` |
| Any time | Full guide for our 12 champs; lane notes for enemy champs | type the name, e.g. `zyra` or `pyke` |
| Any time | All 36 duos ranked by synergy | `/duo`, or `/duo jinx` |
| In game | Someone is fed: what each of us buys next and how to play it | 🔥 Fed enemy button, or `/fed zed` |
| In game | Live spell timers widget. Tap when you see Flash used; both of you get a message when it's back | `/t` |
| In game | Ask the coach anything; it searches the current patch | `/ask ...` or end a message with `?` |
| After | Save the result; win rates by duo, champ and enemy lane. Results feed back into the picks | `/win`, `/loss`, `/stats`, `/undo` |
| Patch day | Check the newest patch for changes to our champs and items | `/patch` |
| Any time | Personal notes shown on a champ's guide and in the game plan | `/note jinx buy cull vs poke` |

Use the bot in your private chats with it. Telegram widgets (the draft board and timers) only work in private chats for now. Once `PLAYERS` is set, your two private chats share one game: what one of you taps shows up on the other's board, and game plans, results and timer pings go to both.

Names are forgiving: `mf`, `cait`, `naut`, `kaisa`, small typos and Persian spellings of our champs all work.

## Setup

You need a Cloudflare account (free) and Node.js.

1. Create the bot. In Telegram, talk to @BotFather, send `/newbot`, and copy the token.
2. Optional, only if you also want the bot in a group: turn off privacy mode so it sees plain messages and photos there. In @BotFather: `/setprivacy`, pick the bot, choose `Disable`.
3. Install and log in:

   ```sh
   npm install
   npx wrangler login
   ```

4. Add the secrets. `WEBHOOK_SECRET` is any long random string you make up.

   ```sh
   npx wrangler secret put TELEGRAM_TOKEN
   npx wrangler secret put WEBHOOK_SECRET
   npx wrangler secret put ANTHROPIC_API_KEY   # optional, for screenshots, /ask and /patch
   ```

5. Deploy:

   ```sh
   npm run deploy
   ```

6. Connect Telegram. Open this once in a browser, using the URL that deploy printed:
   `https://rift-duo-bot.<your-subdomain>.workers.dev/setup?secret=<WEBHOOK_SECRET>`
   It should show `"webhook": true`.
7. Each of you opens a private chat with the bot, sends `/start`, then `/whoami`, and notes the user ID.
8. Lock the bot to the two of you: run `bash scripts/set-players.sh` and enter both IDs.
   They are saved as the `PLAYERS` Cloudflare secret, so they never land in git. Until `PLAYERS` is set, anyone who finds the bot can use it.

## Costs

Everything except the AI features is free on Cloudflare's free plan. The AI features use Claude Opus 5.5 ($4 per million input tokens, $20 per million output). A screenshot read costs about one or two cents. A coach answer with web search costs a few cents. `AI_DAILY_LIMIT` in `wrangler.jsonc` caps calls per chat per day (default 40). The AI features stay off until `PLAYERS` is set, and after that only the listed players can use the bot, so strangers can't run up your Claude bill. Setting a monthly spend limit in the Anthropic Console is a good extra guard.

If Claude's safety filter ever declines a request, the API retries it on a fallback model automatically (server-side fallback is turned on in `src/ai.ts`).

## Keeping the data current

Builds and runes come from wildriftcore.com and wr-meta.com for patch 7.3f (November 2026). Matchup and synergy calls are lane rules of thumb; after a few dozen saved games your own results start to move the rankings.

When a patch lands:

- Run `/patch` in Telegram to see what changed for our champs.
- For a quick fix, save a note: `/note sona rush Ardent this patch`.
- For a lasting fix, edit `src/data/pool.ts` (builds, runes, matchups, synergy) and redeploy.

Summoner spell cooldowns for the timers are in `src/timers.ts`. Sources disagree on Barrier (90 to 120 seconds).

## Files

| Path | Contents |
| :--- | :--- |
| `src/index.ts` | Worker entry: webhook and `/setup` |
| `src/bot.ts` | Commands, buttons, widget requests, text shortcuts, screenshot flow |
| `src/widgets.ts` | Draft board and spell timer widgets (HTML) |
| `src/timers.ts` | Summoner spell cooldowns |
| `src/format.ts` | The messages the bot sends |
| `src/engine/draft.ts` | Duo scoring and ban suggestions |
| `src/engine/comp.ts` | Enemy team analysis, best build per game, fed-enemy advice |
| `src/data/pool.ts` | Our 12 champions: builds, runes, combos, matchups, duo synergy |
| `src/data/champions.ts` | Full Wild Rift roster with tags, and name matching |
| `src/data/threats.ts` | Lane notes for enemy bot laners |
| `src/ai.ts` | Claude: screenshot reading and the coach |
| `src/state.ts` | Per-chat storage (Durable Object): current game, history, notes, timers |
| `test/engine.test.ts` | Data checks and engine tests (`npm test`) |

## Local testing

`npm test` runs the engine tests with plain Node. `npm run dev` runs the Worker locally; put the secrets in a `.dev.vars` file. `TELEGRAM_API` in `.dev.vars` can point at a mock server instead of the real Telegram API.
