import { promises as fs } from "fs";
import path from "path";
import type { Article, Rubric } from "./types";
import seed from "../../content/articles.json";

const DATA_PATH = path.join(process.cwd(), "content", "articles.json");

/** In-memory overlay for serverless / read-only filesystems (Vercel). */
let memoryStore: Article[] | null = null;

function cloneSeed(): Article[] {
  return JSON.parse(JSON.stringify(seed)) as Article[];
}

async function readFromDisk(): Promise<Article[] | null> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw) as Article[];
  } catch {
    return null;
  }
}

export async function getArticles(): Promise<Article[]> {
  if (memoryStore) return [...memoryStore];
  const disk = await readFromDisk();
  if (disk) return disk;
  return cloneSeed();
}

async function persist(articles: Article[]): Promise<{ mode: "disk" | "memory" }> {
  try {
    await fs.writeFile(DATA_PATH, JSON.stringify(articles, null, 2), "utf8");
    memoryStore = null;
    return { mode: "disk" };
  } catch {
    memoryStore = articles;
    return { mode: "memory" };
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
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
): Promise<{ article: Article; mode: "disk" | "memory" }> {
  const articles = await getArticles();
  const idx = articles.findIndex((a) => a.id === article.id);
  if (idx >= 0) articles[idx] = article;
  else articles.unshift(article);
  const { mode } = await persist(articles);
  return { article, mode };
}

export async function deleteArticle(
  id: string,
): Promise<{ ok: boolean; mode: "disk" | "memory" }> {
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
