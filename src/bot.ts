// Update routing: commands, plain-text shortcuts, button taps, widget requests and screenshots.

import { aiErrorMessage, coach, readScreenshot } from "./ai.ts";
import { BOT_ADCS, BOT_SUPPORTS, champ, parseChampions } from "./data/champions.ts";
import { ADCS, POOL, SUPPORTS } from "./data/pool.ts";
import { bestFor, recommend, type GameRecord, type Pick } from "./engine/draft.ts";
import { bansCard, champCard, compCard, duoTable, enemyCard, fedCard, planCard, recCard, statsCard, type Names } from "./format.ts";
import { newGame, type ChatState, type Game, type Timer } from "./state.ts";
import { downloadFile, edit, esc, grid, send, tg, toast, typing, type Env, type Keyboard } from "./telegram.ts";
import { TIMER_BY_KEY, TIMERS } from "./timers.ts";
import { DRAFT_HTML, draftState, TIMER_HTML, timerState } from "./widgets.ts";

interface Player {
  id: number;
  name: string;
  role: "support" | "adc";
}

export function players(env: Env): Player[] {
  return (env.PLAYERS ?? "")
    .split(",")
    .map((p) => p.trim().split(":"))
    .filter((p) => p.length >= 3 && /^\d+$/.test(p[0]))
    .map(([id, name, role]) => ({ id: Number(id), name, role: role === "adc" ? "adc" : "support" }));
}

function names(env: Env): Names {
  const ps = players(env);
  return {
    support: ps.find((p) => p.role === "support")?.name ?? "Support",
    adc: ps.find((p) => p.role === "adc")?.name ?? "ADC",
  };
}

interface Ctx {
  env: Env;
  chatId: number;
  userId: number;
  isPrivate: boolean;
  /** Other players' private chats that should see shared updates. */
  peers: number[];
  state: DurableObjectStub<ChatState>;
  names: Names;
  role?: "support" | "adc";
}

// ───────────────────────── keyboards ─────────────────────────

const MENU: Keyboard = [
  [
    { text: "🎮 New game", callback_data: "m:new" },
    { text: "📋 Plan", callback_data: "m:plan" },
  ],
  [
    { text: "🤝 Duo table", callback_data: "m:duo" },
    { text: "🚫 Bans", callback_data: "m:bans" },
  ],
  [
    { text: "⏱ Spell timers", callback_data: "m:timers" },
    { text: "📊 Stats", callback_data: "m:stats" },
  ],
  [{ text: "❓ Help", callback_data: "m:help" }],
];

const PLAN_KB: Keyboard = [
  [
    { text: "🔥 Fed enemy", callback_data: "m:fed" },
    { text: "⏱ Timers", callback_data: "m:timers" },
  ],
  [
    { text: "✅ Win", callback_data: "res:w" },
    { text: "❌ Loss", callback_data: "res:l" },
  ],
  [
    { text: "🔄 Change picks", callback_data: "pick" },
    { text: "🎮 New game", callback_data: "m:new" },
  ],
];

function enemyAdcKb(): Keyboard {
  return [...grid(BOT_ADCS.map((n, i) => ({ text: n, callback_data: `ea:${i}` })), 4), [{ text: "🤷 Don't know yet", callback_data: "ea:x" }]];
}

function enemySupKb(): Keyboard {
  return [...grid(BOT_SUPPORTS.map((n, i) => ({ text: n, callback_data: `es:${i}` })), 4), [{ text: "🤷 Don't know yet", callback_data: "es:x" }]];
}

function recKb(picks: Pick[]): Keyboard {
  return [
    ...picks.map((p) => [{ text: `🔒 ${p.sup} + ${p.adc}`, callback_data: `lk:${p.sup}:${p.adc}` }]),
    [{ text: "✋ Pick our champs manually", callback_data: "pick" }],
  ];
}

function manualKb(g: Game): Keyboard {
  const mark = (n: string, cur?: string) => (n === cur ? `✅ ${n}` : n);
  return [
    ...grid(SUPPORTS.map((s) => ({ text: mark(s, g.sup), callback_data: `ls:${s}` })), 3),
    ...grid(ADCS.map((a) => ({ text: mark(a, g.adc), callback_data: `la:${a}` })), 3),
  ];
}

function timerKb(): Keyboard {
  const rows: Keyboard = [];
  for (let i = 0; i < TIMERS.length; i += 3) rows.push(TIMERS.slice(i, i + 3).map(([k, l]) => ({ text: l, callback_data: `tm:${k}` })));
  rows.push([
    { text: "📋 Status", callback_data: "tm:list" },
    { text: "🗑 Clear all", callback_data: "tm:clear" },
  ]);
  return rows;
}

