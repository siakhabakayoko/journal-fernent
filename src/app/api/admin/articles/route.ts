import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  deleteArticle,
  getArticles,
  slugify,
  upsertArticle,
} from "@/lib/articles";
import { isTursoConfigured } from "@/lib/db";
import { buildArticleListenText } from "@/lib/article-audio";
import { synthesizeFrenchSpeech } from "@/lib/nvidia-tts";
import type { Article, Rubric } from "@/lib/types";
import { notifySubscribers } from "@/lib/notify-subscribers";

export const runtime = "nodejs";
/** Magpie chunked TTS + Blob upload can exceed the default serverless limit. */
export const maxDuration = 120;

const RUBRICS: Rubric[] = [
  "senegal",
  "afrique",
  "international",
  "economie",
  "social",
  "notre-journal",
];

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
      "BLOB_READ_WRITE_TOKEN manquant — impossible d'enregistrer l'audio.",
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

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const articles = await getArticles();
  return NextResponse.json({
    articles,
    tursoConfigured: isTursoConfigured(),
  });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const rubric = RUBRICS.includes(body.rubric) ? (body.rubric as Rubric) : "senegal";
  const id =
    typeof body.id === "string" && body.id
      ? body.id
      : `a_${Date.now().toString(36)}`;

  const existing = (await getArticles()).find((a) => a.id === id);
  const isCreate = !existing;

  // Prefer explicit body.coverImage (incl. freshly generated Blob URL).
  // Only fall back to existing when the field is omitted entirely.
  const coverFromBody =
    typeof body.coverImage === "string" ? body.coverImage.trim() : undefined;
  const coverImage =
    coverFromBody !== undefined
      ? coverFromBody || undefined
      : existing?.coverImage;

  const title = body.title.trim();
  const excerpt = String(body.excerpt || "").trim();
  const articleBody = String(body.body || "").trim();
  const plainText = buildArticleListenText(title, excerpt, articleBody);
  const textHash = plainText ? hashAudioText(plainText) : "";
  const canSkipAudio =
    Boolean(existing?.audioUrl) &&
    Boolean(existing?.audioTextHash) &&
    existing!.audioTextHash === textHash &&
    Boolean(plainText);

  const article: Article = {
    id,
    slug:
      typeof body.slug === "string" && body.slug.trim()
        ? slugify(body.slug)
        : slugify(body.title),
    title,
    excerpt,
    body: articleBody,
    rubric,
    author: String(body.author || "Rédaction Ferñent").trim(),
    publishedAt: String(body.publishedAt || new Date().toISOString().slice(0, 10)),
    featured: Boolean(body.featured),
    commentsEnabled: body.commentsEnabled !== false,
    coverImage,
    // Keep prior audio until regenerated so a failed TTS does not wipe a good URL.
    audioUrl: canSkipAudio ? existing!.audioUrl : existing?.audioUrl,
    audioTextHash: canSkipAudio ? existing!.audioTextHash : existing?.audioTextHash,
  };

  let result;
  try {
    result = await upsertArticle(article);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/articles] persist failed", message);
    return NextResponse.json(
      { error: "persist_failed", message },
      { status: 500 },
    );
  }

  let audioGenerated = false;
  let audioSkipped = canSkipAudio;
  let audioError: string | undefined;

  if (!canSkipAudio && plainText) {
    try {
      console.info("[admin/articles] generating listen audio", {
        id: article.id,
        chars: plainText.length,
      });
      const tts = await synthesizeFrenchSpeech(plainText, {
        signal: request.signal,
      });
      const url = await storeArticleAudio(tts.bytes, tts.mimeType, article.id);
      article.audioUrl = url;
      article.audioTextHash = textHash;
      try {
        result = await upsertArticle(article);
        audioGenerated = true;
        console.info("[admin/articles] listen audio stored", {
          id: article.id,
          provider: tts.provider,
          url,
        });
      } catch (err) {
        // Article text already persisted; audio URL update failed.
        audioError = err instanceof Error ? err.message : String(err);
        console.error(
          "[admin/articles] audio metadata persist failed after TTS",
          audioError,
        );
      }
    } catch (err) {
      audioError = err instanceof Error ? err.message : String(err);
      console.warn(
        "[admin/articles] listen audio generation failed — article saved without audioUrl; listen will fall back to /api/tts",
        audioError,
      );
    }
  }

  if (isCreate) {
    void notifySubscribers({
      kind: "article",
      title: article.title,
      excerpt: article.excerpt,
      path: `/article/${article.slug}`,
    }).catch((err) =>
      console.error("[admin/articles] notify failed", err),
    );
  }

  return NextResponse.json({
    ...result,
    audioGenerated,
    audioSkipped,
    ...(audioError ? { audioError } : {}),
  });
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  let result;
  try {
    result = await deleteArticle(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/articles] delete persist failed", message);
    return NextResponse.json(
      { error: "persist_failed", message },
      { status: 500 },
    );
  }
  if (!result.ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(result);
}
