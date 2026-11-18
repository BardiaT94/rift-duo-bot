// Cloudflare Worker entry: Telegram webhook + one-time setup route.

import { handleUpdate, type TgUpdate } from "./bot.ts";
import { tg, type Env } from "./telegram.ts";

export { ChatState } from "./state.ts";

const COMMANDS = [
  ["new", "New game: pick enemy bot lane, get best duo"],
  ["plan", "Show the game plan"],
  ["vs", "Enemy bot lane, e.g. /vs kaisa nautilus"],
  ["enemy", "Enemy team, e.g. /enemy ahri lee jinx thresh darius"],
  ["we", "Lock our picks, e.g. /we lulu jinx"],
  ["build", "Builds for a champion"],
  ["champ", "Full guide for a champion"],
  ["duo", "All 36 duos ranked"],
  ["bans", "Ban suggestions"],
  ["t", "Enemy spell timers"],
  ["fed", "Someone is fed: what to buy next"],
  ["ask", "Ask the coach (AI, current patch)"],
  ["win", "Save a win"],
  ["loss", "Save a loss"],
  ["stats", "Our win rates"],
  ["note", "Personal note on a champion"],
  ["patch", "Check newest patch for our champs"],
  ["buttons", "Draft with plain buttons"],
  ["help", "Everything the bot can do"],
] as const;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/webhook" && req.method === "POST") {
      if (req.headers.get("x-telegram-bot-api-secret-token") !== env.WEBHOOK_SECRET) {
        return new Response("forbidden", { status: 403 });
      }
      const update = (await req.json()) as TgUpdate;
      // Handled inline so long AI calls aren't cut off; duplicates from Telegram
      // retries are dropped by update_id in the chat's Durable Object.
      await handleUpdate(env, update);
      return new Response("ok");
    }

    // Visit once after deploy: https://<worker>/setup?secret=<WEBHOOK_SECRET>
    if (url.pathname === "/setup") {
      if (!env.WEBHOOK_SECRET || url.searchParams.get("secret") !== env.WEBHOOK_SECRET) {
        return new Response("forbidden", { status: 403 });
      }
      const hook = await tg(env, "setWebhook", {
        url: `${url.origin}/webhook`,
        secret_token: env.WEBHOOK_SECRET,
        allowed_updates: ["message", "callback_query", "widget_query", "shared_widget_query"],
        drop_pending_updates: true,
      });
      const cmds = await tg(env, "setMyCommands", {
        commands: COMMANDS.map(([command, description]) => ({ command, description })),
      });
      return Response.json({ webhook: hook ?? "failed (check TELEGRAM_TOKEN)", commands: cmds ?? "failed" });
    }

    return new Response("Rift Duo bot is running.");
  },
} satisfies ExportedHandler<Env>;
