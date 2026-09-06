import { promises as fs } from "fs";
import path from "path";
import { buildCorpusChunks, corpusFingerprint } from "./corpus";
import { embedTexts, RAG_EMBED_MODEL } from "./nvidia-client";
import type { RagEmbeddedChunk, RagIndexFile } from "./types";

const INDEX_PATH = path.join(process.cwd(), "content", "rag-embeddings.json");

type GlobalRag = {
  index: RagIndexFile | null;
  loading: Promise<RagIndexFile> | null;
};

function g(): GlobalRag {
  const key = "__fernent_rag_index__";
  const root = globalThis as unknown as Record<string, GlobalRag | undefined>;
  if (!root[key]) root[key] = { index: null, loading: null };
  return root[key]!;
}

async function readIndexFile(): Promise<RagIndexFile | null> {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw) as RagIndexFile;
    if (parsed?.version !== 1 || !Array.isArray(parsed.chunks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeIndexFile(index: RagIndexFile): Promise<boolean> {
  try {
    await fs.writeFile(INDEX_PATH, JSON.stringify(index), "utf8");
    return true;
  } catch (err) {
    console.warn(
      "[rag] cannot write index file (read-only FS?):",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

async function buildIndex(): Promise<RagIndexFile> {
  const chunks = await buildCorpusChunks();
  const fingerprint = corpusFingerprint(chunks);
  console.info("[rag] embedding corpus", {
    chunks: chunks.length,
    model: RAG_EMBED_MODEL,
    fingerprint,
  });

  const { embeddings, model, dimensions } = await embedTexts(
    chunks.map((c) => c.text),
    "passage",
  );

  const embedded: RagEmbeddedChunk[] = chunks.map((c, i) => ({
    ...c,
    embedding: embeddings[i],
  }));

  const index: RagIndexFile = {
    version: 1,
    model,
    dimensions,
    createdAt: new Date().toISOString(),
    fingerprint,
    chunks: embedded,
  };

  await writeIndexFile(index);
  return index;
}

/**
 * Load precomputed embeddings if fingerprint matches; else rebuild (and cache in memory).
 */
export async function getRagIndex(opts?: {
  forceRebuild?: boolean;
}): Promise<RagIndexFile> {
  const store = g();
  if (!opts?.forceRebuild && store.index) return store.index;
  if (store.loading) return store.loading;

  store.loading = (async () => {
    const chunks = await buildCorpusChunks();
    const fingerprint = corpusFingerprint(chunks);

    if (!opts?.forceRebuild) {
      const disk = await readIndexFile();
      if (
        disk &&
        disk.fingerprint === fingerprint &&
        disk.model === RAG_EMBED_MODEL &&
        disk.chunks.length === chunks.length
      ) {
        console.info("[rag] loaded cached embeddings", {
          chunks: disk.chunks.length,
          model: disk.model,
        });
        store.index = disk;
        return disk;
      }
    }

    const index = await buildIndex();
    store.index = index;
    return index;
  })();

  try {
    return await store.loading;
  } finally {
    store.loading = null;
  }
}

export { INDEX_PATH };
