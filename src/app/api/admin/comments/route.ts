import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  deleteComment,
  getComments,
  setCommentHidden,
} from "@/lib/comments";
import { getArticles } from "@/lib/articles";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [comments, articles] = await Promise.all([
    getComments(null, { includeHidden: true }),
    getArticles(),
  ]);
  const titleById = new Map(articles.map((a) => [a.id, a.title]));
  const enriched = comments.map((c) => ({
    ...c,
    articleTitle: titleById.get(c.articleId) ?? null,
  }));
  return NextResponse.json({ comments: enriched });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id || typeof body?.hidden !== "boolean") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const result = await setCommentHidden(id, body.hidden);
  if (!result.ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
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
  const result = await deleteComment(id);
  if (!result.ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