function timerText(timers: Timer[]): string {
  const now = Date.now();
  const fmt = (ms: number) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const list = timers.length ? timers.map((t) => `• <b>${t.label}</b> up in ${fmt(t.due - now)}`).join("\n") : "No timers running.";
  return `<b>⏱ Enemy spell timers</b>\nTap the moment you see a spell used. I'll message when it's back.\n\n${list}`;
}

// ───────────────────────── shared helpers ─────────────────────────

async function game(ctx: Ctx): Promise<Game> {
  const g = await ctx.state.getGame();
  // A game older than 2 hours is stale; start fresh.
  if (!g || Date.now() - g.startedAt > 2 * 3600_000) return newGame();
  return g;
}

function isSupportish(name: string): boolean {
  return champ(name)?.role === "support" || BOT_SUPPORTS.includes(name);
}

/** Fill the enemy bot lane from a list of enemy champions. */
function inferBotLane(g: Game): void {
  if (!g.eAdc) g.eAdc = g.enemies.find((n) => champ(n)?.role === "adc");
  if (!g.eSup) g.eSup = g.enemies.find((n) => champ(n)?.role === "support") ?? g.enemies.find((n) => isSupportish(n) && n !== g.eAdc);
}

function picksFor(g: Game, history: GameRecord[]): Pick[] {
  const input = { eAdc: g.eAdc, eSup: g.eSup, enemies: g.enemies, lockedSup: g.sup, lockedAdc: g.adc, bans: g.bans, history };
  if (g.sup && !g.adc) return bestFor("adc", input).slice(0, 3);
  if (g.adc && !g.sup) return bestFor("support", input).slice(0, 3);
  return recommend(input, 3);
}

/** Send to this chat, and to the other player's private chat when we're in a private chat. */
async function broadcast(ctx: Ctx, html: string, kb?: Keyboard): Promise<void> {
  await send(ctx.env, ctx.chatId, html, kb);
  for (const peer of ctx.peers) await send(ctx.env, peer, html, kb);
}

/** Save the game and push its state to every open draft widget. */
async function saveGame(ctx: Ctx, g: Game): Promise<string> {
  await ctx.state.setGame(g);
  const data = draftState(g, picksFor(g, await ctx.state.history()), await ctx.state.bump());
  for (const w of await ctx.state.widgets("draft")) {
    await tg(ctx.env, "editMessageWidgetData", { chat_id: w.c, message_id: w.m, chat_data: data });
  }
  return data;
}

async function syncTimers(ctx: Ctx, timers: Timer[]): Promise<string> {
  const data = timerState(timers, await ctx.state.bump());
  for (const w of await ctx.state.widgets("timer")) {
    await tg(ctx.env, "editMessageWidgetData", { chat_id: w.c, message_id: w.m, chat_data: data });
  }
  return data;
}

async function startTimer(ctx: Ctx, key: string): Promise<{ label: string; seconds: number; data: string } | undefined> {
  const t = TIMER_BY_KEY.get(key);
  if (!t) return undefined;
  const timers = await ctx.state.startTimer([ctx.chatId, ...ctx.peers], t.label, t.seconds);
  return { ...t, data: await syncTimers(ctx, timers) };
}

async function showRecs(ctx: Ctx, g: Game, messageId?: number): Promise<void> {
  const picks = picksFor(g, await ctx.state.history());
  const text = recCard(picks, g, ctx.names);
  if (messageId) await edit(ctx.env, ctx.chatId, messageId, text, recKb(picks));
  else await send(ctx.env, ctx.chatId, text, recKb(picks));
}

async function showPlan(ctx: Ctx, g: Game, everyone = false): Promise<void> {
  if (!g.sup && !g.adc) {
    await send(ctx.env, ctx.chatId, "No picks locked yet. Start with 🎮 New game, or type <code>we lulu jinx</code>.", MENU);
    return;
  }
  const html = planCard(g, ctx.names, await ctx.state.notes());
  if (everyone) await broadcast(ctx, html, PLAN_KB);
  else await send(ctx.env, ctx.chatId, html, PLAN_KB);
}

async function afterLock(ctx: Ctx, g: Game): Promise<void> {
  await saveGame(ctx, g);
  if (g.sup && g.adc) await showPlan(ctx, g, true);
  else await showRecs(ctx, g);
}

