import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Comment } from "@/lib/types";

const FILE = path.join(process.cwd(), "content", "comments.json");
let memory: Comment[] = [];

async function load(): Promise<Comment[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Comment[];
  } catch {
    return [...memory];
  }
}

async function save(comments: Comment[]) {
  try {
    await fs.writeFile(FILE, JSON.stringify(comments, null, 2), "utf8");
    memory = [];
  } catch {
    memory = comments;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");
  const all = await load();
  const comments = articleId
    ? all.filter((c) => c.articleId === articleId)
    : all;
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const articleId = typeof body?.articleId === "string" ? body.articleId : "";
  const author = typeof body?.author === "string" ? body.author.trim().slice(0, 80) : "";
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, 2000) : "";
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
  const all = await load();
  all.push(comment);
  await save(all);
  return NextResponse.json({ comment });
}
