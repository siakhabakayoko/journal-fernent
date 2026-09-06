/**
 * Backfill pre-generated listen audio for all articles.
 * Usage: bun run audio:backfill
 *
 * Requires NVIDIA_API_KEY (+ optional Edge TTS fallback) and BLOB_READ_WRITE_TOKEN.
 * Updates Turso when configured, and always writes content/articles.json.
 */
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { buildArticleListenText } from "../src/lib/article-audio";
import { getArticles, upsertArticle } from "../src/lib/articles";
import { isTursoConfigured } from "../src/lib/db";
import { synthesizeFrenchSpeech } from "../src/lib/nvidia-tts";
import type { Article } from "../src/lib/types";

const DATA_PATH = path.join(process.cwd(), "content", "articles.json");
const DELAY_MS = 750;

async function loadEnv() {
  const candidates = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env"),
    "/workspace/.nvidia_api_key",
  ];
  for (const p of candidates) {
    try {
      const raw = await fs.readFile(p, "utf8");
      if (p.endsWith(".nvidia_api_key")) {
        if (!process.env.NVIDIA_API_KEY) {
          process.env.NVIDIA_API_KEY = raw.trim();
        }
        continue;
      }
      for (const line of raw.split("\n")) {
        const m = /^\s*([-A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
        if (!m) continue;
        const key = m[1];
        let val = m[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    } catch {
      /* ignore */
    }
  }
}

function hashAudioText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function audioExtForMime(mimeType: string): "mp3" | "wav" {
  const m = mimeType.toLowerCase();
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  return "wav";
}

async function storeArticleAudio(
  bytes: Buffer,
  mimeType: string,
  articleId: string,
): Promise<string> {
  const yyyy = String(new Date().getUTCFullYear());
  const ext = audioExtForMime(mimeType);
  const relativeKey = `audio/articles/${yyyy}/${articleId}.${ext}`;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!blobToken) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN manquant -- impossible d'enregistrer l'audio.",
    );
  }
  const result = await put(relativeKey, bytes, {
    access: "public",
    token: blobToken,
    contentType: mimeType,
    allowOverwrite: true,
  });
  return result.url;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function writeArticlesJson(articles: Article[]) {
  const sorted = [...articles].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  await fs.writeFile(DATA_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

async function main() {
  await loadEnv();

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    console.error(
      "BLOCKER: BLOB_READ_WRITE_TOKEN missing. Pull from Vercel or set in .env.local.",
    );
    process.exit(1);
  }
  if (!process.env.NVIDIA_API_KEY?.trim()) {
    console.warn(
      "WARN: NVIDIA_API_KEY missing — Magpie unavailable; Edge TTS fallback will be used.",
    );
  }

  console.info("[audio:backfill] turso", isTursoConfigured());
  const articles = await getArticles();
  console.info("[audio:backfill] loaded", articles.length, "articles");

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  const sampleUrls: string[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = { ...articles[i] };
    const n = `${i + 1}/${articles.length}`;
    const plainText = buildArticleListenText(
      article.title,
      article.excerpt,
      article.body,
    );
    if (!plainText.trim()) {
      console.warn(`[${n}] FAIL ${article.id} ${article.slug} empty text`);
      failed++;
      continue;
    }
    const textHash = hashAudioText(plainText);
    if (
      article.audioUrl &&
      article.audioTextHash &&
      article.audioTextHash === textHash
    ) {
      console.info(`[${n}] SKIP ${article.id} ${article.slug}`);
      skipped++;
      continue;
    }

    try {
      console.info(
        `[${n}] GEN  ${article.id} ${article.slug} chars=${plainText.length}`,
      );
      const tts = await synthesizeFrenchSpeech(plainText);
      const url = await storeArticleAudio(tts.bytes, tts.mimeType, article.id);
      article.audioUrl = url;
      article.audioTextHash = textHash;
      const { mode } = await upsertArticle(article);
      console.info(
        `[${n}] OK   ${article.id} ${article.slug} provider=${tts.provider} mode=${mode} url=${url}`,
      );
      ok++;
      if (sampleUrls.length < 3) sampleUrls.push(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${n}] FAIL ${article.id} ${article.slug} ${msg}`);
      failed++;
    }

    if (i < articles.length - 1) await sleep(DELAY_MS);
  }

  try {
    const latest = await getArticles();
    await writeArticlesJson(latest);
    console.info("[audio:backfill] wrote", DATA_PATH);
  } catch (err) {
    console.error("[audio:backfill] failed to write articles.json", err);
  }

  console.info(
    JSON.stringify(
      {
        ok: true,
        total: articles.length,
        succeeded: ok,
        skipped,
        failed,
        sampleAudioUrls: sampleUrls,
      },
      null,
      2,
    ),
  );

  if (failed > 0 && ok === 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