function gameContext(g: Game | null): string {
  if (!g) return "";
  return [
    g.sup && `Our support: ${g.sup}`,
    g.adc && `Our ADC: ${g.adc}`,
    g.eAdc && `Enemy ADC: ${g.eAdc}`,
    g.eSup && `Enemy support: ${g.eSup}`,
    g.enemies.length && `Enemy team: ${g.enemies.join(", ")}`,
    g.allies.length && `Our team: ${g.allies.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ───────────────────────── commands ─────────────────────────

const HELP = `<b>Rift Duo bot</b> — draft help and game plans for our bot lane.

<b>Before the game</b>
🎮 /new — draft board: tap the enemy bot lane, get the best duo
<code>vs kaisa nautilus</code> — same thing, typed
📸 Send a screenshot of draft or loading screen — I read both teams
<code>enemy ahri lee jinx thresh darius</code> — enemy team → the best build for this game
<code>we lulu jinx</code> — lock our picks → full game plan (sent to both of you)
/plan — show the game plan again
/bans — what to ban against our pool
/duo — all 36 duos ranked (/duo jinx for one champ)

<b>Lookups</b>
Type any champion name: ours → full guide, enemy → how to play vs them
/build zyra — builds (the exact one for this game if you sent the enemy team)
/note jinx <i>text</i> — save a personal note on a champ (/note jinx clear)

<b>During the game</b>
⏱ /t — live spell timers; I ping you both when a spell is back
🔥 /fed zed — someone is fed: what each of us should buy next
/ask <i>question</i> — coach with current patch info (needs the Claude key)

<b>After the game</b>
/win · /loss — save the result (improves picks over time)
/stats — win rates · /undo removes the last result
/patch — check the newest patch for our champs

<i>/buttons — draft with plain buttons if the board doesn't load.</i>`;

async function cmdNew(ctx: Ctx, forceButtons = false): Promise<void> {
  // Reuse a game started in the last 20 minutes so the second player joins the same draft.
  const current = await ctx.state.getGame();
  const fresh = current && !forceButtons && Date.now() - current.startedAt < 20 * 60_000;
  const g = fresh ? current : newGame();
  const data = await saveGame(ctx, g);
  if (ctx.isPrivate && !forceButtons) {
    const sent = await tg<{ message_id: number }>(ctx.env, "sendWidget", {
      chat_id: ctx.chatId,
      html: DRAFT_HTML,
      chat_data: data,
      allow_queries: true,
      caption: "🎮 Draft board · /buttons if it doesn't load",
    });
    if (sent?.message_id) {
      await ctx.state.addWidget("draft", ctx.chatId, sent.message_id);
      return;
    }
  }
  await send(
    ctx.env,
    ctx.chatId,
    "🎮 <b>New game.</b> Who is the <b>enemy ADC</b>?\n<i>Or send a draft screenshot, or type: vs kaisa nautilus</i>",
    enemyAdcKb(),
  );
}

async function cmdTimers(ctx: Ctx): Promise<void> {
  const timers = await ctx.state.timers();
  if (ctx.isPrivate) {
    const sent = await tg<{ message_id: number }>(ctx.env, "sendWidget", {
      chat_id: ctx.chatId,
      html: TIMER_HTML,
      chat_data: timerState(timers, await ctx.state.bump()),
      allow_queries: true,
      caption: "⏱ Spell timers",
    });
    if (sent?.message_id) {
      await ctx.state.addWidget("timer", ctx.chatId, sent.message_id);
      return;
    }
  }
  await send(ctx.env, ctx.chatId, timerText(timers), timerKb());
}

async function cmdVs(ctx: Ctx, text: string): Promise<void> {
  const { found, unknown } = parseChampions(text);
  const g = await game(ctx);
  g.eAdc = undefined;
  g.eSup = undefined;
  for (const n of found) {
    if (champ(n)?.role === "adc" && !g.eAdc) g.eAdc = n;
    else if (isSupportish(n) && !g.eSup) g.eSup = n;
    else if (!g.eAdc) g.eAdc = n;
    else if (!g.eSup) g.eSup = n;
  }
  if (!g.eAdc && !g.eSup) {
    await send(ctx.env, ctx.chatId, `I didn't recognize ${unknown.length ? `"${esc(unknown.join(" "))}"` : "any champion"}. Try: <code>vs kaisa nautilus</code>`);
    return;
  }
  await saveGame(ctx, g);
  await showRecs(ctx, g);
}

async function cmdEnemy(ctx: Ctx, text: string): Promise<void> {
  const { found } = parseChampions(text);
  if (!found.length) {
    await send(ctx.env, ctx.chatId, "Type up to 5 enemy champions: <code>enemy ahri lee jinx thresh darius</code>");
    return;
  }
  const g = await game(ctx);
  g.enemies = found.slice(0, 5);
  inferBotLane(g);
  await saveGame(ctx, g);
  if (g.sup && g.adc) await showPlan(ctx, g, true);
  else {
    await send(ctx.env, ctx.chatId, compCard(g.enemies, [g.sup, g.adc].filter(Boolean) as string[], ctx.names));
    await showRecs(ctx, g);
  }
}

async function cmdWe(ctx: Ctx, text: string): Promise<void> {
  const { found } = parseChampions(text);
  const g = await game(ctx);
  for (const n of found) {
    if (SUPPORTS.includes(n)) g.sup = n;
    else if (ADCS.includes(n)) g.adc = n;
  }
  if (!found.some((n) => SUPPORTS.includes(n) || ADCS.includes(n))) {
    await send(ctx.env, ctx.chatId, `Type our picks from the pool: <code>we lulu jinx</code>\nSupports: ${SUPPORTS.join(", ")}\nADCs: ${ADCS.join(", ")}`);
    return;
  }
  await afterLock(ctx, g);
}

async function cmdChamp(ctx: Ctx, text: string, buildOnly = false): Promise<void> {
  const { found } = parseChampions(text);
  if (!found.length) {
    const mine = ctx.role === "adc" ? ADCS : ctx.role === "support" ? SUPPORTS : [...SUPPORTS, ...ADCS];
    await send(ctx.env, ctx.chatId, "Which champion?", grid(mine.map((n) => ({ text: n, callback_data: `c:${n}` })), 3));
    return;
  }
  const notes = await ctx.state.notes();
  for (const n of found.slice(0, 3)) {
    if (!POOL[n]) {
      await send(ctx.env, ctx.chatId, enemyCard(n));
      continue;
    }
    if (!buildOnly) {
      await send(ctx.env, ctx.chatId, champCard(POOL[n], notes[n]));
      continue;
    }
    const g = await game(ctx);
    const enemies = g.enemies.length ? g.enemies : ([g.eAdc, g.eSup].filter(Boolean) as string[]);
    if (enemies.length) await send(ctx.env, ctx.chatId, compCard(enemies, [n], ctx.names));
    else await send(ctx.env, ctx.chatId, champCard(POOL[n], notes[n], false));
  }
}

async function cmdFed(ctx: Ctx, text: string): Promise<void> {
  const g = await game(ctx);
  const ours = [g.sup, g.adc].filter(Boolean) as string[];
  const enemy = parseChampions(text).found[0];
  if (enemy) {
    await broadcast(ctx, fedCard(enemy, ours, ctx.names));
    return;
  }
  if (!g.enemies.length) {
    await send(ctx.env, ctx.chatId, "Who is fed? Type <code>/fed zed</code>, or send the enemy team first.");
    return;
  }
  await send(ctx.env, ctx.chatId, "🔥 Who is fed?", grid(g.enemies.map((n) => ({ text: n, callback_data: `fd:${n}` })), 3));
}

async function cmdResult(ctx: Ctx, win: boolean): Promise<void> {
  const g = await ctx.state.getGame();
  if (!g?.sup || !g?.adc) {
    await send(ctx.env, ctx.chatId, "Which duo did you play? Lock it first (<code>we lulu jinx</code>), then tap the result again.");
    return;
  }
  const total = await ctx.state.addRecord({ ts: Date.now(), sup: g.sup, adc: g.adc, eAdc: g.eAdc, eSup: g.eSup, win });
  await saveGame(ctx, newGame());
  const vs = [g.eAdc, g.eSup].filter(Boolean).join(" + ");
  await broadcast(
    ctx,
    `${win ? "✅ Win" : "❌ Loss"} saved: ${esc(g.sup)} + ${esc(g.adc)}${vs ? ` vs ${esc(vs)}` : ""}. Total games: ${total}.`,
    [[{ text: "🎮 New game", callback_data: "m:new" }, { text: "📊 Stats", callback_data: "m:stats" }]],
  );
}

async function cmdNote(ctx: Ctx, text: string): Promise<void> {
  const [first, ...rest] = text.trim().split(/\s+/);
  const name = first ? parseChampions(first).found[0] : undefined;
  if (!name) {
    const all = await ctx.state.notes();
    const lines = Object.entries(all).map(([k, v]) => `<b>${esc(k)}</b>\n${v.map((x) => `• ${esc(x)}`).join("\n")}`);
    await send(ctx.env, ctx.chatId, lines.length ? lines.join("\n\n") : "No notes yet. <code>/note jinx buy cull first vs poke</code>");
    return;
  }
  const body = rest.join(" ").trim();
  if (!body) {
    const n = (await ctx.state.notes())[name] ?? [];
    await send(ctx.env, ctx.chatId, n.length ? `<b>${esc(name)}</b>\n${n.map((x) => `• ${esc(x)}`).join("\n")}` : `No notes for ${esc(name)}.`);
    return;
  }
  const saved = await ctx.state.addNote(name, body.toLowerCase() === "clear" ? null : body);
  await send(ctx.env, ctx.chatId, saved.length ? `📝 Saved. ${esc(name)} has ${saved.length} note(s).` : `🗑 Notes for ${esc(name)} cleared.`);
}

async function aiAllowed(ctx: Ctx): Promise<boolean> {
  if (!ctx.env.ANTHROPIC_API_KEY) {
    await send(ctx.env, ctx.chatId, "AI features are off (no ANTHROPIC_API_KEY set). Everything else works.");
    return false;
  }
  // Paid features stay off until the bot is locked to known players.
  if (!players(ctx.env).length) {
    await send(ctx.env, ctx.chatId, "AI features are off until the bot is locked to its players (run scripts/set-players.sh).");
    return false;
  }
  if (!(await ctx.state.useAi(Number(ctx.env.AI_DAILY_LIMIT ?? 40)))) {
    await send(ctx.env, ctx.chatId, "Daily AI limit reached. It resets at 00:00 UTC.");
    return false;
  }
  return true;
}

async function cmdAsk(ctx: Ctx, question: string): Promise<void> {
  if (!question.trim()) {
    await send(ctx.env, ctx.chatId, "Ask anything: <code>/ask how do we lane vs Draven Thresh as Sona Jinx?</code>");
    return;
  }
  if (!(await aiAllowed(ctx))) return;
  await typing(ctx.env, ctx.chatId);
  try {
    const answer = await coach(ctx.env, question, gameContext(await ctx.state.getGame()));
    await send(ctx.env, ctx.chatId, answer, undefined, true);
  } catch (err) {
    console.error(err);
    await send(ctx.env, ctx.chatId, esc(aiErrorMessage(err)));
  }
}

async function cmdPatch(ctx: Ctx): Promise<void> {
  await cmdAsk(
    ctx,
    `Find the latest Wild Rift patch notes and any hotfixes after the bot's data patch. List only changes that affect: ` +
      `${[...SUPPORTS, ...ADCS].join(", ")}, the items in our stored builds, and support/ADC runes or items in general. ` +
      `For each, say buff/nerf and whether our stored build should change. End with the current patch number.`,
  );
}

// ───────────────────────── screenshots ─────────────────────────

function applyTeams(g: Game, allies: string[], enemies: string[]): void {
  g.allies = allies;
  g.enemies = enemies;
  g.pendingTeams = undefined;
  g.eAdc = undefined;
  g.eSup = undefined;
  inferBotLane(g);
  if (!g.sup) g.sup = allies.find((n) => SUPPORTS.includes(n));
  if (!g.adc) g.adc = allies.find((n) => ADCS.includes(n));
}

async function afterTeams(ctx: Ctx, g: Game): Promise<void> {
  await saveGame(ctx, g);
  const summary = `📸 <b>Our team:</b> ${esc(g.allies.join(", ") || "?")}\n<b>Enemy team:</b> ${esc(g.enemies.join(", ") || "?")}\n<i>Wrong? Type: enemy a b c d e</i>`;
  await send(ctx.env, ctx.chatId, summary);
  if (g.sup && g.adc) await showPlan(ctx, g, true);
  else {
    if (g.enemies.length >= 3) await send(ctx.env, ctx.chatId, compCard(g.enemies, [g.sup, g.adc].filter(Boolean) as string[], ctx.names));
    await showRecs(ctx, g);
  }
}

async function onPhoto(ctx: Ctx, fileId: string, mime?: string): Promise<void> {
  if (!(await aiAllowed(ctx))) return;
  await typing(ctx.env, ctx.chatId);
  const file = await downloadFile(ctx.env, fileId);
  if (!file) {
    await send(ctx.env, ctx.chatId, "Couldn't download the image. Try again.");
    return;
  }
  const media = (mime ?? (file.path.endsWith(".png") ? "image/png" : file.path.endsWith(".webp") ? "image/webp" : "image/jpeg")) as "image/jpeg" | "image/png" | "image/webp";
  let r;
  try {
    r = await readScreenshot(ctx.env, file.bytes, media);
  } catch (err) {
    console.error(err);
    await send(ctx.env, ctx.chatId, esc(aiErrorMessage(err)));
    return;
  }
  if (!r.team_a.length && !r.team_b.length) {
    await send(ctx.env, ctx.chatId, `I couldn't find champions in that image. ${esc(r.notes)}`);
    return;
  }
  const g = await game(ctx);
  const locked = [g.sup, g.adc].filter(Boolean) as string[];
  const poolScore = (team: string[]) => (team.some((n) => SUPPORTS.includes(n)) ? 1 : 0) + (team.some((n) => ADCS.includes(n)) ? 1 : 0);
  let ours: "a" | "b" | undefined;
  if (locked.length) {
    const inA = locked.some((n) => r.team_a.includes(n));
    const inB = locked.some((n) => r.team_b.includes(n));
    if (inA !== inB) ours = inA ? "a" : "b";
  }
  if (!ours) {
    const a = poolScore(r.team_a);
    const b = poolScore(r.team_b);
    if (a === 2 && b < 2) ours = "a";
    else if (b === 2 && a < 2) ours = "b";
  }
  if (ours) {
    applyTeams(g, ours === "a" ? r.team_a : r.team_b, ours === "a" ? r.team_b : r.team_a);
    await afterTeams(ctx, g);
    return;
  }
  g.pendingTeams = { a: r.team_a, b: r.team_b };
  await ctx.state.setGame(g);
  await send(
    ctx.env,
    ctx.chatId,
    `📸 Found two teams (${esc(r.team_a_position || "first")} is A). <b>Which one is the enemy?</b>\nA: ${esc(r.team_a.join(", ") || "?")}\nB: ${esc(r.team_b.join(", ") || "?")}${r.notes ? `\n<i>${esc(r.notes)}</i>` : ""}`,
    [[{ text: "Enemy = A", callback_data: "tA" }, { text: "Enemy = B", callback_data: "tB" }]],
  );
}

// ───────────────────────── entry points ─────────────────────────

interface TgMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; first_name?: string };
  text?: string;
  caption?: string;
  photo?: { file_id: string; width: number }[];
  document?: { file_id: string; mime_type?: string };
}

