// Enemy team analysis, the full build for this game, and "who's fed, what do I buy".

import { champ, type Champion } from "../data/champions.ts";
import { POOL, type Build, type Situation } from "../data/pool.ts";

export const SITUATION_LABEL: Record<Situation, string> = {
  antiHeal: "Anti-heal",
  vsTanks: "Vs tanks",
  vsADBurst: "Vs AD burst",
  vsAPBurst: "Vs AP burst",
  vsCC: "Vs CC",
  vsMobile: "Vs mobility",
  antiShield: "Anti-shield",
  vsDive: "Vs dive",
};

export interface CompReport {
  profile: string[];
  flags: Situation[];
  /** Which enemy champions triggered each flag */
  causes: Partial<Record<Situation, string[]>>;
  ad: number;
  ap: number;
  watch: string[];
  plan: string[];
}

const STRONG_HEAL = new Set(["Soraka", "Yuumi", "Aatrox", "Vladimir", "Dr. Mundo", "Sona", "Nami", "Milio", "Warwick", "Fiora", "Swain", "Senna", "Nilah", "Olaf", "Master Yi"]);
const MUST_ANTIHEAL = ["Soraka", "Yuumi", "Vladimir", "Aatrox", "Dr. Mundo"];
const BIG_SHIELDS = ["Lulu", "Janna", "Karma", "Milio", "Yuumi", "Seraphine", "Orianna"];

const names = (list: Champion[]) => list.map((c) => c.name);

export function analyzeComp(enemies: string[]): CompReport {
  const cs = enemies.map((n) => champ(n)).filter(Boolean) as Champion[];
  const has = (t: string) => cs.filter((c) => c.traits.has(t));
  const ad = cs.filter((c) => c.dmg === "AD").length;
  const ap = cs.filter((c) => c.dmg === "AP").length;
  const mix = cs.length - ad - ap;

  const causes: Partial<Record<Situation, string[]>> = {};
  const flag = (f: Situation, list: Champion[]) => (causes[f] = names(list));

  const heal = cs.filter((c) => STRONG_HEAL.has(c.name) || c.traits.has("heal"));
  if (heal.length >= 2 || heal.some((c) => MUST_ANTIHEAL.includes(c.name))) flag("antiHeal", heal);
  const tanks = has("tank");
  if (tanks.length >= 2) flag("vsTanks", tanks);
  const adBurst = cs.filter((c) => (c.traits.has("assassin") || c.traits.has("burst")) && c.dmg !== "AP");
  const apBurst = cs.filter((c) => (c.traits.has("assassin") || c.traits.has("burst")) && c.dmg === "AP");
  if (adBurst.length >= 2 || adBurst.some((c) => c.traits.has("assassin"))) flag("vsADBurst", adBurst);
  if (apBurst.length >= 2 || apBurst.some((c) => c.traits.has("assassin"))) flag("vsAPBurst", apBurst);
  const cc = has("cc");
  if (cc.length >= 3) flag("vsCC", cc);
  const mobile = has("mobile");
  if (mobile.length >= 3) flag("vsMobile", mobile);
  const shields = has("shield");
  if (shields.length >= 2 || shields.some((c) => BIG_SHIELDS.includes(c.name))) flag("antiShield", shields);
  const divers = cs.filter((c) => c.traits.has("dive") || c.traits.has("assassin"));
  if (divers.length >= 2) flag("vsDive", divers);

  const profile: string[] = [];
  const dmgLine = `Damage: ${ad} AD · ${ap} AP${mix ? ` · ${mix} mixed` : ""}`;
  if (ad >= 4) profile.push(`${dmgLine} → heavy AD: armor pays off`);
  else if (ap >= 4) profile.push(`${dmgLine} → heavy AP: magic resist pays off`);
  else profile.push(`${dmgLine} → mixed`);
  if (heal.length) profile.push(`Healing: ${names(heal).join(", ")}`);
  if (tanks.length) profile.push(`Tanks: ${names(tanks).join(", ")}`);
  if (divers.length) profile.push(`Divers/assassins: ${names(divers).join(", ")}`);
  if (cc.length) profile.push(`Hard CC: ${names(cc).join(", ")}`);
  const poke = has("poke");
  if (poke.length) profile.push(`Poke: ${names(poke).join(", ")}`);

  const watch: string[] = [];
  const stealth = has("stealth");
  if (stealth.length) watch.push(`Invisible threats (${names(stealth).join(", ")}): buy a Control Ward each back and keep it near your ADC.`);
  for (const c of cs.filter((c) => c.traits.has("assassin"))) watch.push(`${c.name} wants to kill your ADC. Support: keep your peel/CC for them, not for poke.`);
  const engagers = has("engage");
  if (engagers.length >= 2) watch.push(`Hard engage team (${names(engagers).join(", ")}): fight spread out and never face-check bushes.`);
  if (cs.some((c) => c.name === "Samira" || c.name === "Yasuo")) watch.push("Windwall: it blocks Jinx rockets/R, MF R, Jhin W/R and Caitlyn Q. Wait for it to drop.");
  if (cs.some((c) => c.name === "Mel")) watch.push("Mel's W reflects projectiles. Don't fire ults into it.");
  if (cs.some((c) => c.name === "Zilean")) watch.push("Zilean can revive his carry: hold some damage for the second life.");

  const plan: string[] = [];
  if (has("early").length >= 2) plan.push("They are strong early: play safe until your item spikes; trade objectives, don't coin-flip fights.");
  if (has("scale").length >= 2) plan.push("They scale: use your early pressure (dragons, towers) before their carries come online.");
  if (poke.length >= 2) plan.push("Poke comp: engage fast or flank; don't sit in front of them under poke.");
  if (divers.length >= 2) plan.push("Dive comp: your ADC plays at max range behind the team; your support peels instead of engaging.");
  if (!plan.length) plan.push("Balanced comp: play around your level 2/5 spikes and your first item timings.");

  return { profile, flags: Object.keys(causes) as Situation[], causes, ad, ap, watch, plan };
}

