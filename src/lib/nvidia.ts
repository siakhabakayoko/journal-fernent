/**
 * NVIDIA Build — FLUX.1-schnell image generation client.
 * Docs: https://docs.api.nvidia.com/nim/reference/black-forest-labs-flux_1-schnell-infer
 *
 * Hosted invoke URL uses a DOT in the model id:
 *   https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell
 * (underscore path 404s).
 *
 * Response shape (hosted Build API): { artifacts: [{ base64: string, finishReason?: string }] }
 * Also tolerates OpenAI-style { data: [{ b64_json }] } and bare { image }.
 */

export const FLUX_SCHNELL_URL =
  "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";

/** Documented sizes for hosted FLUX.1-schnell (1024 preferred; 512 often 422s). */
export const FLUX_DEFAULT_SIZE = 1024 as const;

/** Server-side fetch budget (ms). Keep under Vercel maxDuration. */
export const FLUX_FETCH_TIMEOUT_MS = 270_000;

export type FluxGenerateOptions = {
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  /** AbortSignal or timeout override (ms). */
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type FluxGenerateResult = {
  /** Raw image bytes (PNG/JPEG as returned by the API). */
  bytes: Buffer;
  /** Base64 string without data-URL prefix. */
  base64: string;
  /** Best-effort MIME type. */
  mimeType: string;
};

export function hasNvidiaApiKey(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY?.trim());
}

export function getNvidiaApiKey(): string {
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

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  return name === "AbortError" || name === "TimeoutError";
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
 * Lightweight check: key present + FLUX URL reachable (OPTIONS/HEAD not always
 * supported — we only verify env here; generation does the real call).
 */
export function fluxHealthStatus(): {
  ok: boolean;
  hasKey: boolean;
  url: string;
  message: string;
} {
  const hasKey = hasNvidiaApiKey();
  return {
    ok: hasKey,
    hasKey,
    url: FLUX_SCHNELL_URL,
    message: hasKey
      ? "NVIDIA_API_KEY présente — prêt pour FLUX.1-schnell."
      : "NVIDIA_API_KEY absente.",
  };
}

/**
 * Call NVIDIA Build FLUX.1-schnell and return image bytes + base64.
 * Body matches the documented Infer contract (cfg_scale, mode, samples, seed, steps).
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

  const width = opts.width ?? FLUX_DEFAULT_SIZE;
  const height = opts.height ?? FLUX_DEFAULT_SIZE;
  const seed = opts.seed ?? 0;
  const steps = Math.min(4, Math.max(1, opts.steps ?? 4));
  const timeoutMs = opts.timeoutMs ?? FLUX_FETCH_TIMEOUT_MS;

  // Documented hosted Infer payload (only 1024×1024 reliably accepted).
  const body = {
    prompt: trimmed,
    height,
    width,
    cfg_scale: 0,
    mode: "base",
    samples: 1,
    seed,
    steps,
  };

  const controller = new AbortController();
  const external = opts.signal;
  const onExternalAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onExternalAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const started = Date.now();
  console.info("[nvidia/flux] POST", FLUX_SCHNELL_URL, {
    width,
    height,
    steps,
    seed,
    promptLen: trimmed.length,
  });

  try {
    const res = await fetch(FLUX_SCHNELL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getNvidiaApiKey()}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
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
      console.error("[nvidia/flux] HTTP", res.status, detail.slice(0, 200));
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

    console.info("[nvidia/flux] ok", {
      ms: Date.now() - started,
      bytes: bytes.length,
      mimeType,
    });

    return { bytes, base64, mimeType };
  } catch (err) {
    if (isAbortError(err)) {
      throw new Error(
        `Délai dépassé : la génération FLUX n'a pas répondu à temps (${Math.round(timeoutMs / 1000)} s). Réessayez ou vérifiez NVIDIA Build.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (external) external.removeEventListener("abort", onExternalAbort);
  }
}