interface TgCallback {
  id: string;
  from: { id: number };
  data?: string;
  message?: { message_id: number; chat: { id: number; type?: string } };
}

interface TgWidgetQuery {
  id: string;
  from: { id: number };
  data?: string;
  chat?: { id: number; type?: string };
  message_id?: number;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallback;
  widget_query?: TgWidgetQuery;
}

function allowed(env: Env, userId: number): boolean {
  const ps = players(env);
  return ps.length === 0 || ps.some((p) => p.id === userId);
}

function makeCtx(env: Env, chatId: number, userId: number, isPrivate: boolean): Ctx {
  const ps = players(env);
  const isPlayer = ps.some((p) => p.id === userId);
  // Both players share one state ("duo") so private chats stay in sync.
  const stateName = isPlayer ? "duo" : String(chatId);
  return {
    env,
    chatId,
    userId,
    isPrivate,
    peers: isPlayer && isPrivate ? ps.filter((p) => p.id !== userId).map((p) => p.id) : [],
    state: env.CHAT.get(env.CHAT.idFromName(stateName)),
    names: names(env),
    role: ps.find((p) => p.id === userId)?.role,
  };
}

export async function handleUpdate(env: Env, update: TgUpdate): Promise<void> {
  const msg = update.message;
  const cb = update.callback_query;
  const wq = update.widget_query;
  const chatId = msg?.chat.id ?? cb?.message?.chat.id ?? wq?.chat?.id;
  const userId = msg?.from?.id ?? cb?.from.id ?? wq?.from.id;
  if (!chatId || !userId) return;
  const chatType = msg?.chat.type ?? cb?.message?.chat.type ?? wq?.chat?.type;
  const isPrivate = chatType ? chatType === "private" : chatId > 0;

  const text = (msg?.text ?? msg?.caption ?? "").trim();
  if (/^\/whoami\b/.test(text)) {
    await send(env, chatId, `Your Telegram user ID: <code>${userId}</code>\nChat ID: <code>${chatId}</code>`);
    return;
  }
  if (!allowed(env, userId)) {
    if (wq) await tg(env, "answerWidgetQuery", { widget_query_id: wq.id });
    else if (isPrivate) await send(env, chatId, "This is a private bot.");
    return;
  }

  const ctx = makeCtx(env, chatId, userId, isPrivate);
  if (await ctx.state.seen(update.update_id)) return;

  try {
    if (wq) await onWidgetQuery(ctx, wq);
    else if (cb) await onCallback(ctx, cb);
    else if (msg) await onMessage(ctx, msg, text);
  } catch (err) {
    console.error(err);
    await send(env, chatId, `Something broke: ${esc(err instanceof Error ? err.message : String(err))}`);
  }
}

