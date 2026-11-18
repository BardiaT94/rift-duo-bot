// Optional Claude features: read a draft/loading-screen screenshot, and a coach that
// can search the web for the current patch. Enabled when ANTHROPIC_API_KEY is set.

import Anthropic from "@anthropic-ai/sdk";
import { CHAMPIONS } from "./data/champions.ts";
import { PATCH, POOL } from "./data/pool.ts";
import type { Env } from "./telegram.ts";

const MODEL = "claude-opus-5-5";
// Server-side fallback: if a request is declined by a safety classifier, the API
// re-runs it on Anthropic's recommended fallback model instead of returning a refusal.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

function client(env: Env): Anthropic {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
}

export interface ScreenshotResult {
  screen: "draft" | "loading" | "in_game" | "scoreboard" | "other";
  team_a: string[];
  team_b: string[];
  team_a_position: string;
  notes: string;
}

function toBase64(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(bin);
}

const NAMES = CHAMPIONS.map((c) => c.name);

export async function readScreenshot(env: Env, bytes: ArrayBuffer, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<ScreenshotResult> {
  const nameList = { type: "array", items: { type: "string", enum: [...NAMES, "Unknown"] } };
  const res = await client(env).beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    ...FALLBACK,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            screen: { type: "string", enum: ["draft", "loading", "in_game", "scoreboard", "other"] },
            team_a: nameList,
            team_b: nameList,
            team_a_position: { type: "string" },
            notes: { type: "string" },
          },
          required: ["screen", "team_a", "team_b", "team_a_position", "notes"],
          additionalProperties: false,
        },
      },
    },
    system:
      "You read League of Legends: Wild Rift screenshots (champion select / draft, loading screen, in-game scoreboard). " +
      "Identify every picked champion on each team from portraits, splash art and visible names. " +
      "team_a is the team shown first (left side, or top row); team_b is the other. " +
      "Use exact names from the allowed list; use \"Unknown\" for a slot you can't identify; omit empty slots. " +
      "Ignore banned champions (greyed out or in the ban row). In notes, mention bans you see and anything uncertain, in one short sentence.",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: toBase64(bytes) } },
          { type: "text", text: "List the champions on each team." },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined to read this image.");
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = JSON.parse(text) as ScreenshotResult;
  const clean = (l: string[]) => [...new Set(l.filter((n) => n !== "Unknown"))].slice(0, 5);
  return { ...parsed, team_a: clean(parsed.team_a), team_b: clean(parsed.team_b) };
}

function poolSummary(): string {
  return Object.values(POOL)
    .map((c) => `- ${c.name} (${c.owner}): runes ${c.runes}; core ${c.builds[0].items.join(" > ")}; spells ${c.spells}`)
    .join("\n");
}

const COACH_SYSTEM = `You are a Wild Rift (mobile League of Legends) duo coach in a Telegram chat for a couple who play bot lane together.
- The support player plays: Sona, Yuumi, Seraphine, Lulu, Leona, Zyra.
- The ADC player plays: Miss Fortune, Jinx, Jhin, Caitlyn, Zeri, Twitch.
The bot's stored data is from Wild Rift patch ${PATCH}. Wild Rift differs from PC League (ultimates unlock at level 5, different items, boots and runes, shorter games), so search the web for Wild Rift-specific, current information when the question depends on items, runes, numbers, patch changes or the meta. Prefer wildrift.leagueoflegends.com patch notes, wildriftfire.com, wr-meta.com, wildriftcore.com.
Answer for a phone screen: plain text, no markdown, no tables, short lines. Lead with the answer. Use their names when giving per-player advice. Keep it under 1200 characters unless the question needs a list of changes.`;

export async function coach(env: Env, question: string, context: string): Promise<string> {
  const c = client(env);
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Current game context:\n${context || "(no game in progress)"}\n\nStored builds (patch ${PATCH}):\n${poolSummary()}\n\nQuestion: ${question}`,
    },
  ];
  for (let turn = 0; turn < 4; turn++) {
    const res = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      output_config: { effort: "medium" },
      system: COACH_SYSTEM,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
      messages,
    });
    if (res.stop_reason === "refusal") return "Sorry, I can't help with that one.";
    if (res.stop_reason === "pause_turn") {
      // Server-side search loop paused; send the partial turn back and it resumes.
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    const text = res.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
    return text || "No answer came back. Try asking again.";
  }
  return "The search took too long. Try a narrower question.";
}

export function aiErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Claude API key is invalid. Check the ANTHROPIC_API_KEY secret.";
  if (err instanceof Anthropic.RateLimitError) return "Claude is rate-limited right now. Try again in a minute.";
  if (err instanceof Anthropic.APIError) return `Claude API error ${err.status ?? ""}. Try again.`;
  if (err instanceof SyntaxError) return "Couldn't read the result. Try a clearer screenshot.";
  return err instanceof Error ? err.message : "Something went wrong.";
}
