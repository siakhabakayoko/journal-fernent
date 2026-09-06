import { cosineSimilarity } from "./cosine";
import { embedTexts } from "./nvidia-client";
import { getRagIndex } from "./index-store";
import type { RagEmbeddedChunk, RagSource } from "./types";

export type RetrievedChunk = RagEmbeddedChunk & {
  score: number;
};

const TOP_K = 8;
const RERANK_KEEP = 4;
/** Below this best cosine score → weak retrieval / refuse to invent. */
export const WEAK_SCORE_THRESHOLD = 0.28;

function lexicalBoost(query: string, text: string): number {
  const q = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const terms = q.split(/[^a-z0-9àâäéèêëïîôùûüçñ]+/i).filter((w) => w.length > 3);
  if (!terms.length) return 0;
  let hits = 0;
  for (const term of terms) {
    if (t.includes(term)) hits += 1;
  }
  return Math.min(0.08, (hits / terms.length) * 0.08);
}

/**
 * Embed query → cosine top-k → light lexical boost (NVIDIA rerank EOL on key).
 */
export async function retrieveRelevantChunks(
  query: string,
): Promise<{ chunks: RetrievedChunk[]; weak: boolean }> {
  const q = query.trim();
  if (!q) return { chunks: [], weak: true };

  const index = await getRagIndex();
  const { embeddings } = await embedTexts([q.slice(0, 4000)], "query");
  const qEmb = embeddings[0];
  if (!qEmb?.length) return { chunks: [], weak: true };

  const scored: RetrievedChunk[] = index.chunks.map((c) => ({
    ...c,
    score: cosineSimilarity(qEmb, c.embedding) + lexicalBoost(q, c.text),
  }));

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, TOP_K);

  // Deduplicate by url+title, keep best per source, then trim
  const seen = new Set<string>();
  const reranked: RetrievedChunk[] = [];
  for (const c of top) {
    const key = `${c.type}:${c.url}:${c.title}`;
    if (seen.has(key) && reranked.length >= 2) continue;
    if (!seen.has(key)) seen.add(key);
    reranked.push(c);
    if (reranked.length >= RERANK_KEEP) break;
  }

  const best = reranked[0]?.score ?? 0;
  const weak = best < WEAK_SCORE_THRESHOLD || reranked.length === 0;
  return { chunks: reranked, weak };
}

export function sourcesFromChunks(chunks: RetrievedChunk[]): RagSource[] {
  const out: RagSource[] = [];
  const seen = new Set<string>();
  for (const c of chunks) {
    const key = `${c.url}|${c.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title: c.title, url: c.url, type: c.type });
  }
  return out;
}