async function onMessage(ctx: Ctx, msg: TgMessage, text: string): Promise<void> {
  if (msg.photo?.length) {
    const biggest = [...msg.photo].sort((a, b) => b.width - a.width)[0];
    await onPhoto(ctx, biggest.file_id);
    return;
  }
  if (msg.document?.mime_type?.startsWith("image/")) {
    await onPhoto(ctx, msg.document.file_id, msg.document.mime_type);
    return;
  }
  if (!text) return;

  const m = text.match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/);
  if (m) {
    const [, cmd, arg] = m;
    switch (cmd.toLowerCase()) {
      case "start":
      case "menu":
        return send(ctx.env, ctx.chatId, `Hi! I help ${esc(ctx.names.support)} and ${esc(ctx.names.adc)} win bot lane. Tap 🎮 New game when you enter draft.`, MENU);
      case "help":
        return send(ctx.env, ctx.chatId, HELP, MENU);
      case "new":
      case "game":
        return cmdNew(ctx);
      case "buttons":
        return cmdNew(ctx, true);
      case "vs":
        return cmdVs(ctx, arg);
      case "enemy":
      case "enemies":
        return cmdEnemy(ctx, arg);
      case "we":
      case "us":
      case "lock":
        return cmdWe(ctx, arg);
      case "plan":
        return showPlan(ctx, await game(ctx));
      case "champ":
      case "c":
        return cmdChamp(ctx, arg);
      case "build":
      case "b":
        return cmdChamp(ctx, arg, true);
      case "fed":
        return cmdFed(ctx, arg);
      case "duo": {
        const focus = parseChampions(arg).found.find((n) => POOL[n]);
        return send(ctx.env, ctx.chatId, duoTable(focus));
      }
      case "ban":
      case "bans":
        return send(ctx.env, ctx.chatId, bansCard(await ctx.state.history()));
      case "t":
      case "timer":
      case "timers":
        return cmdTimers(ctx);
      case "win":
      case "w":
        return cmdResult(ctx, true);
      case "loss":
      case "lose":
      case "l":
        return cmdResult(ctx, false);
      case "stats":
        return send(ctx.env, ctx.chatId, statsCard(await ctx.state.history()));
      case "undo": {
        const last = await ctx.state.undoRecord();
        return send(ctx.env, ctx.chatId, last ? `↩️ Removed: ${last.win ? "win" : "loss"} with ${esc(last.sup)} + ${esc(last.adc)}.` : "Nothing to undo.");
      }
      case "note":
      case "notes":
        return cmdNote(ctx, arg);
      case "ask":
        return cmdAsk(ctx, arg);
      case "patch":
        return cmdPatch(ctx);
      default:
        return send(ctx.env, ctx.chatId, "Unknown command. /help lists everything.");
    }
  }

  // Plain-text shortcuts
  const lower = text.toLowerCase();
  if (/^(vs|versus)\b/.test(lower)) return cmdVs(ctx, text.replace(/^\S+/, ""));
  if (/^(enemy|enemies|them)\b/.test(lower)) return cmdEnemy(ctx, text.replace(/^\S+/, ""));
  if (/^(we|us|our|lock)\b/.test(lower)) return cmdWe(ctx, text.replace(/^\S+/, ""));
  if (/^fed\b/.test(lower)) return cmdFed(ctx, text.replace(/^\S+/, ""));
  if (/^(win|won|w)$/.test(lower)) return cmdResult(ctx, true);
  if (/^(loss|lost|lose|l)$/.test(lower)) return cmdResult(ctx, false);
  if (text.endsWith("?")) return cmdAsk(ctx, text);

  const { found } = parseChampions(text);
  if (found.length === 1 || found.length === 3) return cmdChamp(ctx, text);
  if (found.length === 2) return cmdVs(ctx, text);
  if (found.length >= 4) return cmdEnemy(ctx, text);
  await send(ctx.env, ctx.chatId, "I didn't catch that. Type a champion name, <code>vs jinx thresh</code>, or /help.");
}

