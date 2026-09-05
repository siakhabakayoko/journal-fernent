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
  const hiddenRaw = row.hidden;
  const hidden =
    hiddenRaw === true ||
    hiddenRaw === 1 ||
    hiddenRaw === "1" ||
    Number(hiddenRaw) === 1;
  return {
    id: String(row.id),
    articleId: String(row.article_id ?? row.articleId),
    author: String(row.author),
    body: String(row.body),
    createdAt: String(row.created_at ?? row.createdAt),
    hidden: hidden || undefined,
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

async function saveJson(all: Comment[]): Promise<"disk" | "memory"> {
  try {
    await fs.writeFile(FILE, JSON.stringify(all, null, 2), "utf8");
    memory = [];
    return "disk";
  } catch {
    memory = all;
    return "memory";
  }
}

export type GetCommentsOptions = {
  /** Include soft-hidden comments (admin). Default false. */
  includeHidden?: boolean;
};

export async function getComments(
  articleId?: string | null,
  options?: GetCommentsOptions,
): Promise<Comment[]> {
  const includeHidden = options?.includeHidden === true;

  if (isTursoConfigured()) {
    try {
      await ensureSeeded();
      const db = getTursoClient();
      if (articleId) {
        const result = await db.execute({
          sql: includeHidden
            ? `SELECT id, article_id, author, body, created_at, hidden FROM comments
               WHERE article_id = ? ORDER BY created_at ASC`
            : `SELECT id, article_id, author, body, created_at, hidden FROM comments
               WHERE article_id = ? AND COALESCE(hidden, 0) = 0 ORDER BY created_at ASC`,
          args: [articleId],
        });
        return result.rows.map((r) => rowToComment(r as Record<string, unknown>));
      }
      const result = await db.execute(
        includeHidden
          ? `SELECT id, article_id, author, body, created_at, hidden FROM comments ORDER BY created_at DESC`
          : `SELECT id, article_id, author, body, created_at, hidden FROM comments
             WHERE COALESCE(hidden, 0) = 0 ORDER BY created_at DESC`,
      );
      return result.rows.map((r) => rowToComment(r as Record<string, unknown>));
    } catch (err) {
      console.error("[comments] Turso read failed, falling back", err);
    }
  }
  const all = await loadJson();
  let list = articleId ? all.filter((c) => c.articleId === articleId) : all;
  if (!includeHidden) {
    list = list.filter((c) => !c.hidden);
  }
  return list;
}

export async function addComment(
  comment: Comment,
): Promise<{ comment: Comment; mode: "turso" | "disk" | "memory" }> {
  const hidden = comment.hidden ? 1 : 0;
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      await db.execute({
        sql: `INSERT INTO comments (id, article_id, author, body, created_at, hidden)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          comment.id,
          comment.articleId,
          comment.author,
          comment.body,
          comment.createdAt,
          hidden,
        ],
      });
      return { comment, mode: "turso" };
    } catch (err) {
      console.error("[comments] Turso write failed, falling back", err);
    }
  }
  const all = await loadJson();
  all.push(comment);
  const mode = await saveJson(all);
  return { comment, mode };
}

export async function setCommentHidden(
  id: string,
  hidden: boolean,
): Promise<{ ok: boolean; mode: "turso" | "disk" | "memory" }> {
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      const result = await db.execute({
        sql: `UPDATE comments SET hidden = ? WHERE id = ?`,
        args: [hidden ? 1 : 0, id],
      });
      if ((result.rowsAffected ?? 0) > 0) {
        return { ok: true, mode: "turso" };
      }
    } catch (err) {
      console.error("[comments] Turso hide failed, falling back", err);
    }
  }
  const all = await loadJson();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return { ok: false, mode: memory.length ? "memory" : "disk" };
  all[idx] = { ...all[idx], hidden: hidden || undefined };
  if (!hidden) delete all[idx].hidden;
  const mode = await saveJson(all);
  return { ok: true, mode };
}

export async function deleteComment(
  id: string,
): Promise<{ ok: boolean; mode: "turso" | "disk" | "memory" }> {
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      const result = await db.execute({
        sql: `DELETE FROM comments WHERE id = ?`,
        args: [id],
      });
      if ((result.rowsAffected ?? 0) > 0) {
        return { ok: true, mode: "turso" };
      }
    } catch (err) {
      console.error("[comments] Turso delete failed, falling back", err);
    }
  }
  const all = await loadJson();
  const next = all.filter((c) => c.id !== id);
  if (next.length === all.length) {
    return { ok: false, mode: memory.length ? "memory" : "disk" };
  }
  const mode = await saveJson(next);
  return { ok: true, mode };
}
