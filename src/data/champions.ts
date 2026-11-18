// Wild Rift roster (patch 7.3f) with the tags the draft and comp engines read.
// role: main lane. dmg: main damage type. traits (space separated):
//   tank engage dive assassin burst poke heal shield cc stealth mobile
//   scale early peel range split  (heal = healing worth buying anti-heal for)

export type Role = "top" | "jungle" | "mid" | "adc" | "support";
export type Dmg = "AD" | "AP" | "MIX";

export interface Champion {
  name: string;
  role: Role;
  dmg: Dmg;
  traits: Set<string>;
}

const RAW: [string, Role, Dmg, string][] = [
  ["Aatrox", "top", "AD", "dive heal cc"],
  ["Ahri", "mid", "AP", "burst mobile cc assassin"],
  ["Akali", "mid", "AP", "assassin burst mobile stealth"],
  ["Akshan", "mid", "AD", "assassin mobile stealth early"],
  ["Alistar", "support", "AP", "tank engage cc peel heal"],
  ["Ambessa", "top", "AD", "dive mobile heal"],
  ["Amumu", "jungle", "AP", "tank engage cc"],
  ["Annie", "support", "AP", "burst engage cc shield"],
  ["Ashe", "adc", "AD", "cc range scale"],
  ["Aurelion Sol", "mid", "AP", "poke scale"],
  ["Aurora", "mid", "AP", "burst mobile cc"],
  ["Bard", "support", "AP", "cc mobile heal"],
  ["Blitzcrank", "support", "AP", "engage cc tank"],
  ["Brand", "mid", "AP", "poke burst"],
  ["Braum", "support", "AD", "tank peel cc"],
  ["Caitlyn", "adc", "AD", "range poke early"],
  ["Camille", "top", "AD", "dive mobile assassin split"],
  ["Cho'Gath", "top", "AP", "tank cc heal"],
  ["Corki", "mid", "MIX", "poke scale"],
  ["Darius", "top", "AD", "heal cc early"],
  ["Diana", "jungle", "AP", "dive burst engage"],
  ["Dr. Mundo", "top", "AD", "tank heal"],
  ["Draven", "adc", "AD", "early burst"],
  ["Ekko", "mid", "AP", "assassin burst mobile"],
  ["Evelynn", "jungle", "AP", "assassin stealth burst"],
  ["Ezreal", "adc", "AD", "poke mobile"],
  ["Fiddlesticks", "jungle", "AP", "engage cc heal"],
  ["Fiora", "top", "AD", "split heal mobile"],
  ["Fizz", "mid", "AP", "assassin burst mobile"],
  ["Galio", "mid", "AP", "tank engage cc"],
  ["Garen", "top", "AD", "tank heal"],
  ["Gnar", "top", "AD", "cc engage"],
  ["Gragas", "jungle", "AP", "engage cc tank heal"],
  ["Graves", "jungle", "AD", "burst early"],
  ["Gwen", "top", "AP", "dive heal"],
  ["Hecarim", "jungle", "AD", "dive engage heal mobile"],
  ["Heimerdinger", "mid", "AP", "poke cc"],
  ["Hwei", "mid", "AP", "poke cc range"],
  ["Irelia", "top", "AD", "dive heal mobile cc"],
  ["Janna", "support", "AP", "shield peel cc heal"],
  ["Jarvan IV", "jungle", "AD", "engage dive cc"],
  ["Jax", "top", "AD", "dive split"],
  ["Jayce", "top", "AD", "poke early"],
  ["Jhin", "adc", "AD", "range poke cc"],
  ["Jinx", "adc", "AD", "scale range"],
  ["K'Santé", "top", "AD", "tank cc engage"],
  ["Kai'Sa", "adc", "MIX", "dive mobile scale burst"],
  ["Kalista", "adc", "AD", "mobile early engage"],
  ["Karma", "support", "AP", "poke shield"],
  ["Kassadin", "mid", "AP", "assassin mobile scale"],
  ["Katarina", "mid", "AP", "assassin burst mobile"],
  ["Kayle", "top", "MIX", "scale heal"],
  ["Kayn", "jungle", "AD", "assassin dive heal"],
  ["Kennen", "top", "AP", "engage cc burst"],
  ["Kha'Zix", "jungle", "AD", "assassin stealth burst"],
  ["Kindred", "jungle", "AD", "scale mobile"],
  ["Kog'Maw", "adc", "MIX", "scale range"],
  ["Lee Sin", "jungle", "AD", "dive mobile early"],
  ["Leona", "support", "AP", "tank engage cc"],
  ["Lillia", "jungle", "AP", "mobile cc heal"],
  ["Lissandra", "mid", "AP", "engage cc burst"],
  ["Lucian", "adc", "AD", "early mobile burst"],
  ["Lulu", "support", "AP", "shield peel cc"],
  ["Lux", "support", "AP", "poke burst cc shield range"],
  ["Malphite", "top", "AP", "tank engage cc"],
  ["Maokai", "support", "AP", "tank engage cc heal"],
  ["Master Yi", "jungle", "AD", "dive heal scale"],
  ["Mel", "mid", "AP", "poke burst"],
  ["Milio", "support", "AP", "shield heal peel"],
  ["Miss Fortune", "adc", "AD", "early poke burst"],
  ["Mordekaiser", "top", "AP", "heal dive"],
  ["Morgana", "support", "AP", "cc peel shield"],
  ["Nami", "support", "AP", "heal cc early"],
  ["Nasus", "top", "AD", "tank heal scale split"],
  ["Nautilus", "support", "AP", "tank engage cc"],
  ["Nidalee", "jungle", "AP", "poke mobile heal"],
  ["Nilah", "adc", "AD", "dive heal scale"],
  ["Nocturne", "jungle", "AD", "dive engage"],
  ["Norra", "mid", "AP", "poke"],
  ["Nunu & Willump", "jungle", "AP", "tank engage cc heal"],
  ["Olaf", "jungle", "AD", "dive heal"],
  ["Orianna", "mid", "AP", "cc shield scale"],
  ["Ornn", "top", "MIX", "tank engage cc"],
  ["Pantheon", "jungle", "AD", "dive early burst"],
  ["Poppy", "top", "AD", "tank cc peel"],
  ["Pyke", "support", "AD", "assassin engage stealth cc"],
  ["Rakan", "support", "AP", "engage mobile cc heal"],
  ["Rammus", "jungle", "AP", "tank engage cc"],
  ["Rell", "support", "AP", "tank engage cc"],
  ["Renekton", "top", "AD", "dive heal early"],
  ["Rengar", "jungle", "AD", "assassin stealth burst"],
  ["Riven", "top", "AD", "dive mobile burst"],
  ["Rumble", "top", "AP", "burst"],
  ["Ryze", "mid", "AP", "scale"],
  ["Samira", "adc", "AD", "dive mobile burst"],
  ["Senna", "support", "AD", "poke heal range scale"],
  ["Seraphine", "support", "AP", "poke shield heal cc"],
  ["Sett", "top", "AD", "engage tank"],
  ["Shen", "top", "AP", "tank engage peel"],
  ["Shyvana", "jungle", "MIX", "dive"],
  ["Singed", "top", "AP", "tank"],
  ["Sion", "top", "AD", "tank engage cc"],
  ["Sivir", "adc", "AD", "scale"],
  ["Skarner", "jungle", "AD", "tank engage cc"],
  ["Smolder", "adc", "AD", "scale poke"],
  ["Sona", "support", "AP", "heal shield poke"],
  ["Soraka", "support", "AP", "heal peel"],
  ["Swain", "mid", "AP", "heal cc engage"],
  ["Syndra", "mid", "AP", "burst cc"],
  ["Taliyah", "mid", "AP", "poke cc"],
  ["Talon", "jungle", "AD", "assassin burst mobile"],
  ["Teemo", "top", "AP", "poke stealth"],
  ["Thresh", "support", "AP", "engage cc peel"],
  ["Tristana", "adc", "AD", "burst mobile scale"],
  ["Tryndamere", "top", "AD", "split heal"],
  ["Twisted Fate", "mid", "AP", "cc"],
  ["Twitch", "adc", "AD", "stealth scale"],
  ["Urgot", "top", "AD", "tank"],
  ["Varus", "adc", "AD", "poke range cc"],
  ["Vayne", "adc", "AD", "scale mobile"],
  ["Veigar", "mid", "AP", "burst cc scale"],
  ["Vel'Koz", "mid", "AP", "poke range"],
  ["Vex", "mid", "AP", "burst cc"],
  ["Vi", "jungle", "AD", "dive engage cc"],
  ["Viego", "jungle", "AD", "dive heal"],
  ["Viktor", "mid", "AP", "poke scale"],
  ["Vladimir", "mid", "AP", "heal scale"],
  ["Volibear", "top", "MIX", "dive tank"],
  ["Warwick", "jungle", "AD", "dive heal cc"],
  ["Wukong", "jungle", "AD", "engage dive cc"],
  ["Xayah", "adc", "AD", "scale cc"],
  ["Xin Zhao", "jungle", "AD", "dive early heal"],
  ["Yasuo", "mid", "AD", "dive mobile"],
  ["Yone", "mid", "MIX", "dive mobile"],
  ["Yunara", "adc", "AD", "scale mobile"],
  ["Yuumi", "support", "AP", "heal shield"],
  ["Zed", "mid", "AD", "assassin burst mobile"],
  ["Zeri", "adc", "AD", "scale mobile"],
  ["Ziggs", "mid", "AP", "poke range"],
  ["Zilean", "support", "AP", "cc peel"],
  ["Zoe", "mid", "AP", "poke burst"],
  ["Zyra", "support", "AP", "poke cc"],
];