/** Requests from the draft and timer widgets. The answer carries the new state. */
async function onWidgetQuery(ctx: Ctx, wq: TgWidgetQuery): Promise<void> {
  const data = wq.data ?? "";
  const answer = (state?: string) => tg(ctx.env, "answerWidgetQuery", { widget_query_id: wq.id, ...(state ? { data: state } : {}) });

  if (data.startsWith("tm:")) {
    const key = data.slice(3);
    if (key === "clear") {
      await ctx.state.clearTimers();
      await answer(await syncTimers(ctx, []));
      return;
    }
    const t = await startTimer(ctx, key);
    await answer(t?.data);
    return;
  }

  // Draft board
  let g = await game(ctx);
  const [cmd, a, b] = data.split(":");
  let locked = false;
  if (cmd === "rs") g = newGame();
  else if (cmd === "ea") g.eAdc = a === "x" ? undefined : BOT_ADCS[Number(a)];
  else if (cmd === "es") g.eSup = a === "x" ? undefined : BOT_SUPPORTS[Number(a)];
  else if (cmd === "lk") {
    g.sup = SUPPORTS[Number(a)];
    g.adc = ADCS[Number(b)];
    locked = true;
  } else if (cmd === "ls") {
    g.sup = SUPPORTS[Number(a)];
    locked = true;
  } else if (cmd === "la") {
    g.adc = ADCS[Number(a)];
    locked = true;
  } else {
    await answer();
    return;
  }
  await answer(await saveGame(ctx, g));
  if (locked && g.sup && g.adc) await showPlan(ctx, g, true);
}

