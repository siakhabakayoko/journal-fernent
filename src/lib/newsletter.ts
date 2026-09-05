import { promises as fs } from "fs";
import path from "path";
import {
  ensureSchema,
  ensureSeeded,
  getTursoClient,
  isTursoConfigured,
} from "./db";

export type NewsletterEntry = {
  id: string;
  email: string;
  createdAt: string;
};

const FILE = path.join(process.cwd(), "content", "newsletter.json");
let memory: NewsletterEntry[] = [];

async function loadJson(): Promise<NewsletterEntry[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Array<{
      id?: string;
      email: string;
      createdAt: string;
    }>;
    return parsed.map((e) => ({
      id: e.id ?? `n_${e.email}`,
      email: e.email,
      createdAt: e.createdAt,
    }));
  } catch {
    return [...memory];
  }
}

export async function subscribeNewsletter(
  email: string,
): Promise<{ ok: true; mode: "turso" | "disk" | "memory"; created: boolean }> {
  const normalized = email.trim().toLowerCase();
  const now = new Date().toISOString();
  const id = `n_${Date.now().toString(36)}_${normalized.slice(0, 24)}`;

  if (isTursoConfigured()) {
    try {
      await ensureSeeded();
      await ensureSchema();
      const db = getTursoClient();
      const existing = await db.execute({
        sql: "SELECT id FROM newsletter WHERE email = ? LIMIT 1",
        args: [normalized],
      });
      if (existing.rows.length > 0) {
        return { ok: true, mode: "turso", created: false };
      }
      await db.execute({
        sql: "INSERT INTO newsletter (id, email, created_at) VALUES (?, ?, ?)",
        args: [id, normalized, now],
      });
      return { ok: true, mode: "turso", created: true };
    } catch (err) {
      console.error("[newsletter] Turso write failed, falling back", err);
    }
  }

  const entries = await loadJson();
  if (entries.some((e) => e.email === normalized)) {
    return { ok: true, mode: memory.length ? "memory" : "disk", created: false };
  }
  entries.push({ id, email: normalized, createdAt: now });
  try {
    await fs.writeFile(FILE, JSON.stringify(entries, null, 2), "utf8");
    memory = [];
    return { ok: true, mode: "disk", created: true };
  } catch {
    memory = entries;
    return { ok: true, mode: "memory", created: true };
  }
}