export const CHAMPIONS: Champion[] = RAW.map(([name, role, dmg, traits]) => ({
  name,
  role,
  dmg,
  traits: new Set(traits.split(" ").filter(Boolean)),
}));

const BY_NAME = new Map(CHAMPIONS.map((c) => [c.name, c]));

export function champ(name: string): Champion | undefined {
  return BY_NAME.get(name);
}

// Champions that are commonly played in the bot lane, used for the draft keyboards.
// Mages and a few off-meta picks show up as supports in Wild Rift ranked too.
export const BOT_ADCS = CHAMPIONS.filter((c) => c.role === "adc").map((c) => c.name);
export const BOT_SUPPORTS = [
  ...CHAMPIONS.filter((c) => c.role === "support").map((c) => c.name),
  "Brand",
  "Swain",
  "Vel'Koz",
  "Galio",
  "Shen",
  "Poppy",
].sort();

const ALIASES: Record<string, string> = {
  mf: "Miss Fortune",
  missfortune: "Miss Fortune",
  fortune: "Miss Fortune",
  cait: "Caitlyn",
  kai: "Kai'Sa",
  kaisa: "Kai'Sa",
  ksante: "K'Santé",
  j4: "Jarvan IV",
  jarvan: "Jarvan IV",
  tf: "Twisted Fate",
  mundo: "Dr. Mundo",
  nunu: "Nunu & Willump",
  asol: "Aurelion Sol",
  lee: "Lee Sin",
  yi: "Master Yi",
  naut: "Nautilus",
  blitz: "Blitzcrank",
  sera: "Seraphine",
  seraph: "Seraphine",
  xin: "Xin Zhao",
  kog: "Kog'Maw",
  velkoz: "Vel'Koz",
  cho: "Cho'Gath",
  kha: "Kha'Zix",
  ww: "Warwick",
  voli: "Volibear",
  heimer: "Heimerdinger",
  trynd: "Tryndamere",
  ez: "Ezreal",
  trist: "Tristana",
  morg: "Morgana",
  raka: "Soraka",
  ali: "Alistar",
  panth: "Pantheon",
  fiddle: "Fiddlesticks",
  liss: "Lissandra",
  ori: "Orianna",
  mord: "Mordekaiser",
  malph: "Malphite",
  kass: "Kassadin",
  kat: "Katarina",
  wu: "Wukong",
  // Persian spellings a phone keyboard may produce
  "میس": "Miss Fortune",
  "جینکس": "Jinx",
  "جین": "Jhin",
  "کیتلین": "Caitlyn",
  "زری": "Zeri",
  "سونا": "Sona",
  "یومی": "Yuumi",
  "سرافین": "Seraphine",
  "لولو": "Lulu",
  "لئونا": "Leona",
  "زایرا": "Zyra",
};