async function onCallback(ctx: Ctx, cb: TgCallback): Promise<void> {
  const data = cb.data ?? "";
  const messageId = cb.message?.message_id;
  const ack = (t?: string) => toast(ctx.env, cb.id, t);

  if (data.startsWith("m:")) {
    await ack();
    switch (data.slice(2)) {
      case "new":
        return cmdNew(ctx);
      case "plan":
        return showPlan(ctx, await game(ctx));
      case "duo":
        return send(ctx.env, ctx.chatId, duoTable());
      case "bans":
        return send(ctx.env, ctx.chatId, bansCard(await ctx.state.history()));
      case "timers":
        return cmdTimers(ctx);
      case "stats":
        return send(ctx.env, ctx.chatId, statsCard(await ctx.state.history()));
      case "fed":
        return cmdFed(ctx, "");
      case "help":
        return send(ctx.env, ctx.chatId, HELP);
    }
    return;
  }

  if (data.startsWith("ea:")) {
    await ack();
    const g = await game(ctx);
    const v = data.slice(3);
    g.eAdc = v === "x" ? undefined : BOT_ADCS[Number(v)];
    await saveGame(ctx, g);
    const head = g.eAdc ? `Enemy ADC: <b>${esc(g.eAdc)}</b>\n` : "";
    if (messageId) await edit(ctx.env, ctx.chatId, messageId, `${head}Who is the <b>enemy support</b>?`, enemySupKb());
    return;
  }

  if (data.startsWith("es:")) {
    await ack();
    const g = await game(ctx);
    const v = data.slice(3);
    g.eSup = v === "x" ? undefined : BOT_SUPPORTS[Number(v)];
    await saveGame(ctx, g);
    return showRecs(ctx, g, messageId);
  }

  if (data.startsWith("lk:")) {
    const [, sup, adc] = data.split(":");
    await ack(`Locked ${sup} + ${adc}`);
    const g = await game(ctx);
    g.sup = sup;
    g.adc = adc;
    return afterLock(ctx, g);
  }

  if (data === "pick") {
    await ack();
    const g = await game(ctx);
    return send(ctx.env, ctx.chatId, `Tap our picks (${esc(ctx.names.support)}'s support, ${esc(ctx.names.adc)}'s ADC):`, manualKb(g));
  }

  if (data.startsWith("ls:") || data.startsWith("la:")) {
    const g = await game(ctx);
    const n = data.slice(3);
    if (data.startsWith("ls:")) g.sup = n;
    else g.adc = n;
    await ack(`${n} locked`);
    await saveGame(ctx, g);
    if (g.sup && g.adc) return showPlan(ctx, g, true);
    if (messageId) await edit(ctx.env, ctx.chatId, messageId, `Locked: ${esc([g.sup, g.adc].filter(Boolean).join(" + "))}. Tap the other pick, or see suggestions below.`, manualKb(g));
    return showRecs(ctx, g);
  }

  if (data === "tA" || data === "tB") {
    await ack();
    const g = await game(ctx);
    if (!g.pendingTeams) return;
    const { a, b } = g.pendingTeams;
    applyTeams(g, data === "tA" ? b : a, data === "tA" ? a : b);
    return afterTeams(ctx, g);
  }

  if (data.startsWith("tm:")) {
    const key = data.slice(3);
    if (key === "clear") {
      await ctx.state.clearTimers();
      await syncTimers(ctx, []);
      await ack("Cleared");
    } else if (key === "list") {
      await ack();
    } else {
      const t = await startTimer(ctx, key);
      await ack(t ? `${t.label}: back in ${Math.floor(t.seconds / 60)}:${String(t.seconds % 60).padStart(2, "0")}` : undefined);
    }
    if (messageId) await edit(ctx.env, ctx.chatId, messageId, timerText(await ctx.state.timers()), timerKb());
    return;
  }

  if (data.startsWith("fd:")) {
    await ack();
    return cmdFed(ctx, data.slice(3));
  }

  if (data.startsWith("res:")) {
    await ack();
    return cmdResult(ctx, data === "res:w");
  }

  if (data.startsWith("c:")) {
    await ack();
    return cmdChamp(ctx, data.slice(2));
  }

  await ack();
}
