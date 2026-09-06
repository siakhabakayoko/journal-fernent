/**
 * NVIDIA Build — FLUX.1-dev (primary) + FLUX.1-schnell + optional Qwen-Image
 * + Pollinations fallback for cover generation.
 *
 * FLUX.1-dev:
 *   https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev
 * FLUX.1-schnell:
 *   https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell
 *
 * Response shape (hosted Build API): { artifacts: [{ base64: string, finishReason?: string }] }
 * Also tolerates OpenAI-style { data: [{ b64_json }] } and bare { image }.
 *
 * Optional IMAGE_MODEL=qwen/qwen-image|qwen/qwen-image-2512 tries the OpenAI-compatible
 * images API first (often 404 on free hosted tier — then continues to FLUX).
 */

export const FLUX_DEV_URL =
  "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev";

export const FLUX_SCHNELL_URL =
  "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";

/** OpenAI-compatible NVIDIA Integrate images endpoint (Qwen optional path). */
export const NVIDIA_IMAGES_URL =
  "https://integrate.api.nvidia.com/v1/images/generations";

/** Documented sizes for hosted FLUX (1024 preferred; 512 often 422s). */
export const FLUX_DEFAULT_SIZE = 1024 as const;

/**
 * Primary FLUX.1-dev attempt budget (~10s observed success; hang guard).
 * Vercel Hobby also caps ~60s for the whole route.
 */
export const FLUX_FETCH_TIMEOUT_MS = 45_000;

/** Secondary FLUX.1-schnell attempt budget. */
export const FLUX_SCHNELL_TIMEOUT_MS = 20_000;

/** Overall client/server budget including Pollinations fallback. */
export const COVER_TOTAL_TIMEOUT_MS = 55_000;

export const POLLINATIONS_TIMEOUT_MS = 20_000;

const QWEN_MODELS = new Set(["qwen/qwen-image", "qwen/qwen-image-2512"]);

export type ImageProvider =
  | "nvidia-flux-dev"
  | "nvidia-flux"
  | "nvidia-qwen"
  | "pollinations";

export type FluxGenerateOptions = {
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  cfg_scale?: number;
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
  /** Which backend produced the image. */
  provider: ImageProvider;
  /**
   * Stable public URL when the provider exposes one (Pollinations prompt URLs).
   * Useful as a storage fallback when Blob/FS are unavailable.
   */
  publicUrl?: string;
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

function mergeSignals(
  external: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onExternalAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      if (external) external.removeEventListener("abort", onExternalAbort);
    },
  };
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

function getConfiguredQwenModel(): string | null {
  const model = process.env.IMAGE_MODEL?.trim();
  if (model && QWEN_MODELS.has(model)) return model;
  return null;
}

/**
 * Lightweight check: key present + FLUX URL reachable (OPTIONS/HEAD not always
 * supported — we only verify env here; generation does the real call).
 */
export function fluxHealthStatus(): {
  ok: boolean;
  hasKey: boolean;
  url: string;
  fallback: string;
  message: string;
} {
  const hasKey = hasNvidiaApiKey();
  const qwen = getConfiguredQwenModel();
  return {
    ok: true, // Pollinations fallback always available
    hasKey,
    url: FLUX_DEV_URL,
    fallback: "pollinations",
    message: hasKey
      ? qwen
        ? `NVIDIA_API_KEY présente — chaîne Qwen (${qwen}, souvent 404 hors free tier) → FLUX.1-dev → FLUX.1-schnell → Pollinations.`
        : "NVIDIA_API_KEY présente — FLUX.1-dev puis FLUX.1-schnell puis repli Pollinations. (Qwen-Image n'est pas sur le free hosted tier.)"
      : "NVIDIA_API_KEY absente — génération via Pollinations.",
  };
}

type NvidiaFluxKind = "dev" | "schnell";

/**
 * Shared NVIDIA hosted FLUX invoke (dev or schnell).
 * Body: { prompt, width, height, seed, steps, cfg_scale? }.
 */
