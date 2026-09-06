/**
 * NVIDIA Magpie TTS Multilingual (French) + Microsoft Edge neural fallback.
 *
 * Magpie HTTP (build.nvidia.com):
 *   POST https://877104f7-e885-42b9-8de8-f6e4c6303969.invocation.api.nvcf.nvidia.com/v1/audio/synthesize
 *   multipart: text, language, voice, encoding, sample_rate_hz → audio/wav
 *   Max ~2000 normalized characters per request.
 */

import { getNvidiaApiKey, hasNvidiaApiKey } from "@/lib/nvidia";

export const MAGPIE_FUNCTION_ID = "877104f7-e885-42b9-8de8-f6e4c6303969";
export const MAGPIE_SYNTHESIZE_URL = `https://${MAGPIE_FUNCTION_ID}.invocation.api.nvcf.nvidia.com/v1/audio/synthesize`;
export const MAGPIE_LIST_VOICES_URL = `https://${MAGPIE_FUNCTION_ID}.invocation.api.nvcf.nvidia.com/v1/audio/list_voices`;

/** Neutral French female voice on Magpie Multilingual. */
export const MAGPIE_FR_VOICE = "Magpie-Multilingual.FR-FR.Louise";
export const MAGPIE_LANGUAGE = "fr-FR";
export const MAGPIE_SAMPLE_RATE = 22050;
/** Stay under 2000 after normalization. */
export const MAGPIE_MAX_CHARS = 1600;

export type TtsProvider = "magpie" | "edge-tts";

export type TtsResult = {
  bytes: Buffer;
  mimeType: string;
  provider: TtsProvider;
};

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  return name === "AbortError" || name === "TimeoutError";
}

/** Split text into Magpie-sized chunks on sentence/paragraph boundaries. */
export function chunkTextForTts(
  text: string,
  maxLen = MAGPIE_MAX_CHARS,
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (normalized.length <= maxLen) return [normalized];

  const sentences =
    normalized.match(/[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g) ?? [normalized];
  const chunks: string[] = [];
  let current = "";

  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length > maxLen) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < s.length; i += maxLen) {
        chunks.push(s.slice(i, i + maxLen));
      }
      continue;
    }
    if (current && `${current} ${s}`.length > maxLen) {
      chunks.push(current);
      current = s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function findWavDataChunk(wav: Buffer): {
  pcm: Buffer;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
} {
  if (wav.length < 44 || wav.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error("Audio Magpie invalide (pas un WAV RIFF).");
  }
  let offset = 12;
  let sampleRate = MAGPIE_SAMPLE_RATE;
  let channels = 1;
  let bitsPerSample = 16;
  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    if (id === "fmt " && size >= 16) {
      channels = wav.readUInt16LE(dataStart);
      sampleRate = wav.readUInt32LE(dataStart + 4);
      bitsPerSample = wav.readUInt16LE(dataStart + 14);
    } else if (id === "data") {
      return {
        pcm: wav.subarray(dataStart, dataStart + size),
        sampleRate,
        channels,
        bitsPerSample,
      };
    }
    offset = dataStart + size + (size % 2);
  }
  throw new Error("Audio Magpie invalide (chunk data manquant).");
}

function buildWav(
  pcm: Buffer,
  sampleRate: number,
  channels: number,
  bitsPerSample: number,
): Buffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export function concatWavBuffers(parts: Buffer[]): Buffer {
  if (parts.length === 0) throw new Error("Aucun segment audio.");
  if (parts.length === 1) return parts[0];
  const parsed = parts.map(findWavDataChunk);
  const { sampleRate, channels, bitsPerSample } = parsed[0];
  for (const p of parsed) {
    if (
      p.sampleRate !== sampleRate ||
      p.channels !== channels ||
      p.bitsPerSample !== bitsPerSample
    ) {
      throw new Error("Segments audio incompatibles (taux / canaux).");
    }
  }
  const pcm = Buffer.concat(parsed.map((p) => p.pcm));
  return buildWav(pcm, sampleRate, channels, bitsPerSample);
}

async function synthesizeMagpieChunk(
  text: string,
  signal?: AbortSignal,
): Promise<Buffer> {
  const form = new FormData();
  form.append("text", text);
  form.append("language", MAGPIE_LANGUAGE);
  form.append("voice", MAGPIE_FR_VOICE);
  form.append("encoding", "LINEAR_PCM");
  form.append("sample_rate_hz", String(MAGPIE_SAMPLE_RATE));

  const res = await fetch(MAGPIE_SYNTHESIZE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getNvidiaApiKey()}`,
    },
    body: form,
    signal,
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 400);
    throw new Error(
      `Magpie TTS erreur HTTP ${res.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  if (buf.length < 44) {
    throw new Error("Réponse Magpie trop courte.");
  }
  return buf;
}

/**
 * Synthesize French speech with Magpie (chunked), returning a single WAV.
 */
export async function synthesizeMagpieFrench(
  text: string,
  opts: { signal?: AbortSignal } = {},
): Promise<TtsResult> {
  if (!hasNvidiaApiKey()) {
    throw new Error(
      "NVIDIA_API_KEY manquant — synthèse Magpie indisponible.",
    );
  }
  const chunks = chunkTextForTts(text);
  if (chunks.length === 0) throw new Error("Texte vide.");

  const wavs: Buffer[] = [];
  for (const chunk of chunks) {
    console.info("[nvidia/tts] magpie chunk", { len: chunk.length });
    wavs.push(await synthesizeMagpieChunk(chunk, opts.signal));
  }

  return {
    bytes: concatWavBuffers(wavs),
    mimeType: "audio/wav",
    provider: "magpie",
  };
}

/**
 * Microsoft Edge neural French voice (Denise) — fallback when Magpie fails.
 */
export async function synthesizeEdgeFrench(
  text: string,
): Promise<TtsResult> {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    "fr-FR-DeniseNeural",
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
  );

  const chunks = chunkTextForTts(text, 2500);
  if (chunks.length === 0) throw new Error("Texte vide.");

  const parts: Buffer[] = [];
  for (const chunk of chunks) {
    console.info("[nvidia/tts] edge-tts chunk", { len: chunk.length });
    const { audioStream } = tts.toStream(chunk);
    const buffers: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on("data", (b: Buffer) => buffers.push(Buffer.from(b)));
      audioStream.on("end", () => resolve());
      audioStream.on("error", reject);
    });
    parts.push(Buffer.concat(buffers));
  }

  return {
    bytes: Buffer.concat(parts),
    mimeType: "audio/mpeg",
    provider: "edge-tts",
  };
}

/**
 * Prefer Magpie; fall back to Edge neural French on failure.
 */
export async function synthesizeFrenchSpeech(
  text: string,
  opts: { signal?: AbortSignal; prefer?: TtsProvider } = {},
): Promise<TtsResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Texte vide.");
  if (trimmed.length > 80_000) {
    throw new Error("Texte trop long pour la synthèse vocale (80 000 car. max).");
  }

  const prefer = opts.prefer ?? "magpie";

  if (prefer === "magpie" && hasNvidiaApiKey()) {
    try {
      return await synthesizeMagpieFrench(trimmed, { signal: opts.signal });
    } catch (err) {
      if (isAbortError(err)) {
        throw new Error(
          "Délai dépassé pendant la synthèse Magpie. Réessayez.",
        );
      }
      console.warn(
        "[nvidia/tts] Magpie failed, falling back to edge-tts:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  try {
    return await synthesizeEdgeFrench(trimmed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Synthèse vocale indisponible (Magpie et Edge TTS ont échoué) : ${msg}`,
    );
  }
}
