// Guide data for our champion pool.
// Builds and runes: wildriftcore.com and wr-meta.com, patch 7.3f (Nov 2026, CN-server data).
// Matchup and synergy calls are lane heuristics; the bot blends in your own results over time.
// When a patch changes things, use /note <champ> <text> in Telegram or edit this file.

export const PATCH = "7.3f";

export type Situation =
  | "antiHeal"
  | "vsTanks"
  | "vsADBurst"
  | "vsAPBurst"
  | "vsCC"
  | "vsMobile"
  | "antiShield"
  | "vsDive";

export interface SituationalItem {
  item: string;
  /** Second choice, shown next to the main pick */
  alt?: string;
  /** Item in the base build that this one should replace */
  replaces?: string;
}

export interface Build {
  name: string;
  when: string;
  items: string[];
}

export interface PoolChamp {
  name: string;
  owner: "support" | "adc";
  style: string;
  /** 0-3: how safe this pick is when the enemy bot lane is unknown */
  blind: number;
  spells: string;
  runes: string;
  skills: string;
  boots: string;
  builds: Build[];
  situational: Partial<Record<Situation, SituationalItem>>;
  combos: string[];
  spikes: string[];
  lane: string[];
  fights: string[];
  good: Record<string, string>;
  bad: Record<string, string>;
}

