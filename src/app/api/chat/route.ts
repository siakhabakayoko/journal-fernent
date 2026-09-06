import { NextResponse } from "next/server";
import { hasNvidiaApiKey } from "@/lib/nvidia";
import { answerWithRag } from "@/lib/rag";
import type { ChatMessage } from "@/lib/rag";

export const runtime = "nodejs";
/** Embed + retrieve + LLM; stay under Hobby ~60s. */
export const maxDuration = 60;

const hits = new Map<string, { count: number; reset: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon"
  );
}

function rateLimit(key: string): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.reset) {
    hits.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (cur.count >= RATE_MAX) return false;
  cur.count += 1;
  return true;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    nvidiaKeyConfigured: hasNvidiaApiKey(),
    message: hasNvidiaApiKey()
      ? "Assistant Ferñent prêt (corpus du site uniquement)."
      : "NVIDIA_API_KEY absente — le chat ne pourra pas répondre.",
  });
}

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request))) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Trop de messages. Réessayez dans une minute.",
      },
      { status: 429 },
    );
  }

  if (!hasNvidiaApiKey()) {
    return NextResponse.json(
      {
        error: "config",
        message:
          "Assistant indisponible : clé NVIDIA non configurée sur le serveur.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Corps JSON invalide." },
      { status: 400 },
    );
  }

  const messagesRaw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(messagesRaw) || messagesRaw.length === 0) {
    return NextResponse.json(
      {
        error: "invalid_messages",
        message: "Attendu: { messages: [{ role, content }] }",
      },
      { status: 400 },
    );
  }

  const messages: ChatMessage[] = [];
  for (const m of messagesRaw.slice(-12)) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: string }).role;
    const content = (m as { content?: unknown }).content;
    if (
      (role === "user" || role === "assistant") &&
      typeof content === "string" &&
      content.trim()
    ) {
      messages.push({
        role,
        content: content.trim().slice(0, 4000),
      });
    }
  }

  if (!messages.some((m) => m.role === "user")) {
    return NextResponse.json(
      { error: "invalid_messages", message: "Au moins un message utilisateur." },
      { status: 400 },
    );
  }

  try {
    const result = await answerWithRag(messages);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/chat]", err);
    return NextResponse.json(
      {
        error: "chat_failed",
        message:
          err instanceof Error
            ? err.message
            : "Impossible de répondre pour le moment.",
      },
      { status: 502 },
    );
  }
}
