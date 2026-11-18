// Renders bot replies as Telegram HTML.

import { champ } from "./data/champions.ts";
import { ADCS, PATCH, POOL, SUPPORTS, SYNERGY, type PoolChamp, type Situation } from "./data/pool.ts";
import { THREATS } from "./data/threats.ts";
import { analyzeComp, fedAdvice, gameBuild, SITUATION_LABEL, type GameBuild } from "./engine/comp.ts";
import { suggestBans, type GameRecord, type Pick } from "./engine/draft.ts";
import type { Game } from "./state.ts";
import { esc } from "./telegram.ts";

export interface Names {
  support: string;
  adc: string;
}

const bullet = (lines: string[]) => lines.map((l) => `• ${esc(l)}`).join("\n");

export function champCard(c: PoolChamp, notes: string[] = [], full = true): string {
  const parts = [
    `<b>${esc(c.name)}</b> — ${esc(c.style)}`,
    `<b>Spells:</b> ${esc(c.spells)}`,
    `<b>Runes:</b> ${esc(c.runes)}`,
    `<b>Skills:</b> ${esc(c.skills)}`,
    `<b>Boots:</b> ${esc(c.boots)}`,
    "<b>Builds</b>\n" + c.builds.map((b) => `• <i>${esc(b.name)}</i> (${esc(b.when)}): ${esc(b.items.join(" → "))}`).join("\n"),
  ];
  if (full) {
    const sit = Object.entries(c.situational).map(
      ([k, v]) => `${SITUATION_LABEL[k as Situation]}: ${v.item}${v.alt ? ` (or ${v.alt})` : ""}${v.replaces ? `, replaces ${v.replaces}` : ""}`,
    );
    parts.push("<b>Situational</b>\n" + bullet(sit));
    parts.push("<b>Combos</b>\n" + bullet(c.combos));
    parts.push("<b>Power spikes</b>\n" + bullet(c.spikes));
    parts.push("<b>Laning</b>\n" + bullet(c.lane));
    parts.push("<b>Teamfights</b>\n" + bullet(c.fights));
    parts.push("<b>Good vs</b> " + esc(Object.keys(c.good).join(", ")));
    parts.push("<b>Bad vs</b> " + esc(Object.keys(c.bad).join(", ")));
    const partners = c.owner === "support" ? ADCS.map((a) => [a, ...SYNERGY[c.name][a]] as const) : SUPPORTS.map((s) => [s, ...SYNERGY[s][c.name]] as const);
    parts.push(
      "<b>Best partners</b>\n" +
        [...partners]
          .sort((a, b) => b[1] - a[1])
          .map(([n, s, why]) => `• ${esc(n)} ${"★".repeat(s)}: ${esc(why)}`)
          .join("\n"),
    );
  }
  if (notes.length) parts.push("<b>Your notes</b>\n" + bullet(notes));
  parts.push(`<i>Data: patch ${PATCH}. /patch checks for newer changes.</i>`);
  return parts.join("\n\n");
}

export function enemyCard(name: string): string {
  const c = champ(name);
  const lines = [`<b>${esc(name)}</b>${c ? ` — ${c.role}, ${c.dmg} damage` : ""}`];
  if (THREATS[name]) lines.push(esc(THREATS[name]));
  const ours = Object.values(POOL);
  const good = ours.filter((p) => p.good[name]).map((p) => `• ${esc(p.name)}: ${esc(p.good[name])}`);
  const bad = ours.filter((p) => p.bad[name]).map((p) => `• ${esc(p.name)}: ${esc(p.bad[name])}`);
  if (good.length) lines.push("<b>Our picks that do well</b>\n" + good.join("\n"));
  if (bad.length) lines.push("<b>Our picks that struggle</b>\n" + bad.join("\n"));
  if (!THREATS[name] && !good.length && !bad.length) lines.push("No lane notes for this champion. Ask /ask for tips.");
  return lines.join("\n\n");
}

export function recCard(picks: Pick[], g: Game, names: Names): string {
  const vs = [g.eAdc, g.eSup].filter(Boolean).join(" + ");
  const head = vs ? `<b>Best duo vs ${esc(vs)}</b>` : "<b>Best blind duo</b> (enemy bot lane unknown)";
  const locked = [g.sup && `${names.support} locked ${g.sup}`, g.adc && `${names.adc} locked ${g.adc}`].filter(Boolean).join(", ");
  const body = picks.map((p, i) => {
    const medal = ["🥇", "🥈", "🥉"][i] ?? "•";
    const lines = [`${medal} <b>${esc(p.sup)} + ${esc(p.adc)}</b> (score ${p.score})`];
    lines.push(...p.reasons.slice(0, 3).map((r) => `   ✓ ${esc(r)}`));
    lines.push(...p.warnings.slice(0, 2).map((w) => `   ⚠ ${esc(w)}`));
    return lines.join("\n");
  });
  return [head, locked ? `<i>${esc(locked)}</i>` : "", ...body, "<i>Tap a duo to lock it and get the game plan.</i>"].filter(Boolean).join("\n\n");
}