export function norm(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "");
}

const NORM_INDEX = new Map<string, string>();
for (const c of CHAMPIONS) NORM_INDEX.set(norm(c.name), c.name);
for (const [k, v] of Object.entries(ALIASES)) NORM_INDEX.set(norm(k), v);

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Resolve one typed name ("mf", "kaisa", "jnx") to a roster name. */
export function findChampion(input: string): string | undefined {
  const q = norm(input);
  if (q.length < 2) return undefined;
  const exact = NORM_INDEX.get(q);
  if (exact) return exact;
  // Unique prefix ("seraph", "zil")
  const prefix = [...NORM_INDEX.entries()].filter(([k]) => k.startsWith(q));
  const prefixNames = new Set(prefix.map(([, v]) => v));
  if (q.length >= 3 && prefixNames.size === 1) return [...prefixNames][0];
  // Small typo
  let best: string | undefined;
  let bestD = Infinity;
  for (const [k, v] of NORM_INDEX) {
    const d = editDistance(q, k);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  const allowed = q.length <= 3 ? 0 : q.length <= 5 ? 1 : 2;
  return bestD <= allowed ? best : undefined;
}

/**
 * Pull every champion out of free text such as "vs kaisa naut" or
 * "Ahri, Lee Sin, Jinx, Thresh, Darius". Multi-word names are tried first.
 */
export function parseChampions(text: string): { found: string[]; unknown: string[] } {
  const tokens = text
    .split(/[\s,;/|+]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const found: string[] = [];
  const unknown: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (const span of [3, 2]) {
      if (i + span > tokens.length) continue;
      const joined = tokens.slice(i, i + span).join(" ");
      const exact = NORM_INDEX.get(norm(joined));
      if (exact) {
        found.push(exact);
        i += span;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const one = findChampion(tokens[i]);
    if (one) found.push(one);
    else unknown.push(tokens[i]);
    i++;
  }
  return { found: [...new Set(found)], unknown };
}