export const POOL: Record<string, PoolChamp> = {
  // ───────────────────────── SUPPORTS ─────────────────────────
  Sona: {
    name: "Sona",
    owner: "support",
    style: "Poke-and-sustain enchanter. Weak early in a brawl, huge in teamfights after level 5 (Crescendo).",
    blind: 1,
    spells: "Flash + Heal (Exhaust vs assassins or all-in lanes)",
    runes: "Fleet Footwork · Font of Life · Bone Plating · Revitalize · Transcendence (Aery for more poke)",
    skills: "Max Q for poke lanes, W for sustain lanes, then the other; E last. R at every chance.",
    boots: "Ionian Boots of Lucidity (or Boots of Mana)",
    builds: [
      { name: "Standard", when: "most games", items: ["Black Mist Scythe", "Ardent Censer", "Staff of Flowing Water", "Harmonic Echo", "Redemption"] },
      { name: "Echoes", when: "your ADC is on-hit or you are ahead", items: ["Black Mist Scythe", "Echoes of Helia", "Ardent Censer", "Harmonic Echo", "Mikael's Blessing"] },
      { name: "Tempo", when: "2+ allied engagers, you want to run them down", items: ["Black Mist Scythe", "Shurelya's Battlesong", "Ardent Censer", "Harmonic Echo", "Staff of Flowing Water"] },
    ],
    situational: {
      antiHeal: { item: "Morellonomicon" },
      vsTanks: { item: "Liandry's Torment" },
      vsADBurst: { item: "Zhonya's Hourglass" },
      vsAPBurst: { item: "Banshee's Veil" },
      vsCC: { item: "Mikael's Blessing" },
      vsMobile: { item: "Rylai's Crystal Scepter" },
      antiShield: { item: "Oceanid's Trident" },
      vsDive: { item: "Mikael's Blessing", alt: "Redemption" },
    },
    combos: [
      "Power Chord: every 3rd spell empowers your next auto. Q→W→E→auto, then Q-auto again.",
      "Q-auto trade: Q (both targets), walk up, Power Chord auto, walk out. Repeat on cooldown.",
      "Flash-Crescendo: E for speed → Flash → R into 2+ champs → Q → W. Ping your ADC first.",
    ],
    spikes: ["Lv2 (Q+W): small trade window", "Lv5 Crescendo: teamfight spike", "Black Mist Scythe done + Ardent Censer"],
    lane: [
      "You lose hard all-ins early. Stand behind your ADC and outside hook range.",
      "Win by Q-auto poke and W-healing back through trades.",
      "Hold Heal/Exhaust for their all-in, not for poke.",
    ],
    fights: [
      "Crescendo the frontline when they dive your ADC, or the backline when we engage.",
      "Stay in aura range of your ADC. W right after they burst your ADC.",
    ],
    good: {
      Yuumi: "she can't stop your poke and gives no kill threat",
      Soraka: "you out-poke her, she can't punish",
      Karma: "you trade evenly and win teamfights after 5",
      Seraphine: "similar range; you win late with Crescendo",
      Janna: "low kill threat lane, scaling vs scaling",
    },
    bad: {
      Blitzcrank: "one hook on you = dead. Stand behind minions",
      Nautilus: "point-and-click R and hook. Respect level 2 and 5",
      Leona: "she all-ins you through heals",
      Pyke: "hook + execute; you are his favorite target",
      Thresh: "hook and flay; you can't escape",
      Zyra: "plants out-damage your heals and zone you",
      Brand: "out-poke and burst you",
      Draven: "ADC all-in kills you before heals matter",
    },
  },

  Yuumi: {
    name: "Yuumi",
    owner: "support",
    style: "Attached enchanter: heals, speed and attack speed on your ADC. Weakest lane, strongest scaling with a mobile ADC.",
    blind: 0,
    spells: "Heal + Exhaust (Ignite if your ADC wants kills early). No Flash needed.",
    runes: "Summon Aery · Axiom Arcanist · Transcendence · Scorch · Revitalize",
    skills: "Max Q → E → W. R at every chance.",
    boots: "Ionian Boots of Lucidity",
    builds: [
      { name: "Standard", when: "most games", items: ["Black Mist Scythe", "Ardent Censer", "Mikael's Blessing", "Harmonic Echo", "Staff of Flowing Water"] },
      { name: "Poke", when: "lane is passive and you want damage", items: ["Black Mist Scythe", "Imperial Mandate", "Ardent Censer", "Harmonic Echo", "Staff of Flowing Water"] },
      { name: "Tempo", when: "2+ allied engagers", items: ["Black Mist Scythe", "Shurelya's Battlesong", "Ardent Censer", "Harmonic Echo", "Staff of Flowing Water"] },
    ],
    situational: {
      antiHeal: { item: "Morellonomicon" },
      vsTanks: { item: "Liandry's Torment" },
      vsADBurst: { item: "Zhonya's Hourglass", replaces: "Mikael's Blessing" },
      vsAPBurst: { item: "Banshee's Veil" },
      vsCC: { item: "Mikael's Blessing" },
      vsMobile: { item: "Rylai's Crystal Scepter" },
      antiShield: { item: "Oceanid's Trident" },
      vsDive: { item: "Mikael's Blessing" },
    },
    combos: [
      "Detach to auto once for the passive shield (Bop 'n' Block), then re-attach. Only when safe.",
      "Q while attached: hold to steer, max range for bonus damage and slow.",
      "R (Final Chapter) + your ADC all-in: R roots after 3 hits; aim it over your ADC's target.",
    ],
    spikes: ["Lv5 Final Chapter", "Black Mist Scythe + Ardent Censer", "your ADC's 2-item spike"],
    lane: [
      "Lane is 1v2 for the enemy. Play for farm, not kills, unless your ADC is a bully (Caitlyn/MF).",
      "Save E heal for after their trade, not before.",
      "Exhaust their all-in starter (Draven/Samira/Leona) early.",
    ],
    fights: [
      "Stay on your ADC. If your ADC gets hard-engaged: E + Exhaust + R on the diver.",
      "Swap to a frontliner only if your ADC is dead or fully safe.",
    ],
    good: {
      Soraka: "slow sustain lane where your scaling wins",
      Lux: "poke lane you can heal through",
      Karma: "heal through her poke",
      Sona: "two scaling lanes; your ADC gets more value",
      Senna: "you heal through her poke and scale better",
    },
    bad: {
      Leona: "she locks your ADC down and you can't stop it",
      Nautilus: "point-and-click all-in on your ADC",
      Blitzcrank: "pull + 2v1",
      Pyke: "he executes your ADC through heals",
      Draven: "kills your ADC before heals land",
      Samira: "all-in burst; windwall eats your Q",
      Lucian: "early burst and dash pressure",
      Nilah: "she wins every extended fight early",
      Kalista: "level 2-3 all-in, rend stacks",
      Zyra: "plant poke + root out-damage your heals",
    },
  },

  Seraphine: {
    name: "Seraphine",
    owner: "support",
    style: "Poke mage with team shield/heal and long-range CC. Safe, flexible, great teamfight ult.",
    blind: 2,
    spells: "Flash + Exhaust (Heal vs poke)",
    runes: "Summon Aery · Botanist · Transcendence · Scorch · Bone Plating",
    skills: "Max Q → E → W. R at every chance.",
    boots: "Boots of Mana",
    builds: [
      { name: "Standard", when: "most games", items: ["Black Mist Scythe", "Rylai's Crystal Scepter", "Mikael's Blessing", "Imperial Mandate", "Staff of Flowing Water"] },
      { name: "Poke", when: "2+ poke champions or enemy tanks", items: ["Black Mist Scythe", "Staff of Flowing Water", "Imperial Mandate", "Ardent Censer", "Redemption"] },
      { name: "Tempo", when: "2+ allied engagers, no enemy tank", items: ["Black Mist Scythe", "Shurelya's Battlesong", "Staff of Flowing Water", "Ardent Censer", "Whispering Circlet"] },
    ],
    situational: {
      antiHeal: { item: "Morellonomicon" },
      vsTanks: { item: "Liandry's Torment" },
      vsADBurst: { item: "Zhonya's Hourglass", replaces: "Mikael's Blessing" },
      vsAPBurst: { item: "Banshee's Veil" },
      vsCC: { item: "Mikael's Blessing" },
      vsMobile: { item: "Rylai's Crystal Scepter" },
      antiShield: { item: "Oceanid's Trident" },
      vsDive: { item: "Zhonya's Hourglass", alt: "Mikael's Blessing" },
    },
    combos: [
      "Echo: every 3rd spell is cast twice. Count to make the double cast your E (root) or W (team heal).",
      "E on a slowed/immobile target = root. On an already-CC'd target = stun.",
      "R through your ADC: it extends when it hits an ally. Line it up through your ADC to reach the backline.",
    ],
    spikes: ["Lv2 Q+E: poke + slow", "Lv5 Encore", "Black Mist Scythe + Rylai's"],
    lane: [
      "Poke with Q from max range; it hits harder on low-HP targets.",
      "Hold E for their engage — it roots dashers that got slowed.",
      "Double W (Echo) after they all-in; it speeds and shields both of you.",
    ],
    fights: [
      "R the clump, ideally after their engage commits.",
      "Stay back and Echo-W the team when the fight starts.",
    ],
    good: {
      Leona: "you kite and root her E; R stops her all-in",
      Nautilus: "you out-range him; E root stops follow-up",
      Alistar: "poke him down before he can W-Q",
      Rell: "slow him then root",
      Soraka: "you out-poke and scale with her",
      Yuumi: "free poke on an immobile ADC",
    },
    bad: {
      Blitzcrank: "hook = you die; you have no dash",
      Pyke: "dodges skillshots and executes",
      Zyra: "she out-zones you with plants",
      Brand: "out-damages your shields",
      Morgana: "Black Shield blocks your CC",
      Senna: "longer range poke",
    },
  },

  Lulu: {
    name: "Lulu",
    owner: "support",
    style: "Peel enchanter. Polymorph and Wild Growth stop divers; speed and shields turn your ADC into a hypercarry.",
    blind: 3,
    spells: "Flash + Exhaust (Heal vs poke)",
    runes: "Summon Aery · Font of Life · Bone Plating · Revitalize · Transcendence",
    skills: "Max E → W → Q. R at every chance.",
    boots: "Ionian Boots of Lucidity",
    builds: [
      { name: "Standard", when: "most games", items: ["Black Mist Scythe", "Ardent Censer", "Mikael's Blessing", "Staff of Flowing Water", "Harmonic Echo"] },
      { name: "Sustain", when: "2+ poke champions or 2+ tanks", items: ["Black Mist Scythe", "Ardent Censer", "Redemption", "Harmonic Echo", "Staff of Flowing Water"] },
      { name: "Tempo", when: "2+ allied engagers", items: ["Black Mist Scythe", "Shurelya's Battlesong", "Ardent Censer", "Harmonic Echo", "Staff of Flowing Water"] },
    ],
    situational: {
      antiHeal: { item: "Morellonomicon" },
      vsTanks: { item: "Liandry's Torment" },
      vsADBurst: { item: "Zhonya's Hourglass", replaces: "Mikael's Blessing" },
      vsAPBurst: { item: "Banshee's Veil" },
      vsCC: { item: "Mikael's Blessing" },
      vsMobile: { item: "Rylai's Crystal Scepter" },
      antiShield: { item: "Oceanid's Trident" },
      vsDive: { item: "Mikael's Blessing" },
    },
    combos: [
      "E an enemy, then Q: the lance fires from both you and Pix (double poke).",
      "Peel combo: W polymorph the diver → R your ADC when they drop low (knock-up around them).",
      "Hypercarry: W + E on your ADC as they start attacking (speed, attack speed, shield).",
    ],
    spikes: ["Lv2 E+Q poke", "Lv5 Wild Growth", "Black Mist Scythe + Ardent Censer"],
    lane: [
      "Poke with E→Q. Keep W for their all-in, not for damage.",
      "Polymorph stops dashes and channels (Samira R, MF R, Draven all-in).",
      "Lane is about not dying; your value comes at 2 items.",
    ],
    fights: [
      "Stand next to your ADC. Whoever jumps on your ADC gets W. Save R for your ADC.",
      "W on your ADC only when nothing needs polymorphing.",
    ],
    good: {
      Samira: "polymorph stops her dash and R",
      Kalista: "polymorph + R ruin her all-in",
      Draven: "W cancels his all-in",
      Nilah: "polymorph + exhaust kill her engage",
      Lucian: "you shut down his dash trades",
      Pyke: "polymorph his engage, R saves your ADC from execute",
      Rakan: "polymorph stops his engage",
      Leona: "W the moment she E's; R your ADC if stunned",
    },
    bad: {
      Zyra: "plants out-poke you",
      Brand: "out-damages your shields",
      Karma: "out-pokes you all lane",
      Lux: "longer range poke + root",
      Senna: "longer range, long lane game",
      Morgana: "Black Shield on the engager, root on you",
    },
  },

  Leona: {
    name: "Leona",
    owner: "support",
    style: "Hard-engage tank. Wins lane at level 2 and 5; gives your ADC free kills on immobile targets.",
    blind: 1,
    spells: "Flash + Ignite (Heal also common)",
    runes: "Ice Tyrant (listed as Ice Overlord on some sites) · Unshakeable/Bone Plating · Second Wind · Overgrowth · Hextech Flashtraption",
    skills: "Q at 1, E at 2. Max W → E → Q. R at every chance.",
    boots: "Plated Steelcaps (Mercury's Treads vs AP/CC)",
    builds: [
      { name: "Standard", when: "most games", items: ["Bulwark of the Mountain", "Locket of the Iron Solari", "Knight's Vow", "Zeke's Convergence", "Thornmail"] },
      { name: "Protect carry", when: "enemy has divers on your ADC", items: ["Bulwark of the Mountain", "Knight's Vow", "Locket of the Iron Solari", "Radiant Virtue", "Zeke's Convergence"] },
      { name: "Front line", when: "you are the team's only tank", items: ["Bulwark of the Mountain", "Locket of the Iron Solari", "Warmog's Armor", "Force of Nature", "Thornmail"] },
    ],
    situational: {
      antiHeal: { item: "Thornmail" },
      vsTanks: { item: "Divine Sunderer" },
      vsADBurst: { item: "Death's Dance", alt: "Randuin's Omen" },
      vsAPBurst: { item: "Kaenic Rookern", alt: "Force of Nature" },
      vsCC: { item: "Mercury's Treads" },
      vsMobile: { item: "Stridebreaker" },
      vsDive: { item: "Knight's Vow", alt: "Locket of the Iron Solari" },
    },
    combos: [
      "Lv2 all-in: E (Zenith Blade) → Q (stun) → auto → W. Your ADC follows on the E.",
      "Flash engage: E → Flash → Q (or E → Q-Flash if they are at the edge).",
      "Lv5: R (Solar Flare) center-stun → E → Q = 3+ seconds of CC for your ADC's burst.",
    ],
    spikes: ["Lv2 (first to hit it wins)", "Lv5 Solar Flare", "Bulwark of the Mountain finished"],
    lane: [
      "Track level 2: go the moment you hit it first.",
      "Engage the squishier target, or whoever wasted their escape/flash.",
      "Don't E into Janna/Lulu with their spells up; bait them out first.",
    ],
    fights: [
      "Engage on their carry when your ADC is in range to follow. Ping before you go.",
      "If they dive your ADC, turn and stun the diver instead.",
    ],
    good: {
      Sona: "she can't survive an all-in",
      Soraka: "jump her, your ADC kills her",
      Yuumi: "lock the ADC, Yuumi can't stop it",
      Jinx: "no escape, short range early",
      Jhin: "no escape",
      "Miss Fortune": "no escape; lock her before R",
      Ashe: "no escape (respect her R)",
      "Kog'Maw": "dies to any engage",
      Twitch: "squishy and immobile when found",
    },
    bad: {
      Janna: "Q/R knock you away, shield nullifies",
      Lulu: "polymorph cancels your all-in",
      Braum: "Unbreakable blocks your E",
      Alistar: "knocks you back and out-tanks",
      Morgana: "Black Shield ruins your engage",
      Milio: "cleanse ult undoes your CC",
      Zyra: "plants make engaging painful",
      Poppy: "W stops your E",
      Vayne: "condemn into wall",
      Kalista: "she hops away; her R throws her support at you",
    },
  },

  Zyra: {
    name: "Zyra",
    owner: "support",
    style: "Damage support. Plants zone and poke; root sets up your ADC. Very strong lane, squishy late.",
    blind: 2,
    spells: "Flash + Ignite",
    runes: "Arcane Comet · Cheap Shot · Chain Assault · Eyeball Collector · Transcendence",
    skills: "Max E → Q → W (or Q first for poke lanes). R at every chance.",
    boots: "Boots of Mana",
    builds: [
      { name: "Damage", when: "most games", items: ["Black Mist Scythe", "Liandry's Torment", "Rylai's Crystal Scepter", "Imperial Mandate", "Blackfire Torch"] },
      { name: "Utility", when: "2+ allied carries to protect", items: ["Black Mist Scythe", "Ardent Censer", "Harmonic Echo", "Redemption", "Echoes of Helia"] },
      { name: "Safety", when: "2+ divers or assassins", items: ["Black Mist Scythe", "Liandry's Torment", "Zhonya's Hourglass", "Mantle of the Twelfth Hour", "Ardent Censer"] },
    ],
    situational: {
      antiHeal: { item: "Morellonomicon" },
      vsTanks: { item: "Liandry's Torment" },
      vsADBurst: { item: "Zhonya's Hourglass" },
      vsAPBurst: { item: "Banshee's Veil" },
      vsCC: { item: "Mikael's Blessing" },
      vsMobile: { item: "Rylai's Crystal Scepter" },
      antiShield: { item: "Oceanid's Trident" },
      vsDive: { item: "Zhonya's Hourglass" },
    },
    combos: [
      "Root combo: E (Grasping Roots) through a seed → Q on the rooted target → W seeds under them.",
      "Zone: drop W seeds in the bush or on the wave; Q/E on a seed makes a plant.",
      "Lv5: E root → R on them = knock-up into your ADC's damage.",
    ],
    spikes: ["Lv2 E+Q (strong)", "Lv5 Stranglethorns", "Black Mist Scythe + Liandry's"],
    lane: [
      "You are the lane bully. Poke every time they step up for a minion.",
      "Plants block skillshots like hooks; seed the bush they want to use.",
      "Root before your ADC's damage, not after.",
    ],
    fights: [
      "Plants and R in choke points; fight near your seeds.",
      "You are squishy: stay behind the front line and zone.",
    ],
    good: {
      Leona: "plants punish her engage",
      Nautilus: "zone and root him before he commits",
      Alistar: "poke him down, plants block his W-Q angle",
      Rell: "plants + root wreck him",
      Braum: "he can't block plants",
      Soraka: "you out-damage her heals",
      Yuumi: "free poke on the ADC",
      Sona: "she can't heal through you",
      Lulu: "you out-damage her shields",
    },
    bad: {
      Blitzcrank: "hook = dead",
      Pyke: "invisible engage + execute",
      Morgana: "Black Shield + root you",
      Sivir: "spell shield + fast wave clear",
      Ezreal: "dodges and out-pokes",
      Samira: "windwall eats your root",
      Xayah: "her root and featherstorm dodge your combo",
    },
  },

  // ───────────────────────── ADCs ─────────────────────────
  "Miss Fortune": {
    name: "Miss Fortune",
    owner: "adc",
    style: "Lane bully with a huge teamfight ult. Best with CC supports who hold the enemy in Bullet Time.",
    blind: 2,
    spells: "Flash + Heal (Ignite with Leona/Zyra for kill lanes)",
    runes: "Empowerment (listed keystone) · Brutal · Giant Slayer · Legend: Alacrity · Bone Plating",
    skills: "Max Q → E → W. R at every chance.",
    boots: "Berserker's Greaves",
    builds: [
      { name: "Crit", when: "most games", items: ["Bloodthirster", "The Collector", "Infinity Edge", "Fiendhunter Bolts", "Lord Dominik's Regards"] },
      { name: "Anti-tank", when: "2+ enemy tanks", items: ["Bloodthirster", "Kraken Slayer", "Lord Dominik's Regards", "Fiendhunter Bolts", "Infinity Edge"] },
      { name: "Safety", when: "2+ divers or assassins, or behind", items: ["Bloodthirster", "Blade of the Ruined King", "Stormrazor", "Phantom Dancer", "Infinity Edge"] },
    ],
    situational: {
      antiHeal: { item: "Mortal Reminder", replaces: "Lord Dominik's Regards" },
      vsTanks: { item: "Blade of the Ruined King", alt: "Lord Dominik's Regards" },
      vsADBurst: { item: "Guardian Angel" },
      vsAPBurst: { item: "Mercurial Scimitar" },
      vsCC: { item: "Mercurial Scimitar", alt: "Quicksilver Sash" },
      vsMobile: { item: "Serylda's Grudge", replaces: "Lord Dominik's Regards" },
      antiShield: { item: "Serpent's Fang" },
      vsDive: { item: "Guardian Angel" },
    },
    combos: [
      "Q bounce: Q a low-HP minion so it bounces into the champion behind it (bounce crits).",
      "Love Tap: switch targets for bonus damage — auto the ADC, then the support.",
      "R (Bullet Time) only after your support's CC lands, or from max range/fog. Any CC cancels it.",
    ],
    spikes: ["Lv2-3 Q bounce", "Lv5 Bullet Time", "Bloodthirster + Collector"],
    lane: [
      "Bully the lane: Q bounce off minions every time it's up.",
      "E (Make It Rain) on the bush or their melee minions to slow their walk-up.",
      "Respect hooks: you have no dash.",
    ],
    fights: [
      "Wait for your support's CC, then R from a safe angle. Don't R into an unspent Lulu W/Janna R.",
      "Use W speed to reposition before R.",
    ],
    good: {
      Jinx: "you out-trade her early",
      Jhin: "Q bounce punishes his reload",
      "Kog'Maw": "lane bully vs weak early",
      Twitch: "he can't trade with you",
      Ezreal: "Q bounce through minions; he can't sustain",
      Zeri: "she is weak early",
      Yunara: "pressure her before she scales",
    },
    bad: {
      Samira: "windwall eats your R",
      Sivir: "spell shield blocks Q and out-pushes",
      Caitlyn: "out-ranges you",
      Draven: "out-trades you",
      Kalista: "too mobile for your Q",
      Varus: "out-pokes you",
      Lucian: "dashes out of Q and bursts",
    },
  },

  Jinx: {
    name: "Jinx",
    owner: "adc",
    style: "Late-game hypercarry. Survive lane, then chain resets in fights (Get Excited!).",
    blind: 1,
    spells: "Flash + Heal (Barrier vs heavy burst)",
    runes: "Lethal Tempo · Brutal · Giant Slayer · Legend: Alacrity · Bone Plating",
    skills: "Max Q → W → E. R at every chance.",
    boots: "Berserker's Greaves",
    builds: [
      { name: "Crit", when: "most games", items: ["Runaan's Hurricane", "Infinity Edge", "Lord Dominik's Regards", "Stormrazor", "Yun Tal Wildarrows"] },
      { name: "Anti-tank", when: "2+ enemy tanks", items: ["Runaan's Hurricane", "Kraken Slayer", "Lord Dominik's Regards", "Infinity Edge", "Fiendhunter Bolts"] },
      { name: "Safety", when: "2+ divers or assassins", items: ["Runaan's Hurricane", "Bloodthirster", "Infinity Edge", "Stormrazor", "Phantom Dancer"] },
    ],
    situational: {
      antiHeal: { item: "Mortal Reminder", replaces: "Lord Dominik's Regards" },
      vsTanks: { item: "Blade of the Ruined King", alt: "Lord Dominik's Regards" },
      vsADBurst: { item: "Guardian Angel" },
      vsAPBurst: { item: "Mercurial Scimitar" },
      vsCC: { item: "Mercurial Scimitar", alt: "Quicksilver Sash" },
      vsMobile: { item: "Serylda's Grudge", replaces: "Lord Dominik's Regards" },
      antiShield: { item: "Serpent's Fang" },
      vsDive: { item: "Guardian Angel" },
    },
    combos: [
      "Rocket (Q) for range and wave clear, minigun for single-target trades.",
      "E (Flame Chompers) under your support's CC or on top of a diver's landing spot.",
      "W (Zap!) slow → E on the slowed target → rockets.",
      "R (Super Mega Death Rocket) to finish low targets cross-map.",
    ],
    spikes: ["First item (Runaan's)", "2 items: Infinity Edge", "3 items: hypercarry"],
    lane: [
      "Don't fight early bullies. Farm with rockets from range, trade only with your support's CC.",
      "Chompers in the bush/your side vs engage supports.",
      "You need gold: last-hit focus over trading.",
    ],
    fights: [
      "Stay back with rockets. One takedown = Get Excited speed; chase the next one.",
      "Chompers in front of yourself vs divers.",
    ],
    good: {
      "Kog'Maw": "you out-range him early",
      Twitch: "rockets out-range, chompers stop his engage",
      Sivir: "scaling vs scaling, you win fights",
      Zeri: "she is weaker early",
      Yunara: "you win late fights with resets",
    },
    bad: {
      Caitlyn: "out-ranges you all lane",
      Draven: "kills you early",
      Lucian: "dash + burst early",
      Samira: "dives you; windwall eats rockets",
      Kalista: "level 2-3 all-in",
      Nilah: "brawls you early",
      Varus: "out-pokes you",
      Ezreal: "safe poke you can't punish",
    },
  },

  Jhin: {
    name: "Jhin",
    owner: "adc",
    style: "Utility marksman: 4-shot burst, long-range root and ultimate. Perfect with CC supports.",
    blind: 2,
    spells: "Flash + Heal",
    runes: "Dark Harvest · Brutal · Coup de Grace · Legend: Alacrity · Nimbus Cloak",
    skills: "Max Q → W → E (sites differ; Q max is the burst build). R at every chance.",
    boots: "Boots of Dynamism (or Berserker's Greaves)",
    builds: [
      { name: "Crit", when: "most games", items: ["Phantom Dancer", "Infinity Edge", "The Collector", "Lord Dominik's Regards", "Kraken Slayer"] },
      { name: "Anti-tank", when: "2+ enemy tanks", items: ["Phantom Dancer", "Kraken Slayer", "Lord Dominik's Regards", "Infinity Edge", "Fiendhunter Bolts"] },
      { name: "Safety", when: "2+ divers or assassins", items: ["Phantom Dancer", "Infinity Edge", "Blade of the Ruined King", "Stormrazor", "Mortal Reminder"] },
    ],
    situational: {
      antiHeal: { item: "Mortal Reminder", replaces: "Lord Dominik's Regards" },
      vsTanks: { item: "Blade of the Ruined King", alt: "Lord Dominik's Regards" },
      vsADBurst: { item: "Guardian Angel" },
      vsAPBurst: { item: "Mercurial Scimitar" },
      vsCC: { item: "Mercurial Scimitar", alt: "Quicksilver Sash" },
      vsMobile: { item: "Serylda's Grudge", replaces: "Lord Dominik's Regards" },
      antiShield: { item: "Serpent's Fang" },
      vsDive: { item: "Guardian Angel" },
    },
    combos: [
      "4th shot: save it for the champion (crit + execute). Don't waste it on minions in a trade.",
      "W (Deadly Flourish) roots anyone your ADC or your support hit in the last few seconds.",
      "Q bounce: Q a low minion next to them; it grows on kills.",
      "R (Curtain Call) from fog. Last shot crits — save it for the low target.",
    ],
    spikes: ["Lv2-3 4th-shot trades", "Lv5 Curtain Call", "Phantom Dancer + Infinity Edge"],
    lane: [
      "Trade with your 4th shot, then step back while reloading.",
      "W after your support's CC for a chain root.",
      "Traps (E) in bushes and on your escape path.",
    ],
    fights: [
      "Poke with R before the fight, then join with W roots.",
      "You are immobile: stay behind the front line.",
    ],
    good: {
      Jinx: "you out-trade her early",
      "Kog'Maw": "burst before he scales",
      Twitch: "you burst him",
      Ezreal: "root him when his E is down",
      Sivir: "you out-trade her",
      Zeri: "punish her weak early",
    },
    bad: {
      Samira: "windwall blocks W/R and she dives you",
      Draven: "out-trades you",
      Lucian: "dashes around your reload",
      Kalista: "too mobile",
      Vayne: "dodges skillshots, outscales",
      Nilah: "she dives you in reload",
    },
  },

  Caitlyn: {
    name: "Caitlyn",
    owner: "adc",
    style: "Longest-range lane bully. Traps + headshots win lane; take towers early.",
    blind: 3,
    spells: "Flash + Heal (Barrier vs dive)",
    runes: "Lethal Tempo · Brutal · Giant Slayer · Legend: Alacrity · Bone Plating",
    skills: "Max Q → W → E. R at every chance.",
    boots: "Berserker's Greaves",
    builds: [
      { name: "Crit", when: "most games", items: ["Infinity Edge", "Lord Dominik's Regards", "Rapid Firecannon", "The Collector", "Kraken Slayer"] },
      { name: "Anti-tank", when: "2+ enemy tanks", items: ["Infinity Edge", "Kraken Slayer", "Lord Dominik's Regards", "Fiendhunter Bolts", "Blade of the Ruined King"] },
      { name: "Safety", when: "2+ divers or assassins", items: ["Infinity Edge", "Blade of the Ruined King", "Rapid Firecannon", "Stormrazor", "Mortal Reminder"] },
    ],
    situational: {
      antiHeal: { item: "Mortal Reminder", replaces: "Lord Dominik's Regards" },
      vsTanks: { item: "Blade of the Ruined King", alt: "Lord Dominik's Regards" },
      vsADBurst: { item: "Guardian Angel" },
      vsAPBurst: { item: "Mercurial Scimitar" },
      vsCC: { item: "Mercurial Scimitar", alt: "Quicksilver Sash" },
      vsMobile: { item: "Serylda's Grudge", replaces: "Lord Dominik's Regards" },
      antiShield: { item: "Serpent's Fang" },
      vsDive: { item: "Guardian Angel" },
    },
    combos: [
      "Trap combo: trap under your support's CC → trapped target = double-range headshot.",
      "E (net) → Q: net-hit marks them for a headshot too; Q lands on the netted target.",
      "Headshot every 6 autos (faster in bushes): count and use it on the champion.",
    ],
    spikes: ["Lv1-3: you out-range everyone", "Infinity Edge", "Rapid Firecannon"],
    lane: [
      "Auto them every time they walk up. Range is your whole lane.",
      "Traps in bushes and under your support's CC.",
      "Push and take the tower plate/tower early.",
    ],
    fights: [
      "Traps in front of you vs divers. Net away from engage.",
      "R the low target that's running away.",
    ],
    good: {
      Jinx: "out-range her all lane",
      Jhin: "out-range him",
      "Kog'Maw": "bully him before he scales",
      Twitch: "range + traps vs his engage",
      Vayne: "punish her short range",
      Zeri: "punish her weak early",
      "Miss Fortune": "out-range her",
      Ashe: "out-range her",
    },
    bad: {
      Samira: "windwall + dive",
      Sivir: "spell shield + faster push",
      Kalista: "hops in and out",
      Nilah: "dives you late game",
      Lucian: "dashes into you early",
      Varus: "poke war you lose",
    },
  },

  Zeri: {
    name: "Zeri",
    owner: "adc",
    style: "Mobile hypercarry. Weak early, unstoppable kiting late. Loves shields and speed.",
    blind: 0,
    spells: "Flash + Heal",
    runes: "Conqueror · Brutal · Giant Slayer · Legend: Alacrity · Bone Plating",
    skills: "Max Q → E → W. R at every chance.",
    boots: "Berserker's Greaves",
    builds: [
      { name: "Crit", when: "most games", items: ["Runaan's Hurricane", "Infinity Edge", "Lord Dominik's Regards", "Stormrazor", "Kraken Slayer"] },
      { name: "Anti-tank", when: "2+ enemy tanks", items: ["Runaan's Hurricane", "Kraken Slayer", "Lord Dominik's Regards", "Infinity Edge", "Fiendhunter Bolts"] },
      { name: "Safety", when: "2+ divers or assassins, or behind", items: ["Runaan's Hurricane", "Bloodthirster", "Stormrazor", "Infinity Edge", "Phantom Dancer"] },
    ],
    situational: {
      antiHeal: { item: "Mortal Reminder", replaces: "Lord Dominik's Regards" },
      vsTanks: { item: "Blade of the Ruined King", alt: "Lord Dominik's Regards" },
      vsADBurst: { item: "Guardian Angel" },
      vsAPBurst: { item: "Mercurial Scimitar" },
      vsCC: { item: "Mercurial Scimitar", alt: "Quicksilver Sash" },
      vsMobile: { item: "Serylda's Grudge", replaces: "Lord Dominik's Regards" },
      antiShield: { item: "Serpent's Fang" },
      vsDive: { item: "Guardian Angel" },
    },
    combos: [
      "Q is her auto: keep firing while moving. Charged auto (hold) for low minions and slows.",
      "E (Spark Surge) over walls; after E, Q pierces.",
      "R in a fight: overcharge, then keep hitting to stay fast.",
    ],
    spikes: ["Lv5 Lightning Crash", "Runaan's Hurricane", "3 items: kite anything"],
    lane: [
      "Farm safely; your early trades are weak.",
      "Use W (laser) through walls/minions for poke.",
      "Shields from your support charge your passive — stand next to your support.",
    ],
    fights: [
      "Kite at max range. R when 2+ enemies are near.",
      "Stay with your support's speed/shields; E over walls to escape divers.",
    ],
    good: {
      Jinx: "you kite her late",
      "Kog'Maw": "you out-mobile him",
      Twitch: "you kite his ambush",
      Ashe: "dash out of arrow and kite",
      Sivir: "you out-scale in fights",
    },
    bad: {
      Caitlyn: "out-ranges you early",
      Draven: "kills you early",
      Lucian: "kills you early",
      "Miss Fortune": "bullies your early",
      Varus: "pokes you out",
      Samira: "windwall eats your Q",
    },
  },

  Twitch: {
    name: "Twitch",
    owner: "adc",
    style: "Stealth hypercarry. Weak short-range lane, but invisible ganks and huge late-game fights from the flank.",
    blind: 0,
    spells: "Flash + Heal (Ghost for aggressive roams)",
    runes: "Lethal Tempo · Brutal · Giant Slayer · Legend: Alacrity · Sudden Impact",
    skills: "Max E → Q → W. R at every chance.",
    boots: "Berserker's Greaves",
    builds: [
      { name: "Crit", when: "most games", items: ["The Collector", "Infinity Edge", "Runaan's Hurricane", "Lord Dominik's Regards", "Yun Tal Wildarrows"] },
      { name: "Anti-tank", when: "2+ enemy tanks", items: ["The Collector", "Blade of the Ruined King", "Kraken Slayer", "Lord Dominik's Regards", "Infinity Edge"] },
      { name: "Safety", when: "2+ divers or assassins", items: ["The Collector", "Blade of the Ruined King", "Infinity Edge", "Stormrazor", "Phantom Dancer"] },
    ],
    situational: {
      antiHeal: { item: "Mortal Reminder", replaces: "Lord Dominik's Regards" },
      vsTanks: { item: "Blade of the Ruined King", alt: "Lord Dominik's Regards" },
      vsADBurst: { item: "Guardian Angel" },
      vsAPBurst: { item: "Mercurial Scimitar" },
      vsCC: { item: "Mercurial Scimitar", alt: "Quicksilver Sash" },
      vsMobile: { item: "Serylda's Grudge", replaces: "Lord Dominik's Regards" },
      antiShield: { item: "Serpent's Fang" },
      vsDive: { item: "Guardian Angel" },
    },
    combos: [
      "Ambush (Q): go invisible, walk in, first auto after stealth gets bonus attack speed. Open with W to slow.",
      "Stack poison with autos, then E (Contaminate) at 4-6 stacks for burst.",
      "R (Spray and Pray): bolts pierce the whole line. Fire from behind the front line or from stealth.",
    ],
    spikes: ["Lv2-3 stealth gank with your support", "Lv5 Spray and Pray", "The Collector + Infinity Edge"],
    lane: [
      "Short range: don't trade autos early. Farm and stack E on minions near their ADC.",
      "Use Q stealth to roam mid or surprise their lane after they use spells.",
      "Ward their bushes; you are their favourite hook target.",
    ],
    fights: [
      "Wait in stealth on the flank; enter after their engage is spent, then R through the line.",
      "Never be the first one seen. If they have a Control Ward, play behind your support.",
    ],
    good: {
      Jinx: "you ambush her; she can't escape",
      Jhin: "you burst him while he reloads",
      "Kog'Maw": "you reach him from stealth",
      Senna: "squishy and slow; easy ambush",
      Soraka: "no escape vs a stealth all-in",
    },
    bad: {
      Caitlyn: "out-ranges your short autos",
      Draven: "out-trades you early",
      Kalista: "too mobile for your ambush",
      Nilah: "brawls and out-heals you",
      Lucian: "dash burst before you scale",
      Ziggs: "out-pokes and out-pushes you",
    },
  },
};

