import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  deleteArticle,
  getArticles,
  slugify,
  upsertArticle,
} from "@/lib/articles";
import type { Article, Rubric } from "@/lib/types";
import { notifySubscribers } from "@/lib/notify-subscribers";

const RUBRICS: Rubric[] = [
  "senegal",
  "afrique",
  "international",
  "economie",
  "social",
  "notre-journal",
];

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const articles = await getArticles();
  return NextResponse.json({ articles });
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
  const coverImage = String(body.coverImage || "").trim() || undefined;
  const id =
    typeof body.id === "string" && body.id
      ? body.id
      : `a_${Date.now().toString(36)}`;

  const existing = (await getArticles()).find((a) => a.id === id);
  const isCreate = !existing;

  const article: Article = {
    id,
    slug:
      typeof body.slug === "string" && body.slug.trim()
        ? slugify(body.slug)
        : slugify(body.title),
    title: body.title.trim(),
    excerpt: String(body.excerpt || "").trim(),
    body: String(body.body || "").trim(),
    rubric,
    author: String(body.author || "Rédaction Ferñent").trim(),
    publishedAt: String(body.publishedAt || new Date().toISOString().slice(0, 10)),
    featured: Boolean(body.featured),
    commentsEnabled: body.commentsEnabled !== false,
    coverImage,
  };
  const result = await upsertArticle(article);

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

  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const result = await deleteArticle(id);
  if (!result.ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(result);
}
