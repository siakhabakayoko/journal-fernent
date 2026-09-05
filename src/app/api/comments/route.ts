import { NextResponse } from "next/server";
import type { Comment } from "@/lib/types";
import { addComment, getComments } from "@/lib/comments";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");
  const comments = await getComments(articleId);
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const articleId = typeof body?.articleId === "string" ? body.articleId : "";
  const author =
    typeof body?.author === "string" ? body.author.trim().slice(0, 80) : "";
  const text =
    typeof body?.body === "string" ? body.body.trim().slice(0, 2000) : "";
  if (!articleId || !author || !text) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const comment: Comment = {
    id: `c_${Date.now().toString(36)}`,
    articleId,
    author,
    body: text,
    createdAt: new Date().toISOString(),
  };
  const result = await addComment(comment);
  return NextResponse.json({ comment: result.comment, mode: result.mode });
}