export const SUPPORTS = Object.values(POOL).filter((c) => c.owner === "support").map((c) => c.name);
export const ADCS = Object.values(POOL).filter((c) => c.owner === "adc").map((c) => c.name);

// Duo synergy: 1 (meh) to 5 (excellent), with the one-line game plan.
export const SYNERGY: Record<string, Record<string, [number, string]>> = {
  Sona: {
    Twitch: [4, "E speed for stealth roams; Crescendo stun gives Twitch a free Spray and Pray."],
    Jinx: [5, "Crescendo + Flame Chompers; Sona speed covers Jinx's lack of a dash. Scale together."],
    "Miss Fortune": [5, "Crescendo stun → Bullet Time. One ult combo wins a teamfight."],
    Zeri: [4, "Sona shields/heals charge Zeri; E speed makes her untouchable late."],
    Caitlyn: [4, "Poke lane: both out-range most bot lanes. Q-auto + headshots."],
    Jhin: [4, "Crescendo stun → Jhin W root chain. Sona E speed for immobile Jhin."],
  },
  Yuumi: {
    Twitch: [5, "Yuumi rides Twitch into stealth ambushes; heals and attack speed make him a raid boss late."],
    Zeri: [5, "Zeri dashes, Yuumi stays attached. Hard to catch, huge late game."],
    Jinx: [4, "Classic hypercarry: heals keep Jinx alive until she resets."],
    Caitlyn: [4, "Range + sustain: you can poke all lane and never back."],
    Jhin: [3, "Long range is safe, but Yuumi's attack speed is wasted on Jhin."],
    "Miss Fortune": [2, "MF needs CC for Bullet Time; Yuumi only has the R root."],
  },
  Seraphine: {
    Twitch: [3, "Root sets up his ambush, but both are squishy vs hard engage."],
    "Miss Fortune": [5, "E root / R charm → Bullet Time. Double poke lane."],
    Jhin: [5, "Long-range CC chain: Seraphine E → Jhin W → Seraphine R."],
    Caitlyn: [4, "Root → trap → headshot. Strong poke lane."],
    Jinx: [4, "Root into Flame Chompers; Echo-W keeps Jinx alive."],
    Zeri: [3, "Shields fuel Zeri, but the lane has little early kill threat."],
  },
  Lulu: {
    Twitch: [5, "Hypercarry duo: Lulu W + E on Twitch, polymorph whoever finds him."],
    Jinx: [5, "Hypercarry duo: W on Jinx = speed + attack speed; polymorph the diver."],
    Zeri: [5, "W + E on Zeri = fastest thing on the map. Polymorph anyone who reaches her."],
    Caitlyn: [4, "Pix + Cait range = constant poke; Lulu peel covers Cait's weak dive defense."],
    "Miss Fortune": [3, "Polymorph protects the Bullet Time channel; R knock-up starts it."],
    Jhin: [3, "Shields/peel help, but Jhin can't use Lulu's attack speed."],
  },
  Leona: {
    Twitch: [4, "Leona engages, Twitch walks in from stealth to finish. Strong level 2-5 ganks."],
    "Miss Fortune": [5, "Leona R/Q into Bullet Time. Kill lane from level 2."],
    Jhin: [5, "Stun → W root chain → 4th shot. Kill lane."],
    Caitlyn: [4, "Trap under Leona's stun = free headshot. Lane bully duo."],
    Jinx: [4, "Chompers under Leona's R; Leona covers Jinx's weak early."],
    Zeri: [3, "Zeri follows with E, but she's weak at Leona's level 2-5 spike."],
  },
  Zyra: {
    Twitch: [4, "Root + plants slow them while Twitch stacks poison; good kill pressure."],
    Caitlyn: [5, "Root → trap → headshot, plants + range = dominant lane."],
    "Miss Fortune": [5, "Root and R knock-up hold them in Bullet Time; double poke."],
    Jhin: [4, "Root → W root; both zone from long range."],
    Jinx: [4, "Root into Chompers; plants protect Jinx's early."],
    Zeri: [3, "Zone with plants while Zeri scales; low synergy otherwise."],
  },
};
