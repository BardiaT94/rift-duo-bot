// Duo recommendation and ban suggestions.
// Score = synergy + matchups vs the known enemy bot lane + blind safety + your own results.

import { champ } from "../data/champions.ts";
import { ADCS, POOL, SUPPORTS, SYNERGY } from "../data/pool.ts";

export interface GameRecord {
  ts: number;
  sup: string;
  adc: string;
  eAdc?: string;
  eSup?: string;
  win: boolean;
}

export interface DraftInput {
  eAdc?: string;
  eSup?: string;
  enemies?: string[];
  lockedSup?: string;
  lockedAdc?: string;
  bans?: string[];
  history?: GameRecord[];
}

export interface Pick {
  sup: string;
  adc: string;
  score: number;
  reasons: string[];
  warnings: string[];
}

/** Bayesian-smoothed win rate bonus: 5 virtual games at 50%. Range about -1.5..+1.5 */
export function personalBonus(history: GameRecord[] | undefined, sup: string, adc: string): { bonus: number; note?: string } {
  if (!history?.length) return { bonus: 0 };
  const games = history.filter((g) => g.sup === sup && g.adc === adc);
  if (!games.length) return { bonus: 0 };
  const wins = games.filter((g) => g.win).length;
  const wr = (wins + 2.5) / (games.length + 5);
  return {
    bonus: (wr - 0.5) * 6,
    note: `your record: ${wins}W ${games.length - wins}L`,
  };
}

function vsScore(ours: string, enemy: string | undefined): { v: number; reason?: string; warn?: string } {
  if (!enemy) return { v: 0 };
  const c = POOL[ours];
  if (c.good[enemy]) return { v: 1.5, reason: `${ours} vs ${enemy}: ${c.good[enemy]}` };
  if (c.bad[enemy]) return { v: -1.5, warn: `${ours} vs ${enemy}: ${c.bad[enemy]}` };
  return { v: 0 };
}

/** Trait-level rules when there's no explicit matchup note. */
function traitScore(ours: string, enemy: string | undefined): { v: number; reason?: string; warn?: string } {
  if (!enemy) return { v: 0 };
  const e = champ(enemy);
  if (!e) return { v: 0 };
  const c = POOL[ours];
  if (c.good[enemy] || c.bad[enemy]) return { v: 0 };
  const t = e.traits;
  if (ours === "Leona" && !t.has("mobile") && e.role === "adc") return { v: 0.5, reason: `Leona can lock down immobile ${enemy}` };
  if ((ours === "Sona" || ours === "Yuumi") && t.has("engage")) return { v: -0.7, warn: `${ours} is weak to ${enemy}'s engage` };
  if (ours === "Lulu" && (t.has("dive") || t.has("engage"))) return { v: 0.5, reason: `Lulu peel answers ${enemy}'s engage` };
  if (ours === "Zyra" && e.role === "support" && t.has("tank")) return { v: 0.5, reason: `Zyra plants punish melee ${enemy}` };
  if ((ours === "Jinx" || ours === "Zeri") && t.has("early")) return { v: -0.5, warn: `${ours} is weak early vs ${enemy}` };
  if (ours === "Caitlyn" && e.role === "adc" && !t.has("range") && !t.has("mobile")) return { v: 0.5, reason: `Caitlyn out-ranges ${enemy}` };
  return { v: 0 };
}

export function recommend(input: DraftInput, limit = 3): Pick[] {
  const banned = new Set(input.bans ?? []);
  const taken = new Set([...(input.enemies ?? []), input.eAdc, input.eSup].filter(Boolean) as string[]);
  const sups = input.lockedSup ? [input.lockedSup] : SUPPORTS.filter((s) => !banned.has(s) && !taken.has(s));
  const adcs = input.lockedAdc ? [input.lockedAdc] : ADCS.filter((a) => !banned.has(a) && !taken.has(a));
  const blind = !input.eAdc && !input.eSup;
  const picks: Pick[] = [];

  for (const sup of sups) {
    for (const adc of adcs) {
      const [syn, synNote] = SYNERGY[sup][adc];
      let score = syn * 1.2;
      const reasons = [`Synergy ${syn}/5: ${synNote}`];
      const warnings: string[] = [];
      for (const ours of [sup, adc]) {
        for (const enemy of [input.eAdc, input.eSup]) {
          for (const r of [vsScore(ours, enemy), traitScore(ours, enemy)]) {
            score += r.v;
            if (r.reason) reasons.push(r.reason);
            if (r.warn) warnings.push(r.warn);
          }
        }
      }
      if (blind) {
        const safety = POOL[sup].blind + POOL[adc].blind;
        score += safety * 0.4;
        if (safety >= 4) reasons.push("Safe blind pick: few hard counters");
        if (safety <= 1) warnings.push("Risky blind: easy to counter-pick");
      }
      const p = personalBonus(input.history, sup, adc);
      score += p.bonus;
      if (p.note) (p.bonus >= 0 ? reasons : warnings).push(p.note);
      picks.push({ sup, adc, score: Math.round(score * 10) / 10, reasons, warnings });
    }
  }
  picks.sort((a, b) => b.score - a.score);
  return picks.slice(0, limit);
}

/** Best support for each ADC (or best ADC for each support) in a single side's view. */
export function bestFor(role: "support" | "adc", input: DraftInput): Pick[] {
  return recommend(input, 30).filter((p, i, all) => {
    const key = role === "support" ? p.sup : p.adc;
    return all.findIndex((q) => (role === "support" ? q.sup : q.adc) === key) === i;
  });
}

/**
 * Ban suggestions: enemy bot laners that hurt the most of our pool,
 * weighted toward the champions we actually play most.
 */
export function suggestBans(history?: GameRecord[], limit = 5): { name: string; score: number; why: string[] }[] {
  const playCount = new Map<string, number>();
  for (const g of history ?? []) {
    playCount.set(g.sup, (playCount.get(g.sup) ?? 0) + 1);
    playCount.set(g.adc, (playCount.get(g.adc) ?? 0) + 1);
  }
  const lossesVs = new Map<string, number>();
  for (const g of history ?? []) {
    if (g.win) continue;
    for (const e of [g.eAdc, g.eSup]) if (e) lossesVs.set(e, (lossesVs.get(e) ?? 0) + 1);
  }
  const tally = new Map<string, { score: number; why: string[] }>();
  for (const c of Object.values(POOL)) {
    const weight = 1 + Math.min(playCount.get(c.name) ?? 0, 10) / 5;
    for (const enemy of Object.keys(c.bad)) {
      const t = tally.get(enemy) ?? { score: 0, why: [] };
      t.score += weight;
      t.why.push(c.name);
      tally.set(enemy, t);
    }
  }
  for (const [enemy, n] of lossesVs) {
    const t = tally.get(enemy) ?? { score: 0, why: [] };
    t.score += n * 1.5;
    tally.set(enemy, t);
  }
  return [...tally.entries()]
    .filter(([name]) => !POOL[name])
    .map(([name, t]) => ({
      name,
      score: Math.round(t.score * 10) / 10,
      why: [
        t.why.length ? `counters ${t.why.join(", ")}` : "",
        lossesVs.get(name) ? `you lost ${lossesVs.get(name)}× vs them` : "",
      ].filter(Boolean),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
