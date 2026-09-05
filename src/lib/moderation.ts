import { promises as fs } from "fs";
import path from "path";
import type { BannedKeyword } from "./types";
import {
  ensureSchema,
  ensureSeeded,
  getTursoClient,
  isTursoConfigured,
} from "./db";

const FILE = path.join(process.cwd(), "content", "banned-keywords.json");
let memory: BannedKeyword[] = [];

function rowToKeyword(row: Record<string, unknown>): BannedKeyword {
  return {
    id: String(row.id),
    word: String(row.word),
    createdAt: String(row.created_at ?? row.createdAt),
  };
}

async function loadJson(): Promise<BannedKeyword[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as BannedKeyword[];
  } catch {
    return [...memory];
  }
}

async function saveJson(all: BannedKeyword[]): Promise<"disk" | "memory"> {
  try {
    await fs.writeFile(FILE, JSON.stringify(all, null, 2), "utf8");
    memory = [];
    return "disk";
  } catch {
    memory = all;
    return "memory";
  }
}

export async function getBannedKeywords(): Promise<BannedKeyword[]> {
  if (isTursoConfigured()) {
    try {
      await ensureSeeded();
      const db = getTursoClient();
      const result = await db.execute(
        `SELECT id, word, created_at FROM banned_keywords ORDER BY created_at DESC`,
      );
      return result.rows.map((r) => rowToKeyword(r as Record<string, unknown>));
    } catch (err) {
      console.error("[moderation] Turso read failed, falling back", err);
    }
  }
  const all = await loadJson();
  return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addBannedKeyword(
  word: string,
): Promise<{
  keyword: BannedKeyword | null;
  mode: "turso" | "disk" | "memory";
  created: boolean;
}> {
  const normalized = word.trim().toLowerCase();
  if (!normalized) {
    return { keyword: null, mode: "memory", created: false };
  }
  const now = new Date().toISOString();
  const keyword: BannedKeyword = {
    id: `bk_${Date.now().toString(36)}`,
    word: normalized,
    createdAt: now,
  };

  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      const existing = await db.execute({
        sql: `SELECT id, word, created_at FROM banned_keywords WHERE lower(word) = ? LIMIT 1`,
        args: [normalized],
      });
      if (existing.rows.length > 0) {
        return {
          keyword: rowToKeyword(existing.rows[0] as Record<string, unknown>),
          mode: "turso",
          created: false,
        };
      }
      await db.execute({
        sql: `INSERT INTO banned_keywords (id, word, created_at) VALUES (?, ?, ?)`,
        args: [keyword.id, keyword.word, keyword.createdAt],
      });
      return { keyword, mode: "turso", created: true };
    } catch (err) {
      console.error("[moderation] Turso write failed, falling back", err);
    }
  }

  const all = await loadJson();
  const found = all.find((k) => k.word.toLowerCase() === normalized);
  if (found) {
    return {
      keyword: found,
      mode: memory.length ? "memory" : "disk",
      created: false,
    };
  }
  all.push(keyword);
  const mode = await saveJson(all);
  return { keyword, mode, created: true };
}

export async function deleteBannedKeyword(
  id: string,
): Promise<{ ok: boolean; mode: "turso" | "disk" | "memory" }> {
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      const result = await db.execute({
        sql: `DELETE FROM banned_keywords WHERE id = ?`,
        args: [id],
      });
      if ((result.rowsAffected ?? 0) > 0) {
        return { ok: true, mode: "turso" };
      }
    } catch (err) {
      console.error("[moderation] Turso delete failed, falling back", err);
    }
  }
  const all = await loadJson();
  const next = all.filter((k) => k.id !== id);
  if (next.length === all.length) {
    return { ok: false, mode: memory.length ? "memory" : "disk" };
  }
  const mode = await saveJson(next);
  return { ok: true, mode };
}

/** Returns the first matching banned keyword (case-insensitive substring), or null. */
export async function findBannedMatch(
  ...texts: string[]
): Promise<string | null> {
  const keywords = await getBannedKeywords();
  if (keywords.length === 0) return null;
  const haystack = texts.join(" ").toLowerCase();
  for (const k of keywords) {
    if (k.word && haystack.includes(k.word.toLowerCase())) {
      return k.word;
    }
  }
  return null;
}

export async function containsBannedKeyword(
  ...texts: string[]
): Promise<boolean> {
  return (await findBannedMatch(...texts)) !== null;
}
