import { promises as fs } from "fs";
import path from "path";
import type { Comment } from "./types";
import {
  ensureSchema,
  ensureSeeded,
  getTursoClient,
  isTursoConfigured,
} from "./db";

const FILE = path.join(process.cwd(), "content", "comments.json");
let memory: Comment[] = [];

function rowToComment(row: Record<string, unknown>): Comment {
  return {
    id: String(row.id),
    articleId: String(row.article_id ?? row.articleId),
    author: String(row.author),
    body: String(row.body),
    createdAt: String(row.created_at ?? row.createdAt),
  };
}

async function loadJson(): Promise<Comment[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Comment[];
  } catch {
    return [...memory];
  }
}


export async function getComments(articleId?: string | null): Promise<Comment[]> {
  if (isTursoConfigured()) {
    try {
      await ensureSeeded();
      const db = getTursoClient();
      if (articleId) {
        const result = await db.execute({
          sql: `SELECT id, article_id, author, body, created_at FROM comments
                WHERE article_id = ? ORDER BY created_at ASC`,
          args: [articleId],
        });
        return result.rows.map((r) => rowToComment(r as Record<string, unknown>));
      }
      const result = await db.execute(
        `SELECT id, article_id, author, body, created_at FROM comments ORDER BY created_at ASC`,
      );
      return result.rows.map((r) => rowToComment(r as Record<string, unknown>));
    } catch (err) {
      console.error("[comments] Turso read failed, falling back", err);
    }
  }
  const all = await loadJson();
  return articleId ? all.filter((c) => c.articleId === articleId) : all;
}

export async function addComment(
  comment: Comment,
): Promise<{ comment: Comment; mode: "turso" | "disk" | "memory" }> {
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      await db.execute({
        sql: `INSERT INTO comments (id, article_id, author, body, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          comment.id,
          comment.articleId,
          comment.author,
          comment.body,
          comment.createdAt,
        ],
      });
      return { comment, mode: "turso" };
    } catch (err) {
      console.error("[comments] Turso write failed, falling back", err);
    }
  }
  const all = await loadJson();
  all.push(comment);
  try {
    await fs.writeFile(FILE, JSON.stringify(all, null, 2), "utf8");
    memory = [];
    return { comment, mode: "disk" };
  } catch {
    memory = all;
    return { comment, mode: "memory" };
  }
}
