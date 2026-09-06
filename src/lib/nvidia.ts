/**
 * NVIDIA Build — FLUX.1-schnell image generation client.
 * Docs: https://docs.api.nvidia.com/nim/reference/black-forest-labs-flux_1-schnell-infer
 *
 * Response shape (hosted Build API): { artifacts: [{ base64: string, finishReason?: string }] }
 * Also tolerates OpenAI-style { data: [{ b64_json }] } and bare { image }.
 */

export const FLUX_SCHNELL_URL =
  "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";

export type FluxGenerateOptions = {
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
};

export type FluxGenerateResult = {
  /** Raw image bytes (PNG/JPEG as returned by the API). */
  bytes: Buffer;
  /** Base64 string without data-URL prefix. */
  base64: string;
  /** Best-effort MIME type. */
  mimeType: string;
};

function nvidiaApiKey(): string {
  const key = process.env.NVIDIA_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "NVIDIA_API_KEY manquant — configurez la variable d'environnement (Vercel / .env.local).",
    );
  }
  return key;
}

function stripDataUrl(b64: string): { base64: string; mimeType?: string } {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(b64.trim());
  if (m) return { mimeType: m[1], base64: m[2] };
  return { base64: b64.trim() };
}

function guessMimeFromBytes(buf: Buffer): string {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.length >= 4 && buf[0] === 0x52 && buf[1] === 0x49) return "image/webp";
  return "image/png";
}

/** Extract base64 image payload from various NVIDIA / NIM response shapes. */
export function extractFluxBase64(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new Error("Réponse NVIDIA invalide (corps vide).");
  }
  const obj = payload as Record<string, unknown>;

  const artifacts = obj.artifacts;
  if (Array.isArray(artifacts) && artifacts.length > 0) {
    const first = artifacts[0] as Record<string, unknown>;
    const candidate =
      (typeof first.base64 === "string" && first.base64) ||
      (typeof first.b64_json === "string" && first.b64_json) ||
      (typeof first.image === "string" && first.image) ||
      null;
    if (candidate) return candidate;
  }

  if (typeof obj.image === "string" && obj.image) return obj.image;
  if (typeof obj.base64 === "string" && obj.base64) return obj.base64;

  const data = obj.data;
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as Record<string, unknown>;
    const candidate =
      (typeof first.b64_json === "string" && first.b64_json) ||
      (typeof first.base64 === "string" && first.base64) ||
      (typeof first.url === "string" && first.url.startsWith("data:") && first.url) ||
      null;
    if (candidate) return candidate;
  }

  throw new Error(
    "Réponse NVIDIA sans image (attendu: artifacts[0].base64).",
  );
}

/**
 * Call NVIDIA Build FLUX.1-schnell and return image bytes + base64.
 */
export async function generateFluxImage(
  prompt: string,
  opts: FluxGenerateOptions = {},
): Promise<FluxGenerateResult> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Le prompt est vide.");
  if (trimmed.length > 10000) {
    throw new Error("Le prompt dépasse 10 000 caractères.");
  }

  const width = opts.width ?? 1024;
  const height = opts.height ?? 1024;
  const seed = opts.seed ?? 0;
  const steps = Math.min(4, Math.max(1, opts.steps ?? 4));

  const body = {
    prompt: trimmed,
    width,
    height,
    seed,
    steps,
  };

  const res = await fetch(FLUX_SCHNELL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${nvidiaApiKey()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text for error message
  }

  if (!res.ok) {
    const detail =
      json && typeof json === "object"
        ? JSON.stringify(json).slice(0, 500)
        : text.slice(0, 500);
    throw new Error(
      `NVIDIA FLUX erreur HTTP ${res.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  const rawB64 = extractFluxBase64(json);
  const { base64, mimeType: fromDataUrl } = stripDataUrl(rawB64);
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length < 32) {
    throw new Error("Image générée trop courte — réponse NVIDIA suspecte.");
  }
  const mimeType = fromDataUrl || guessMimeFromBytes(bytes);

  return { bytes, base64, mimeType };
}
