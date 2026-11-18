// Minimal Telegram Bot API client (no dependencies).

export interface Env {
  TELEGRAM_TOKEN: string;
  WEBHOOK_SECRET: string;
  ANTHROPIC_API_KEY?: string;
  PLAYERS?: string;
  AI_DAILY_LIMIT?: string;
  /** Override for local testing against a mock server. */
  TELEGRAM_API?: string;
  CHAT: DurableObjectNamespace<import("./state.ts").ChatState>;
}

export type Button = { text: string; callback_data: string };
export type Keyboard = Button[][];

export async function tg<T = unknown>(env: Env, method: string, body: Record<string, unknown>): Promise<T | undefined> {
  const res = await fetch(`${env.TELEGRAM_API ?? "https://api.telegram.org"}/bot${env.TELEGRAM_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) console.error(`telegram ${method} failed: ${data.description}`);
  return data.result;
}

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Split on line breaks so each chunk stays under Telegram's 4096-char limit. */
export function chunk(text: string, max = 3900): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    if (cur.length + line.length + 1 > max) {
      if (cur) out.push(cur);
      cur = line.slice(0, max);
    } else cur = cur ? `${cur}\n${line}` : line;
  }
  if (cur) out.push(cur);
  return out;
}

export async function send(env: Env, chatId: number, html: string, keyboard?: Keyboard, plain = false): Promise<void> {
  const parts = chunk(html);
  for (let i = 0; i < parts.length; i++) {
    const last = i === parts.length - 1;
    await tg(env, "sendMessage", {
      chat_id: chatId,
      text: parts[i],
      ...(plain ? {} : { parse_mode: "HTML" }),
      link_preview_options: { is_disabled: true },
      ...(last && keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
    });
  }
}

export async function edit(env: Env, chatId: number, messageId: number, html: string, keyboard?: Keyboard): Promise<void> {
  await tg(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: chunk(html)[0],
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: keyboard ?? [] },
  });
}

export async function toast(env: Env, callbackId: string, text?: string): Promise<void> {
  await tg(env, "answerCallbackQuery", { callback_query_id: callbackId, ...(text ? { text } : {}) });
}

export async function typing(env: Env, chatId: number): Promise<void> {
  await tg(env, "sendChatAction", { chat_id: chatId, action: "typing" });
}

export async function downloadFile(env: Env, fileId: string): Promise<{ bytes: ArrayBuffer; path: string } | undefined> {
  const file = await tg<{ file_path?: string }>(env, "getFile", { file_id: fileId });
  if (!file?.file_path) return undefined;
  const res = await fetch(`${env.TELEGRAM_API ?? "https://api.telegram.org"}/file/bot${env.TELEGRAM_TOKEN}/${file.file_path}`);
  if (!res.ok) return undefined;
  return { bytes: await res.arrayBuffer(), path: file.file_path };
}

/** Lay out buttons in rows of `perRow`. */
export function grid(buttons: Button[], perRow: number): Keyboard {
  const rows: Keyboard = [];
  for (let i = 0; i < buttons.length; i += perRow) rows.push(buttons.slice(i, i + perRow));
  return rows;
}
