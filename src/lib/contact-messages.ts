import { promises as fs } from "fs";
import path from "path";
import type { ContactMessage, ContactMessageStatus } from "./types";
import {
  ensureSchema,
  ensureSeeded,
  getTursoClient,
  isTursoConfigured,
} from "./db";

const FILE = path.join(process.cwd(), "content", "contact-messages.json");
let memory: ContactMessage[] = [];

function rowToMessage(row: Record<string, unknown>): ContactMessage {
  const status = String(row.status ?? "new");
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    subject: row.subject ? String(row.subject) : undefined,
    body: String(row.body),
    createdAt: String(row.created_at ?? row.createdAt),
    status:
      status === "read" || status === "archived"
        ? (status as ContactMessageStatus)
        : "new",
  };
}

async function loadJson(): Promise<ContactMessage[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as ContactMessage[];
  } catch {
    return [...memory];
  }
}

async function saveJson(all: ContactMessage[]): Promise<"disk" | "memory"> {
  try {
    await fs.writeFile(FILE, JSON.stringify(all, null, 2), "utf8");
    memory = [];
    return "disk";
  } catch {
    memory = all;
    return "memory";
  }
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  if (isTursoConfigured()) {
    try {
      await ensureSeeded();
      const db = getTursoClient();
      const result = await db.execute(
        `SELECT id, name, email, subject, body, created_at, status
         FROM contact_messages ORDER BY created_at DESC`,
      );
      return result.rows.map((r) => rowToMessage(r as Record<string, unknown>));
    } catch (err) {
      console.error("[contact-messages] Turso read failed, falling back", err);
    }
  }
  const all = await loadJson();
  return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addContactMessage(
  message: ContactMessage,
): Promise<{ message: ContactMessage; mode: "turso" | "disk" | "memory" }> {
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      await db.execute({
        sql: `INSERT INTO contact_messages
              (id, name, email, subject, body, created_at, status)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          message.id,
          message.name,
          message.email,
          message.subject ?? null,
          message.body,
          message.createdAt,
          message.status,
        ],
      });
      return { message, mode: "turso" };
    } catch (err) {
      console.error("[contact-messages] Turso write failed, falling back", err);
    }
  }
  const all = await loadJson();
  all.push(message);
  const mode = await saveJson(all);
  return { message, mode };
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus,
): Promise<{ ok: boolean; mode: "turso" | "disk" | "memory" }> {
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      const result = await db.execute({
        sql: `UPDATE contact_messages SET status = ? WHERE id = ?`,
        args: [status, id],
      });
      if ((result.rowsAffected ?? 0) > 0) {
        return { ok: true, mode: "turso" };
      }
    } catch (err) {
      console.error("[contact-messages] Turso update failed, falling back", err);
    }
  }
  const all = await loadJson();
  const idx = all.findIndex((m) => m.id === id);
  if (idx < 0) return { ok: false, mode: memory.length ? "memory" : "disk" };
  all[idx] = { ...all[idx], status };
  const mode = await saveJson(all);
  return { ok: true, mode };
}

export async function deleteContactMessage(
  id: string,
): Promise<{ ok: boolean; mode: "turso" | "disk" | "memory" }> {
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      const result = await db.execute({
        sql: `DELETE FROM contact_messages WHERE id = ?`,
        args: [id],
      });
      if ((result.rowsAffected ?? 0) > 0) {
        return { ok: true, mode: "turso" };
      }
    } catch (err) {
      console.error("[contact-messages] Turso delete failed, falling back", err);
    }
  }
  const all = await loadJson();
  const next = all.filter((m) => m.id !== id);
  if (next.length === all.length) {
    return { ok: false, mode: memory.length ? "memory" : "disk" };
  }
  const mode = await saveJson(next);
  return { ok: true, mode };
}
