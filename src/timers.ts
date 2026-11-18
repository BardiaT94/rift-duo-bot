// Enemy summoner spell timers. Cooldowns in seconds, no haste.
// Sources disagree on Barrier (90-120s); adjust here if a patch changes them.

export const TIMERS: [key: string, label: string, seconds: number][] = [
  ["af", "ADC Flash", 150],
  ["ah", "ADC Heal", 120],
  ["ab", "ADC Barrier", 90],
  ["sf", "SUP Flash", 150],
  ["si", "SUP Ignite", 90],
  ["se", "SUP Exhaust", 105],
  ["mf", "MID Flash", 150],
  ["jf", "JG Flash", 150],
  ["tf", "TOP Flash", 150],
];

export const TIMER_BY_KEY = new Map(TIMERS.map(([k, label, seconds]) => [k, { key: k, label, seconds }]));
export const KEY_BY_LABEL = new Map(TIMERS.map(([k, label]) => [label, k]));