export async function generateNvidiaFluxImage(
  url: string,
  prompt: string,
  opts: FluxGenerateOptions & {
    kind?: NvidiaFluxKind;
    provider?: ImageProvider;
  } = {},
): Promise<FluxGenerateResult> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Le prompt est vide.");
  if (trimmed.length > 10000) {
    throw new Error("Le prompt dépasse 10 000 caractères.");
  }

  const kind: NvidiaFluxKind =
    opts.kind ??
    (url.includes("flux.1-dev") ? "dev" : "schnell");
  const provider: ImageProvider =
    opts.provider ?? (kind === "dev" ? "nvidia-flux-dev" : "nvidia-flux");

  const width = opts.width ?? FLUX_DEFAULT_SIZE;
  const height = opts.height ?? FLUX_DEFAULT_SIZE;
  const seed = opts.seed ?? 0;

  let steps: number;
  let cfg_scale: number | undefined;
  let defaultTimeout: number;

  if (kind === "dev") {
    steps = Math.min(50, Math.max(5, opts.steps ?? 28));
    cfg_scale = opts.cfg_scale ?? 3.5;
    defaultTimeout = FLUX_FETCH_TIMEOUT_MS;
  } else {
    steps = Math.min(4, Math.max(1, opts.steps ?? 4));
    cfg_scale = opts.cfg_scale;
    defaultTimeout = FLUX_SCHNELL_TIMEOUT_MS;
  }

  const timeoutMs = opts.timeoutMs ?? defaultTimeout;

  const body: Record<string, unknown> = {
    prompt: trimmed,
    height,
    width,
    seed,
    steps,
  };
  if (cfg_scale != null) body.cfg_scale = cfg_scale;

  const { signal, cleanup } = mergeSignals(opts.signal, timeoutMs);

  const started = Date.now();
  const label = kind === "dev" ? "flux-dev" : "flux-schnell";
  console.info(`[nvidia/${label}] POST`, url, {
    width,
    height,
    steps,
    seed,
    cfg_scale,
    promptLen: trimmed.length,
    timeoutMs,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getNvidiaApiKey()}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
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
      console.error(`[nvidia/${label}] HTTP`, res.status, detail.slice(0, 200));
      throw new Error(
        `NVIDIA FLUX (${kind}) erreur HTTP ${res.status}${detail ? `: ${detail}` : ""}`,
      );
    }

    const rawB64 = extractFluxBase64(json);
    const { base64, mimeType: fromDataUrl } = stripDataUrl(rawB64);
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length < 32) {
      throw new Error("Image générée trop courte — réponse NVIDIA suspecte.");
    }
    const mimeType = fromDataUrl || guessMimeFromBytes(bytes);

    console.info(`[nvidia/${label}] ok`, {
      ms: Date.now() - started,
      bytes: bytes.length,
      mimeType,
    });

    return { bytes, base64, mimeType, provider };
  } catch (err) {
    if (isAbortError(err)) {
      throw new Error(
        `Délai dépassé : la génération FLUX (${kind}) n'a pas répondu à temps (${Math.round(timeoutMs / 1000)} s).`,
      );
    }
    throw err;
  } finally {
    cleanup();
  }
}

/** Primary: NVIDIA Build FLUX.1-dev. */
export async function generateFluxDevImage(
  prompt: string,
  opts: FluxGenerateOptions = {},
): Promise<FluxGenerateResult> {
  return generateNvidiaFluxImage(FLUX_DEV_URL, prompt, {
    ...opts,
    kind: "dev",
    provider: "nvidia-flux-dev",
    // Prefer model defaults unless caller explicitly set steps for dev.
    steps: opts.steps != null && opts.steps >= 5 ? opts.steps : 28,
    timeoutMs: opts.timeoutMs ?? FLUX_FETCH_TIMEOUT_MS,
  });
}

/** Secondary: NVIDIA Build FLUX.1-schnell. */
export async function generateFluxSchnellImage(
  prompt: string,
  opts: FluxGenerateOptions = {},
): Promise<FluxGenerateResult> {
  return generateNvidiaFluxImage(FLUX_SCHNELL_URL, prompt, {
    ...opts,
    kind: "schnell",
    provider: "nvidia-flux",
    steps: 4,
    timeoutMs: opts.timeoutMs ?? FLUX_SCHNELL_TIMEOUT_MS,
  });
}