// Order in which threats claim the flexible build slots.
const PRIORITY: Situation[] = ["antiHeal", "vsADBurst", "vsAPBurst", "vsDive", "vsCC", "antiShield", "vsMobile", "vsTanks"];
const MAX_SWAPS = 2;
const BOOTS = /Treads|Steelcaps|Greaves|Boots/;

export interface Swap {
  out?: string;
  in: string;
  alt?: string;
  why: string;
}

export interface GameBuild {
  champ: string;
  variant: Build;
  boots: string;
  bootsWhy?: string;
  items: string[];
  swaps: Swap[];
  /** Advice on when to buy the first swap */
  timing?: string;
}

/** The full 5-item build plus boots for one of our champions against this enemy team. */
export function gameBuild(ourChamp: string, enemies: string[]): GameBuild {
  const c = POOL[ourChamp];
  const rep = analyzeComp(enemies);
  const f = new Set(rep.flags);

  const variant =
    (f.has("vsDive") || f.has("vsADBurst") ? c.builds.find((b) => /safety|protect|dive/i.test(b.name + b.when)) : undefined) ??
    (f.has("vsTanks") ? c.builds.find((b) => /tank|front/i.test(b.name + b.when)) : undefined) ??
    c.builds[0];
  const items = [...variant.items];
  const fixed = 2; // first two items are the core: never swapped
  const swapped = new Set<number>();
  const swaps: Swap[] = [];
  let boots = c.boots.replace(/\s*\(.*\)$/, "");
  let bootsWhy: string | undefined;

  for (const flag of PRIORITY) {
    if (!f.has(flag) || swaps.length >= MAX_SWAPS) continue;
    const s = c.situational[flag];
    if (!s) continue;
    const why = `${SITUATION_LABEL[flag]}: ${(rep.causes[flag] ?? []).join(", ")}`;
    if (BOOTS.test(s.item)) {
      boots = s.item;
      bootsWhy = why;
      continue;
    }
    if (items.includes(s.item)) {
      // Already in the build and needed: protect it from later swaps.
      swapped.add(items.indexOf(s.item));
      continue;
    }
    let slot = s.replaces ? items.indexOf(s.replaces) : -1;
    if (slot < fixed || swapped.has(slot)) {
      slot = -1;
      for (let i = items.length - 1; i >= fixed; i--) {
        if (!swapped.has(i)) {
          slot = i;
          break;
        }
      }
    }
    if (slot < 0) continue;
    swaps.push({ out: items[slot], in: s.item, alt: s.alt, why });
    items[slot] = s.item;
    swapped.add(slot);
  }

  // Boots from the damage mix when no threat already picked them.
  if (!bootsWhy) {
    if (c.owner === "support" && c.name === "Leona") {
      if (rep.ad >= 4) [boots, bootsWhy] = ["Plated Steelcaps", "mostly AD enemies"];
      else if (rep.ap >= 3) [boots, bootsWhy] = ["Mercury's Treads", "lots of AP and CC"];
    } else if (c.owner === "adc" && rep.ap >= 4 && f.has("vsCC")) {
      [boots, bootsWhy] = ["Mercury's Treads", "heavy AP with lots of CC"];
    }
  }

  // Move the most urgent swap up to the 3rd slot.
  let timing: string | undefined;
  const urgent = swaps.find((s) => /Anti-heal: .*(Soraka|Yuumi|Vladimir|Aatrox|Dr\. Mundo)|AD burst|AP burst/.test(s.why));
  if (urgent) {
    const from = items.indexOf(urgent.in);
    if (from > fixed) {
      items.splice(from, 1);
      items.splice(fixed, 0, urgent.in);
    }
    timing = `Buy ${urgent.in} 3rd (2nd if they get fed).`;
  }

  return { champ: ourChamp, variant, boots, bootsWhy, items, swaps, timing };
}

