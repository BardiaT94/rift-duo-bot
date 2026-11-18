// One Durable Object per Telegram chat. Holds the current game, match history,
// personal notes, the AI quota, and enemy summoner-spell timers (with alarms).

import { DurableObject } from "cloudflare:workers";
import type { GameRecord } from "./engine/draft.ts";
import { send, tg, type Env } from "./telegram.ts";
import { timerState } from "./widgets.ts";

export interface Game {
  eAdc?: string;
  eSup?: string;
  enemies: string[];
  allies: string[];
  bans: string[];
  sup?: string;
  adc?: string;
  /** Screenshot result waiting for "which team is the enemy?" */
  pendingTeams?: { a: string[]; b: string[] };
  startedAt: number;
}

export interface Timer {
  id: string;
  label: string;
  due: number;
}

export type WidgetKind = "draft" | "timer";
export interface WidgetRef {
  c: number;
  m: number;
}

export function newGame(): Game {
  return { enemies: [], allies: [], bans: [], startedAt: Date.now() };
}

export class ChatState extends DurableObject<Env> {
  private async get<T>(key: string, fallback: T): Promise<T> {
    return ((await this.ctx.storage.get<T>(key)) ?? fallback) as T;
  }

  /** True if this Telegram update was already handled (Telegram retries slow webhooks). */
  async seen(updateId: number): Promise<boolean> {
    const ids = await this.get<number[]>("seen", []);
    if (ids.includes(updateId)) return true;
    ids.push(updateId);
    await this.ctx.storage.put("seen", ids.slice(-100));
    return false;
  }

  async getGame(): Promise<Game | null> {
    return this.get<Game | null>("game", null);
  }

  async setGame(game: Game): Promise<void> {
    await this.ctx.storage.put("game", game);
  }

  async history(): Promise<GameRecord[]> {
    return this.get<GameRecord[]>("history", []);
  }

  async addRecord(r: GameRecord): Promise<number> {
    const h = await this.history();
    h.push(r);
    await this.ctx.storage.put("history", h.slice(-1000));
    return h.length;
  }

  async undoRecord(): Promise<GameRecord | undefined> {
    const h = await this.history();
    const last = h.pop();
    await this.ctx.storage.put("history", h);
    return last;
  }

  async notes(): Promise<Record<string, string[]>> {
    return this.get<Record<string, string[]>>("notes", {});
  }

  async addNote(champ: string, text: string | null): Promise<string[]> {
    const n = await this.notes();
    if (text === null) delete n[champ];
    else n[champ] = [...(n[champ] ?? []), text].slice(-10);
    await this.ctx.storage.put("notes", n);
    return n[champ] ?? [];
  }

  /** Count one AI call against today's limit. Returns false when the limit is reached. */
  async useAi(limit: number): Promise<boolean> {
    const today = new Date().toISOString().slice(0, 10);
    const q = await this.get<{ day: string; n: number }>("ai", { day: today, n: 0 });
    if (q.day !== today) {
      q.day = today;
      q.n = 0;
    }
    if (q.n >= limit) return false;
    q.n++;
    await this.ctx.storage.put("ai", q);
    return true;
  }

  // ── Widgets ──

  /** Monotonic revision so widgets can ignore stale state. */
  async bump(): Promise<number> {
    const r = (await this.get<number>("rev", 0)) + 1;
    await this.ctx.storage.put("rev", r);
    return r;
  }

  /** Remember the latest widget message of this kind in each chat. */
  async addWidget(kind: WidgetKind, chatId: number, messageId: number): Promise<void> {
    const refs = (await this.widgets(kind)).filter((w) => w.c !== chatId);
    refs.push({ c: chatId, m: messageId });
    await this.ctx.storage.put(`w:${kind}`, refs.slice(-6));
  }

  async widgets(kind: WidgetKind): Promise<WidgetRef[]> {
    return this.get<WidgetRef[]>(`w:${kind}`, []);
  }

  // ── Spell timers ──

  /** Start (or restart) a timer; `notify` are the chats that get the "is UP" message. */
  async startTimer(notify: number[], label: string, seconds: number): Promise<Timer[]> {
    await this.ctx.storage.put("notify", notify);
    const timers = (await this.get<Timer[]>("timers", [])).filter((t) => t.label !== label);
    timers.push({ id: crypto.randomUUID().slice(0, 8), label, due: Date.now() + seconds * 1000 });
    await this.saveTimers(timers);
    return this.timers();
  }

  async timers(): Promise<Timer[]> {
    return (await this.get<Timer[]>("timers", [])).sort((a, b) => a.due - b.due);
  }

  async clearTimers(): Promise<void> {
    await this.saveTimers([]);
  }

  private async saveTimers(timers: Timer[]): Promise<void> {
    timers.sort((a, b) => a.due - b.due);
    await this.ctx.storage.put("timers", timers);
    if (timers.length) await this.ctx.storage.setAlarm(timers[0].due);
    else await this.ctx.storage.deleteAlarm();
  }

  async alarm(): Promise<void> {
    const notify = await this.get<number[]>("notify", []);
    const now = Date.now() + 500;
    const timers = await this.get<Timer[]>("timers", []);
    const due = timers.filter((t) => t.due <= now);
    const rest = timers.filter((t) => t.due > now);
    await this.saveTimers(rest);
    for (const chatId of notify) for (const t of due) await send(this.env, chatId, `⚡ <b>${t.label}</b> is UP`);
    const data = timerState(rest, await this.bump());
    for (const w of await this.widgets("timer")) {
      await tg(this.env, "editMessageWidgetData", { chat_id: w.c, message_id: w.m, chat_data: data });
    }
  }
}