/**
 * Alias → FLUX.1-dev (primary). Kept for callers that still import generateFluxImage.
 */
export async function generateFluxImage(
  prompt: string,
  opts: FluxGenerateOptions = {},
): Promise<FluxGenerateResult> {
  return generateFluxDevImage(prompt, opts);
}

/**
 * Optional Qwen-Image via OpenAI-compatible Integrate API.
 * Expect 404 on free hosted tier — callers should catch and continue.
 */
export async function generateQwenImage(
  prompt: string,
  opts: FluxGenerateOptions & { model?: string } = {},
): Promise<FluxGenerateResult> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Le prompt est vide.");

  const model = opts.model ?? getConfiguredQwenModel();
  if (!model) {
    throw new Error(
      'IMAGE_MODEL doit être "qwen/qwen-image" ou "qwen/qwen-image-2512".',
    );
  }

  const timeoutMs = opts.timeoutMs ?? 30_000;
  const { signal, cleanup } = mergeSignals(opts.signal, timeoutMs);
  const started = Date.now();

  console.info("[nvidia/qwen] POST", NVIDIA_IMAGES_URL, {
    model,
    promptLen: trimmed.length,
    timeoutMs,
  });

  try {
    const res = await fetch(NVIDIA_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getNvidiaApiKey()}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: trimmed,
        n: 1,
        response_format: "b64_json",
      }),
      signal,
    });

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // keep raw
    }

    if (!res.ok) {
      const detail =
        json && typeof json === "object"
          ? JSON.stringify(json).slice(0, 500)
          : text.slice(0, 500);
      console.error("[nvidia/qwen] HTTP", res.status, detail.slice(0, 200));
      throw new Error(
        `NVIDIA Qwen erreur HTTP ${res.status}${detail ? `: ${detail}` : ""}`,
      );
    }

    const rawB64 = extractFluxBase64(json);
    const { base64, mimeType: fromDataUrl } = stripDataUrl(rawB64);
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length < 32) {
      throw new Error("Image Qwen trop courte — réponse NVIDIA suspecte.");
    }
    const mimeType = fromDataUrl || guessMimeFromBytes(bytes);

    console.info("[nvidia/qwen] ok", {
      ms: Date.now() - started,
      bytes: bytes.length,
      mimeType,
    });

    return { bytes, base64, mimeType, provider: "nvidia-qwen" };
  } catch (err) {
    if (isAbortError(err)) {
      throw new Error(
        `Délai dépassé : Qwen-Image n'a pas répondu à temps (${Math.round(timeoutMs / 1000)} s).`,
      );
    }
    throw err;
  } finally {
    cleanup();
  }
}

/**
 * Build a publicly fetchable Pollinations image URL for a prompt.
 * Same encoding rules as generatePollinationsImage (prompt truncated to 1200).
 */
export function buildPollinationsImageUrl(
  prompt: string,
  opts: { width?: number; height?: number } = {},
): string {
  const shortPrompt = prompt.trim().slice(0, 1200);
  const width = opts.width ?? FLUX_DEFAULT_SIZE;
  const height = opts.height ?? FLUX_DEFAULT_SIZE;
  const model =
    process.env.IMAGE_MODEL?.trim() ||
    process.env.POLLINATIONS_MODEL?.trim() ||
    "flux";
  // Stronger photojournalism cue for Pollinations FLUX fallback covers.
  const boosted =
    /photojournal|editorial|documentary|press photo/i.test(shortPrompt)
      ? shortPrompt
      : `${shortPrompt} Magnum-style documentary photojournalism, photorealistic press photography, natural light, high detail, no text`;
  return (
    `https://image.pollinations.ai/prompt/${encodeURIComponent(boosted.slice(0, 1200))}` +
    `?width=${width}&height=${height}&nologo=true&model=${encodeURIComponent(model)}`
  );
}

