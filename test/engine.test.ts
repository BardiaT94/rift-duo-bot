// Run: npm test   (plain Node, no test framework)

import assert from "node:assert/strict";
import { BOT_ADCS, BOT_SUPPORTS, champ, findChampion, parseChampions } from "../src/data/champions.ts";
import { ADCS, POOL, SUPPORTS, SYNERGY } from "../src/data/pool.ts";
import { THREATS } from "../src/data/threats.ts";
import { analyzeComp, fedAdvice, gameBuild } from "../src/engine/comp.ts";
import { deflateSync } from "node:zlib";
import { DRAFT_HTML, draftState, TIMER_HTML, timerState } from "../src/widgets.ts";
import { bestFor, recommend, suggestBans, type GameRecord } from "../src/engine/draft.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`ok - ${name}`);
}

test("every matchup and threat name is a real champion", () => {
  for (const c of Object.values(POOL)) {
    for (const n of [...Object.keys(c.good), ...Object.keys(c.bad)]) assert.ok(champ(n), `${c.name}: unknown ${n}`);
    for (const n of Object.keys(c.good)) assert.ok(!c.bad[n], `${c.name}: ${n} is both good and bad`);
  }
  for (const n of Object.keys(THREATS)) assert.ok(champ(n), `threats: unknown ${n}`);
  for (const n of [...BOT_ADCS, ...BOT_SUPPORTS]) assert.ok(champ(n), `keyboard: unknown ${n}`);
});

test("synergy table covers all 36 duos", () => {
  assert.equal(SUPPORTS.length, 6);
  assert.equal(ADCS.length, 6);
  for (const s of SUPPORTS) for (const a of ADCS) assert.ok(SYNERGY[s]?.[a], `missing ${s}+${a}`);
});

test("callback data fits Telegram's 64-byte limit", () => {
  for (const s of SUPPORTS) for (const a of ADCS) assert.ok(new TextEncoder().encode(`lk:${s}:${a}`).length <= 64);
  assert.ok(BOT_SUPPORTS.length < 100 && BOT_ADCS.length < 100);
});

test("name parsing handles aliases, typos and multi-word names", () => {
  assert.equal(findChampion("mf"), "Miss Fortune");
  assert.equal(findChampion("kaisa"), "Kai'Sa");
  assert.equal(findChampion("naut"), "Nautilus");
  assert.equal(findChampion("seraph"), "Seraphine");
  assert.equal(findChampion("caitlin"), "Caitlyn");
  assert.equal(findChampion("vs"), undefined);
  assert.equal(findChampion("we"), undefined);
  assert.deepEqual(parseChampions("miss fortune, lee sin").found, ["Miss Fortune", "Lee Sin"]);
  assert.deepEqual(parseChampions("ahri lee jinx thresh darius").found, ["Ahri", "Lee Sin", "Jinx", "Thresh", "Darius"]);
  assert.deepEqual(parseChampions("جینکس سونا").found, ["Jinx", "Sona"]);
});

test("recommendation avoids bad matchups", () => {
  const vsBlitzDraven = recommend({ eAdc: "Draven", eSup: "Blitzcrank" }, 30);
  const sonaJinx = vsBlitzDraven.findIndex((p) => p.sup === "Sona" && p.adc === "Jinx");
  const top = vsBlitzDraven[0];
  assert.ok(sonaJinx > 5, `Sona+Jinx should rank low vs Draven/Blitz (rank ${sonaJinx})`);
  assert.ok(top.score > vsBlitzDraven[vsBlitzDraven.length - 1].score);
  console.log(`   vs Draven+Blitz top: ${top.sup}+${top.adc} (${top.score})`);
});

test("locked ADC returns supports for that ADC only", () => {
  const picks = bestFor("support", { lockedAdc: "Jinx", eAdc: "Samira", eSup: "Rakan" });
  assert.ok(picks.every((p) => p.adc === "Jinx"));
  assert.equal(new Set(picks.map((p) => p.sup)).size, picks.length);
  assert.equal(picks[0].sup, "Lulu", "Lulu should be best for Jinx vs Samira/Rakan");
});