export interface FedTip {
  champ: string;
  buy?: string;
  alt?: string;
  why: string;
  play: string;
}

/** What each of us should buy next and how to play when one enemy gets fed. */
export function fedAdvice(enemy: string, ours: string[]): FedTip[] {
  const e = champ(enemy);
  if (!e) return [];
  const t = e.traits;
  const order: Situation[] = [];
  if (t.has("heal")) order.push("antiHeal");
  if ((t.has("assassin") || t.has("burst")) && e.dmg !== "AP") order.push("vsADBurst");
  if ((t.has("assassin") || t.has("burst")) && e.dmg === "AP") order.push("vsAPBurst");
  if (t.has("dive")) order.push("vsDive");
  if (t.has("tank")) order.push("vsTanks");
  if (t.has("cc")) order.push("vsCC");
  if (t.has("mobile")) order.push("vsMobile");
  if (t.has("shield")) order.push("antiShield");
  if (!order.length) order.push(e.dmg === "AP" ? "vsAPBurst" : "vsADBurst");

  return ours
    .filter((n) => POOL[n])
    .map((n) => {
      const c = POOL[n];
      const flag = order.find((o) => c.situational[o]);
      const s = flag ? c.situational[flag] : undefined;
      const isSup = c.owner === "support";
      const play = t.has("assassin") || t.has("dive")
        ? isSup
          ? `Stay next to your ADC and save your CC/peel for ${enemy}.`
          : `Play behind your support; never be the first one ${enemy} can reach.`
        : t.has("tank")
          ? isSup
            ? `Don't trade with ${enemy}; peel the real damage dealers.`
            : `Hit whoever is closest; don't chase past ${enemy}.`
          : isSup
            ? `Look for picks on ${enemy} with your ADC; ward their path.`
            : `Respect ${enemy}'s range; fight only with your support nearby.`;
      return { champ: n, buy: s?.item, alt: s?.alt, why: flag ? SITUATION_LABEL[flag] : "", play };
    });
}
