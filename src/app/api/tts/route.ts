import { NextResponse } from "next/server";
import { hasNvidiaApiKey } from "@/lib/nvidia";
import { synthesizeFrenchSpeech } from "@/lib/nvidia-tts";

export const runtime = "nodejs";
/** Long articles may need several Magpie chunks. */
export const maxDuration = 300;

const MAX_TEXT = 60_000;

/** Simple in-memory rate limit (per isolate). */
const hits = new Map<string, { count: number; reset: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8;

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
    magpieKeyConfigured: hasNvidiaApiKey(),
    providers: ["magpie", "edge-tts"],
    message: hasNvidiaApiKey()
      ? "Magpie TTS disponible (clé NVIDIA présente)."
      : "Clé NVIDIA absente — repli Edge TTS neural (fr-FR-DeniseNeural).",
  });
}

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request))) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Trop de demandes audio. Réessayez dans une minute.",
      },
      { status: 429 },
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

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "invalid", message: "Requête invalide." },
      { status: 400 },
    );
  }

  const { text } = body as { text?: unknown };
  const textStr = typeof text === "string" ? text.trim() : "";
  if (!textStr) {
    return NextResponse.json(
      { error: "missing_text", message: "Le texte à lire est requis." },
      { status: 400 },
    );
  }
  if (textStr.length > MAX_TEXT) {
    return NextResponse.json(
      {
        error: "text_too_long",
        message: `Texte trop long (${MAX_TEXT} caractères max).`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await synthesizeFrenchSpeech(textStr, {
      signal: request.signal,
    });
    return new NextResponse(new Uint8Array(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Cache-Control": "no-store",
        "X-TTS-Provider": result.provider,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Échec de la synthèse vocale.";
    console.error("[tts]", message);
    const unavailable =
      /indisponible|manquant|échoué|failed/i.test(message) &&
      !hasNvidiaApiKey();
    return NextResponse.json(
      { error: "tts_failed", message },
      { status: unavailable ? 503 : 502 },
    );
  }
}