/**
 * Fast Pollinations text-to-image fallback (returns JPEG/PNG in ~2–3s).
 * https://image.pollinations.ai/prompt/{encodeURIComponent(prompt)}?...
 */
export async function generatePollinationsImage(
  prompt: string,
  opts: {
    width?: number;
    height?: number;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<FluxGenerateResult> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Le prompt est vide.");

  const width = opts.width ?? FLUX_DEFAULT_SIZE;
  const height = opts.height ?? FLUX_DEFAULT_SIZE;
  const timeoutMs = opts.timeoutMs ?? POLLINATIONS_TIMEOUT_MS;

  // Keep prompt reasonably short for URL length limits.
  const shortPrompt = trimmed.slice(0, 1200);
  const url = buildPollinationsImageUrl(trimmed, { width, height });

  const { signal, cleanup } = mergeSignals(opts.signal, timeoutMs);
  const started = Date.now();
  console.info("[pollinations] GET", {
    width,
    height,
    promptLen: shortPrompt.length,
    timeoutMs,
  });

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "image/*" },
      signal,
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`Pollinations erreur HTTP ${res.status}`);
    }

    const ab = await res.arrayBuffer();
    const bytes = Buffer.from(ab);
    if (bytes.length < 32) {
      throw new Error("Image Pollinations trop courte.");
    }
    const mimeType =
      res.headers.get("content-type")?.split(";")[0]?.trim() ||
      guessMimeFromBytes(bytes);
    const base64 = bytes.toString("base64");

    console.info("[pollinations] ok", {
      ms: Date.now() - started,
      bytes: bytes.length,
      mimeType,
    });

    return { bytes, base64, mimeType, provider: "pollinations", publicUrl: url };
  } catch (err) {
    if (isAbortError(err)) {
      throw new Error(
        `Délai dépassé : Pollinations n'a pas répondu à temps (${Math.round(timeoutMs / 1000)} s).`,
      );
    }
    throw err;
  } finally {
    cleanup();
  }
}

/**
 * Cover chain: optional Qwen (if IMAGE_MODEL) → FLUX.1-dev → FLUX.1-schnell → Pollinations.
 */
export async function generateCoverImage(
  prompt: string,
  opts: FluxGenerateOptions = {},
): Promise<FluxGenerateResult> {
  const width = opts.width ?? FLUX_DEFAULT_SIZE;
  const height = opts.height ?? FLUX_DEFAULT_SIZE;
  const shared = { width, height, seed: opts.seed, signal: opts.signal };

  if (hasNvidiaApiKey()) {
    const qwenModel = getConfiguredQwenModel();
    if (qwenModel) {
      try {
        return await generateQwenImage(prompt, {
          ...shared,
          model: qwenModel,
          timeoutMs: 30_000,
        });
      } catch (err) {
        console.warn(
          "[cover] NVIDIA Qwen failed (often 404 on free tier), continuing:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    try {
      return await generateFluxDevImage(prompt, {
        ...shared,
        cfg_scale: opts.cfg_scale,
        // Ignore legacy steps:4 from callers — flux-dev defaults to 28.
        steps: opts.steps != null && opts.steps >= 5 ? opts.steps : 28,
        timeoutMs: opts.timeoutMs ?? FLUX_FETCH_TIMEOUT_MS,
      });
    } catch (err) {
      console.warn(
        "[cover] NVIDIA FLUX.1-dev failed, trying FLUX.1-schnell:",
        err instanceof Error ? err.message : err,
      );
    }

    try {
      return await generateFluxSchnellImage(prompt, {
        ...shared,
        timeoutMs: FLUX_SCHNELL_TIMEOUT_MS,
      });
    } catch (err) {
      console.warn(
        "[cover] NVIDIA FLUX.1-schnell failed, falling back to Pollinations:",
        err instanceof Error ? err.message : err,
      );
    }
  } else {
    console.info("[cover] no NVIDIA_API_KEY — using Pollinations");
  }

  return generatePollinationsImage(prompt, {
    width,
    height,
    signal: opts.signal,
    timeoutMs: POLLINATIONS_TIMEOUT_MS,
  });
}
