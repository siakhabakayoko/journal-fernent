import { promises as fs } from "fs";
import path from "path";
import type { Article, Rubric } from "./types";
import seed from "../../content/articles.json";
import {
  ensureSchema,
  ensureSeeded,
  getTursoClient,
  isTursoConfigured,
} from "./db";

const DATA_PATH = path.join(process.cwd(), "content", "articles.json");

export type PersistMode = "turso" | "disk" | "memory";

/** In-memory overlay for serverless / read-only filesystems (Vercel). */
let memoryStore: Article[] | null = null;

function cloneSeed(): Article[] {
  return JSON.parse(JSON.stringify(seed)) as Article[];
}

function rowToArticle(row: Record<string, unknown>): Article {
  const cover =
    row.cover_image ?? row.coverImage ?? undefined;
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ""),
    body: String(row.body),
    rubric: row.rubric as Rubric,
    author: String(row.author ?? "Rédaction Ferñent"),
    publishedAt: String(row.published_at ?? row.publishedAt ?? ""),
    featured: Boolean(Number(row.featured ?? 0)),
    commentsEnabled: Number(row.comments_enabled ?? row.commentsEnabled ?? 1) !== 0,
    coverImage:
      cover !== undefined && cover !== null && String(cover).trim()
        ? String(cover)
        : undefined,
  };
}

const ARTICLE_SELECT =
  "id, slug, title, excerpt, body, rubric, author, published_at, featured, comments_enabled, cover_image";

async function readFromDisk(): Promise<Article[] | null> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw) as Article[];
  } catch {
    return null;
  }
}

async function getArticlesFromTurso(): Promise<Article[]> {
  await ensureSeeded();
  const db = getTursoClient();
  const result = await db.execute(
    `SELECT ${ARTICLE_SELECT} FROM articles ORDER BY published_at DESC`,
  );
  return result.rows.map((r) => rowToArticle(r as Record<string, unknown>));
}

export async function getArticles(): Promise<Article[]> {
  if (isTursoConfigured()) {
    try {
      return await getArticlesFromTurso();
    } catch (err) {
      console.error("[articles] Turso read failed, falling back to JSON", err);
    }
  }
  if (memoryStore) return [...memoryStore];
  const disk = await readFromDisk();
  if (disk) return disk;
  return cloneSeed();
}

async function persist(
  articles: Article[],
): Promise<{ mode: PersistMode }> {
  if (isTursoConfigured()) {
    await ensureSchema();
    const db = getTursoClient();
    for (const a of articles) {
      await db.execute({
        sql: `INSERT INTO articles
          (id, slug, title, excerpt, body, rubric, author, published_at, featured, comments_enabled, cover_image)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            slug=excluded.slug,
            title=excluded.title,
            excerpt=excluded.excerpt,
            body=excluded.body,
            rubric=excluded.rubric,
            author=excluded.author,
            published_at=excluded.published_at,
            featured=excluded.featured,
            comments_enabled=excluded.comments_enabled,
            cover_image=excluded.cover_image`,
        args: [
          a.id,
          a.slug,
          a.title,
          a.excerpt,
          a.body,
          a.rubric,
          a.author,
          a.publishedAt,
          a.featured ? 1 : 0,
          a.commentsEnabled ? 1 : 0,
          a.coverImage ?? null,
        ],
      });
    }
    return { mode: "turso" };
  }
  try {
    await fs.writeFile(DATA_PATH, JSON.stringify(articles, null, 2), "utf8");
    memoryStore = null;
    return { mode: "disk" };
  } catch {
    memoryStore = articles;
    return { mode: "memory" };
  }
}

export async function getArticleBySlug(
  slug: string,
): Promise<Article | undefined> {
  if (isTursoConfigured()) {
    try {
      await ensureSeeded();
      const db = getTursoClient();
      const result = await db.execute({
        sql: `SELECT ${ARTICLE_SELECT} FROM articles WHERE slug = ? LIMIT 1`,
        args: [slug],
      });
      if (result.rows[0]) {
        return rowToArticle(result.rows[0] as Record<string, unknown>);
      }
      return undefined;
    } catch (err) {
      console.error("[articles] Turso getBySlug failed, falling back", err);
    }
  }
  const articles = await getArticles();
  return articles.find((a) => a.slug === slug);
}

export async function getArticlesByRubric(rubric: Rubric): Promise<Article[]> {
  const articles = await getArticles();
  return articles
    .filter((a) => a.rubric === rubric)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getFeaturedArticles(): Promise<Article[]> {
  const articles = await getArticles();
  return articles
    .filter((a) => a.featured)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getRecentArticles(limit = 8): Promise<Article[]> {
  const articles = await getArticles();
  return [...articles]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}

export async function upsertArticle(
  article: Article,
): Promise<{ article: Article; mode: PersistMode }> {
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      await db.execute({
        sql: `INSERT INTO articles
          (id, slug, title, excerpt, body, rubric, author, published_at, featured, comments_enabled, cover_image)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            slug=excluded.slug,
            title=excluded.title,
            excerpt=excluded.excerpt,
            body=excluded.body,
            rubric=excluded.rubric,
            author=excluded.author,
            published_at=excluded.published_at,
            featured=excluded.featured,
            comments_enabled=excluded.comments_enabled,
            cover_image=excluded.cover_image`,
        args: [
          article.id,
          article.slug,
          article.title,
          article.excerpt,
          article.body,
          article.rubric,
          article.author,
          article.publishedAt,
          article.featured ? 1 : 0,
          article.commentsEnabled ? 1 : 0,
          article.coverImage ?? null,
        ],
      });
      return { article, mode: "turso" };
    } catch (err) {
      console.error("[articles] Turso upsert failed, falling back", err);
    }
  }
  const articles = await getArticles();
  const idx = articles.findIndex((a) => a.id === article.id);
  if (idx >= 0) articles[idx] = article;
  else articles.unshift(article);
  const { mode } = await persist(articles);
  return { article, mode };
}

export async function deleteArticle(
  id: string,
): Promise<{ ok: boolean; mode: PersistMode }> {
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      const result = await db.execute({
        sql: "DELETE FROM articles WHERE id = ?",
        args: [id],
      });
      return {
        ok: (result.rowsAffected ?? 0) > 0,
        mode: "turso",
      };
    } catch (err) {
      console.error("[articles] Turso delete failed, falling back", err);
    }
  }
  const articles = await getArticles();
  const next = articles.filter((a) => a.id !== id);
  if (next.length === articles.length) return { ok: false, mode: "disk" };
  const { mode } = await persist(next);
  return { ok: true, mode };
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