/** The build for this game, with every swap and the reason for it. */
export function buildBlock(b: GameBuild, who: string): string {
  const c = POOL[b.champ];
  const lines = [`<b>${esc(who)} (${esc(b.champ)}): best build this game</b>`];
  lines.push(b.items.map((it, i) => `${i + 1}. ${esc(it)}`).join("\n"));
  lines.push(`Boots: ${esc(b.boots)}${b.bootsWhy ? ` (${esc(b.bootsWhy)})` : ""}`);
  if (b.swaps.length) {
    lines.push(
      b.swaps
        .map((s) => `🔁 ${s.out ? `${esc(s.out)} → ` : ""}<b>${esc(s.in)}</b>${s.alt ? ` (or ${esc(s.alt)})` : ""}\n    ${esc(s.why)}`)
        .join("\n"),
    );
  } else lines.push(`<i>No swaps needed: ${esc(b.variant.name)} build as is.</i>`);
  if (b.timing) lines.push(`⏰ ${esc(b.timing)}`);
  lines.push(`Spells: ${esc(c.spells)}\nRunes: ${esc(c.runes)}`);
  return lines.join("\n");
}

function enemyList(g: Game): string[] {
  return g.enemies.length ? g.enemies : ([g.eAdc, g.eSup].filter(Boolean) as string[]);
}

export function planCard(g: Game, names: Names, notes: Record<string, string[]>): string {
  const sup = g.sup ? POOL[g.sup] : undefined;
  const adc = g.adc ? POOL[g.adc] : undefined;
  const parts: string[] = [];
  const title = [sup?.name, adc?.name].filter(Boolean).join(" + ");
  const vs = [g.eAdc, g.eSup].filter(Boolean).join(" + ");
  parts.push(`<b>Game plan: ${esc(title || "?")}${vs ? ` vs ${esc(vs)}` : ""}</b>`);

  if (sup && adc) {
    const [s, why] = SYNERGY[sup.name][adc.name];
    parts.push(`<b>Duo</b> ${"★".repeat(s)}\n${esc(why)}`);
  }

  const lane: string[] = [];
  for (const e of [g.eAdc, g.eSup]) {
    if (!e) continue;
    if (THREATS[e]) lane.push(`${e}: ${THREATS[e]}`);
    for (const o of [sup, adc]) {
      if (!o) continue;
      if (o.good[e]) lane.push(`✓ ${o.name} vs ${e}: ${o.good[e]}`);
      if (o.bad[e]) lane.push(`⚠ ${o.name} vs ${e}: ${o.bad[e]}`);
    }
  }
  if (lane.length) parts.push("<b>Lane</b>\n" + bullet(lane));

  const combo: string[] = [];
  if (sup) combo.push(`${names.support}: ${sup.combos[0]}`);
  if (adc) combo.push(`${names.adc}: ${adc.combos[adc.combos.length > 2 ? 2 : 0]}`);
  if (combo.length) parts.push("<b>Key combos</b>\n" + bullet(combo));
  const spikes = [sup && `${sup.name}: ${sup.spikes.join("; ")}`, adc && `${adc.name}: ${adc.spikes.join("; ")}`].filter(Boolean) as string[];
  if (spikes.length) parts.push("<b>Power spikes</b>\n" + bullet(spikes));

  const enemies = enemyList(g);
  for (const o of [sup, adc]) if (o) parts.push(buildBlock(gameBuild(o.name, enemies), o.owner === "support" ? names.support : names.adc));

  if (g.enemies.length >= 3) {
    const rep = analyzeComp(g.enemies);
    parts.push("<b>Enemy team</b>\n" + bullet(rep.profile));
    if (rep.watch.length) parts.push("<b>Watch out</b>\n" + bullet(rep.watch));
    parts.push("<b>Win plan</b>\n" + bullet(rep.plan));
  }

  const n = [...(sup ? notes[sup.name] ?? [] : []), ...(adc ? notes[adc.name] ?? [] : [])];
  if (n.length) parts.push("<b>Your notes</b>\n" + bullet(n));
  if (g.enemies.length < 3) parts.push("<i>Send the full enemy team (screenshot or: enemy a b c d e) for the exact build.</i>");
  else parts.push("<i>Someone getting fed? Tap 🔥 Fed enemy for what to buy next.</i>");
  return parts.join("\n\n");
}