test("enemy picks and bans are excluded", () => {
  const picks = recommend({ eAdc: "Jinx", eSup: "Lulu", bans: ["Caitlyn"] }, 30);
  assert.ok(picks.every((p) => p.adc !== "Jinx" && p.sup !== "Lulu" && p.adc !== "Caitlyn"));
});

test("personal results move rankings", () => {
  const history: GameRecord[] = Array.from({ length: 10 }, (_, i) => ({ ts: i, sup: "Yuumi", adc: "Miss Fortune", win: true }));
  const before = recommend({}, 40).findIndex((p) => p.sup === "Yuumi" && p.adc === "Miss Fortune");
  const after = recommend({ history }, 40).findIndex((p) => p.sup === "Yuumi" && p.adc === "Miss Fortune");
  assert.ok(after < before, `${after} should be < ${before}`);
});

test("comp analysis flags heal, tanks, assassins", () => {
  const rep = analyzeComp(["Soraka", "Malphite", "Zed", "Amumu", "Jinx"]);
  assert.ok(rep.flags.includes("antiHeal"));
  assert.ok(rep.flags.includes("vsTanks"));
  assert.ok(rep.flags.includes("vsADBurst"));
});

test("game build swaps items in, keeps the core, and stays at 5 items", () => {
  const b = gameBuild("Caitlyn", ["Soraka", "Malphite", "Zed", "Amumu", "Jinx"]);
  assert.equal(b.items.length, 5);
  assert.equal(new Set(b.items).size, 5);
  assert.equal(b.variant.name, "Safety");
  assert.ok(b.items.includes("Mortal Reminder"));
  assert.ok(b.items.includes("Guardian Angel"));
  assert.equal(b.items[0], "Infinity Edge");
  assert.ok(b.swaps.length <= 2);
  console.log(`   Caitlyn: ${b.items.join(" > ")} | ${b.timing ?? ""}`);
  for (const c of Object.keys(POOL)) {
    const g = gameBuild(c, ["Zed", "Soraka", "Lulu", "Malphite", "Ahri"]);
    assert.equal(g.items.length, 5, c);
    assert.equal(new Set(g.items).size, 5, `${c} has a duplicate item: ${g.items}`);
  }
  const plain = gameBuild("Jinx", ["Jayce", "Graves", "Twisted Fate", "Ezreal", "Bard"]);
  assert.equal(plain.swaps.length, 0);
});

test("fed advice gives an item for each of us", () => {
  const tips = fedAdvice("Zed", ["Lulu", "Jinx"]);
  assert.equal(tips.length, 2);
  assert.equal(tips.find((t) => t.champ === "Jinx")?.buy, "Guardian Angel");
  assert.equal(fedAdvice("Soraka", ["Sona"])[0].buy, "Morellonomicon");
});

test("widgets fit Telegram's limits", () => {
  for (const [name, html] of [["draft", DRAFT_HTML], ["timer", TIMER_HTML]]) {
    const z = deflateSync(html, { level: 9 }).length;
    assert.ok(Buffer.byteLength(html) <= 32768 && z <= 4096, `${name}: ${z} bytes compressed`);
    assert.ok(!html.includes("\0"));
  }
  const g = { eAdc: "Kai'Sa", eSup: "Nautilus", enemies: [], allies: [], bans: [], startedAt: 0 };
  const st = draftState(g, recommend({ eAdc: "Kai'Sa", eSup: "Nautilus" }, 3), 7);
  assert.ok(new TextEncoder().encode(st).length <= 1024);
  const parsed = JSON.parse(st);
  assert.equal(parsed.r, 7);
  assert.equal(parsed.p.length, 3);
  assert.ok(timerState([{ id: "x", label: "ADC Flash", due: 123 }], 1).includes('["af",123]'));
});

test("ban suggestions are sensible", () => {
  const bans = suggestBans();
  assert.equal(bans.length, 5);
  console.log(`   bans: ${bans.map((b) => b.name).join(", ")}`);
});

console.log(`\n${passed} tests passed`);
