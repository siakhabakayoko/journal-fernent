/**
 * NVIDIA Build / NIM clients for RAG (embed + chat).
 * Base: https://integrate.api.nvidia.com/v1
 *
 * Embed (preferred): nvidia/nemotron-3-embed-1b
 * Chat (working on trial key): moonshotai/kimi-k3 → mistralai/mistral-nemotron
 *   → nvidia/nemotron-3.5-lightning-30b-a3b
 *
 * Rerank catalog endpoint for llama-nemotron-rerank-1b-v2 is EOL (410) on this key —
 * we use cosine + light lexical boost instead.
 */

import { getNvidiaApiKey, hasNvidiaApiKey } from "@/lib/nvidia";

export const NVIDIA_INTEGRATE_BASE = "https://integrate.api.nvidia.com/v1";

export const RAG_EMBED_MODEL =
  process.env.NVIDIA_EMBED_MODEL?.trim() || "nvidia/nemotron-3-embed-1b";

/** Ordered chat fallbacks. Override with NVIDIA_CHAT_MODEL (single model). */
export const RAG_CHAT_MODELS = (
  process.env.NVIDIA_CHAT_MODEL?.trim()
    ? [process.env.NVIDIA_CHAT_MODEL.trim()]
    : [
        "moonshotai/kimi-k3",
        "mistralai/mistral-nemotron",
        "nvidia/nemotron-3.5-lightning-30b-a3b",
      ]
) as string[];

const EMBED_TIMEOUT_MS = 45_000;
const CHAT_TIMEOUT_MS = 50_000;

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  return name === "AbortError" || name === "TimeoutError";
}

async function fetchJson(
  url: string,
  init: RequestInit & { timeoutMs?: number },
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const timeoutMs = init.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${getNvidiaApiKey()}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* keep text */
    }
    return { ok: res.ok, status: res.status, json, text };
  } catch (err) {
    if (isAbortError(err)) {
      throw new Error(`Délai NVIDIA dépassé (${Math.round(timeoutMs / 1000)} s).`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export type EmbedInputType = "query" | "passage";

export async function embedTexts(
  texts: string[],
  inputType: EmbedInputType,
): Promise<{ embeddings: number[][]; model: string; dimensions: number }> {
  if (!texts.length) return { embeddings: [], model: RAG_EMBED_MODEL, dimensions: 0 };
  if (!hasNvidiaApiKey()) {
    throw new Error("NVIDIA_API_KEY manquante pour les embeddings RAG.");
  }

  const batchSize = 16;
  const all: number[][] = [];
  let model = RAG_EMBED_MODEL;
  let dimensions = 0;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => t.slice(0, 8000));
    const body: Record<string, unknown> = {
      model: RAG_EMBED_MODEL,
      input: batch,
      encoding_format: "float",
      input_type: inputType,
      truncate: "END",
    };

    const { ok, status, json, text } = await fetchJson(
      `${NVIDIA_INTEGRATE_BASE}/embeddings`,
      {
        method: "POST",
        body: JSON.stringify(body),
        timeoutMs: EMBED_TIMEOUT_MS,
      },
    );

    if (!ok) {
      throw new Error(
        `NVIDIA embeddings HTTP ${status}: ${(text || JSON.stringify(json)).slice(0, 400)}`,
      );
    }

    const data = (json as { data?: Array<{ embedding: number[]; index?: number }>; model?: string })
      ?.data;
    if (!Array.isArray(data) || data.length !== batch.length) {
      throw new Error("Réponse embeddings NVIDIA inattendue.");
    }
    const ordered = [...data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    for (const row of ordered) {
      all.push(row.embedding);
      dimensions = row.embedding.length;
    }
    model = (json as { model?: string })?.model || RAG_EMBED_MODEL;
  }

  return { embeddings: all, model, dimensions };
}

/** Strip leaked chain-of-thought / thinking dumps from some Nemotron models. */
export function sanitizeChatContent(raw: string): string {
  let s = raw.trim();
  // Common English thinking preamble
  if (/here'?s a thinking process/i.test(s) || /^thinking process:/i.test(s)) {
    // Prefer text after final answer markers
    const markers = [
      /\n(?:Final answer|Answer|Réponse(?: finale)?)\s*:\s*/i,
      /\n#{1,3}\s*(?:Final answer|Answer|Réponse)\b/i,
    ];
    for (const re of markers) {
      const m = re.exec(s);
      if (m && m.index != null) {
        s = s.slice(m.index + m[0].length).trim();
        break;
      }
    }
    // If still looks like CoT, drop lines that are numbered analysis
    if (/here'?s a thinking process/i.test(s)) {
      const parts = s.split(/\n{2,}/);
      const last = parts[parts.length - 1]?.trim() || "";
      if (last && !/thinking process/i.test(last) && last.length > 40) {
        s = last;
      }
    }
  }
  // Remove <think>...</think> blocks if present
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  return s;
}

function chatBodyForModel(
  model: string,
  messages: Array<{ role: string; content: string }>,
  opts: { maxTokens?: number; temperature?: number },
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: opts.maxTokens ?? 700,
    temperature: opts.temperature ?? 0.25,
  };
  // kimi-k3 requires top_p=0.95; others prefer omitting or 0.9
  if (model.includes("kimi")) {
    body.top_p = 0.95;
  }
  return body;
}

export async function chatCompletion(opts: {
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ content: string; model: string }> {
  if (!hasNvidiaApiKey()) {
    throw new Error("NVIDIA_API_KEY manquante pour le chat RAG.");
  }

  let lastErr: Error | null = null;
  for (const model of RAG_CHAT_MODELS) {
    try {
      const { ok, status, json, text } = await fetchJson(
        `${NVIDIA_INTEGRATE_BASE}/chat/completions`,
        {
          method: "POST",
          timeoutMs: CHAT_TIMEOUT_MS,
          body: JSON.stringify(
            chatBodyForModel(model, opts.messages, opts),
          ),
        },
      );
      if (!ok) {
        lastErr = new Error(
          `chat ${model} HTTP ${status}: ${(text || "").slice(0, 240)}`,
        );
        console.warn("[rag/chat]", lastErr.message);
        continue;
      }
      const raw =
        (json as { choices?: Array<{ message?: { content?: string } }> })
          ?.choices?.[0]?.message?.content || "";
      const content = sanitizeChatContent(raw);
      if (!content.trim()) {
        lastErr = new Error(`chat ${model}: réponse vide`);
        continue;
      }
      // Reject obvious CoT dumps that sanitize couldn't clean
      if (/here'?s a thinking process/i.test(content) && content.length > 800) {
        lastErr = new Error(`chat ${model}: fuite de raisonnement`);
        console.warn("[rag/chat]", lastErr.message);
        continue;
      }
      return { content: content.trim(), model };
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      console.warn("[rag/chat]", lastErr.message);
    }
  }
  throw lastErr || new Error("Aucun modèle de chat NVIDIA disponible.");
}