export function compCard(enemies: string[], ours: string[], names: Names): string {
  const rep = analyzeComp(enemies);
  const parts = [`<b>Enemy team:</b> ${esc(enemies.join(", "))}`, bullet(rep.profile)];
  if (rep.watch.length) parts.push("<b>Watch out</b>\n" + bullet(rep.watch));
  for (const n of ours.filter((o) => POOL[o])) parts.push(buildBlock(gameBuild(n, enemies), POOL[n].owner === "support" ? names.support : names.adc));
  if (!ours.length) parts.push("<i>Lock your picks (we lulu jinx) to get your exact builds.</i>");
  parts.push("<b>Win plan</b>\n" + bullet(rep.plan));
  return parts.join("\n\n");
}

export function fedCard(enemy: string, ours: string[], names: Names): string {
  const tips = fedAdvice(enemy, ours);
  if (!tips.length) return `Lock your picks first (we lulu jinx), then tell me who is fed.`;
  const lines = [`🔥 <b>${esc(enemy)} is fed</b>`];
  for (const t of tips) {
    const who = POOL[t.champ].owner === "support" ? names.support : names.adc;
    const buy = t.buy ? `Buy next: <b>${esc(t.buy)}</b>${t.alt ? ` (or ${esc(t.alt)})` : ""} · ${esc(t.why)}` : "No item answer; play safer.";
    lines.push(`<b>${esc(who)} (${esc(t.champ)})</b>\n${buy}\n${esc(t.play)}`);
  }
  return lines.join("\n\n");
}

export function duoTable(focus?: string): string {
  const rows: [string, string, number, string][] = [];
  for (const s of SUPPORTS) for (const a of ADCS) rows.push([s, a, ...SYNERGY[s][a]]);
  const filtered = focus ? rows.filter((r) => r[0] === focus || r[1] === focus) : rows;
  filtered.sort((x, y) => y[2] - x[2]);
  const head = focus ? `<b>Duos with ${esc(focus)}</b>` : "<b>All 36 duos, best first</b>";
  const body = filtered.map(([s, a, n, why]) => (focus ? `${"★".repeat(n)} <b>${esc(s)} + ${esc(a)}</b>\n   ${esc(why)}` : `${"★".repeat(n)} ${esc(s)} + ${esc(a)}`));
  return [head, body.join("\n"), focus ? "" : "<i>/duo jinx (or any champ) for the reasons.</i>"].filter(Boolean).join("\n\n");
}

export function bansCard(history: GameRecord[]): string {
  const bans = suggestBans(history);
  return [
    "<b>Ban suggestions</b> (bot laners that counter most of our pool)",
    bans.map((b, i) => `${i + 1}. <b>${esc(b.name)}</b> — ${esc(b.why.join("; "))}`).join("\n"),
    "<i>Ranked Wild Rift bans are per player. Ban what hurts the champs you'll actually play this game.</i>",
  ].join("\n\n");
}

export function statsCard(history: GameRecord[]): string {
  if (!history.length) return "No games yet. After a game tap ✅ Win / ❌ Loss (or /win, /loss).";
  const wr = (l: GameRecord[]) => `${l.filter((g) => g.win).length}W ${l.filter((g) => !g.win).length}L (${Math.round((100 * l.filter((g) => g.win).length) / l.length)}%)`;
  const group = (key: (g: GameRecord) => string | undefined) => {
    const m = new Map<string, GameRecord[]>();
    for (const g of history) {
      const k = key(g);
      if (k) m.set(k, [...(m.get(k) ?? []), g]);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  };
  const last10 = history.slice(-10);
  const streak = (() => {
    let n = 0;
    const last = history[history.length - 1].win;
    for (let i = history.length - 1; i >= 0 && history[i].win === last; i--) n++;
    return `${n} ${last ? "win" : "loss"}${n > 1 ? (last ? "s" : "es") : ""}`;
  })();
  const parts = [
    `<b>Overall:</b> ${wr(history)} · last 10: ${wr(last10)} · streak: ${streak}`,
    "<b>By duo</b>\n" +
      group((g) => `${g.sup} + ${g.adc}`)
        .slice(0, 8)
        .map(([k, l]) => `• ${esc(k)}: ${wr(l)}`)
        .join("\n"),
    "<b>Support</b>\n" + group((g) => g.sup).map(([k, l]) => `• ${esc(k)}: ${wr(l)}`).join("\n"),
    "<b>ADC</b>\n" + group((g) => g.adc).map(([k, l]) => `• ${esc(k)}: ${wr(l)}`).join("\n"),
  ];
  const vs = group((g) => (g.eAdc || g.eSup ? [g.eAdc, g.eSup].filter(Boolean).join(" + ") : undefined)).filter(([, l]) => l.length >= 2);
  const hard = vs.filter(([, l]) => l.filter((g) => !g.win).length > l.length / 2).slice(0, 5);
  if (hard.length) parts.push("<b>Toughest bot lanes</b>\n" + hard.map(([k, l]) => `• vs ${esc(k)}: ${wr(l)}`).join("\n"));
  return parts.join("\n\n");
}

