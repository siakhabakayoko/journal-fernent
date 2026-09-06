import { promises as fs } from "fs";
import path from "path";
import type { MonthlyIssue } from "./types";
import seed from "../../content/issues.json";
import {
  ensureSchema,
  ensureSeeded,
  getTursoClient,
  isTursoConfigured,
} from "./db";
import type { PersistMode } from "./articles";
import { slugify } from "./articles";

const DATA_PATH = path.join(process.cwd(), "content", "issues.json");

let memoryStore: MonthlyIssue[] | null = null;

function cloneSeed(): MonthlyIssue[] {
  return JSON.parse(JSON.stringify(seed)) as MonthlyIssue[];
}

function rowToIssue(row: Record<string, unknown>): MonthlyIssue {
  const cover = row.cover_image ?? row.coverImage ?? undefined;
  const desc = row.description ?? "";
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    month: Number(row.month),
    year: Number(row.year),
    description:
      desc !== undefined && desc !== null && String(desc).trim()
        ? String(desc)
        : undefined,
    pdfUrl: String(row.pdf_url ?? row.pdfUrl ?? ""),
    coverImage:
      cover !== undefined && cover !== null && String(cover).trim()
        ? String(cover)
        : undefined,
    publishedAt: String(row.published_at ?? row.publishedAt ?? ""),
  };
}

const ISSUE_SELECT =
  "id, slug, title, month, year, description, pdf_url, cover_image, published_at";

async function readFromDisk(): Promise<MonthlyIssue[] | null> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw) as MonthlyIssue[];
  } catch {
    return null;
  }
}

async function getIssuesFromTurso(): Promise<MonthlyIssue[]> {
  await ensureSeeded();
  const db = getTursoClient();
  const result = await db.execute(
    `SELECT ${ISSUE_SELECT} FROM issues ORDER BY year DESC, month DESC`,
  );
  return result.rows.map((r) => rowToIssue(r as Record<string, unknown>));
}

export async function getIssues(): Promise<MonthlyIssue[]> {
  if (isTursoConfigured()) {
    try {
      return await getIssuesFromTurso();
    } catch (err) {
      console.error("[issues] Turso read failed, falling back to JSON", err);
    }
  }
  if (memoryStore) return [...memoryStore];
  const disk = await readFromDisk();
  if (disk) return disk;
  return cloneSeed();
}

async function persist(
  issues: MonthlyIssue[],
): Promise<{ mode: PersistMode }> {
  if (isTursoConfigured()) {
    await ensureSchema();
    const db = getTursoClient();
    for (const iss of issues) {
      await db.execute({
        sql: `INSERT INTO issues
          (id, slug, title, month, year, description, pdf_url, cover_image, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            slug=excluded.slug,
            title=excluded.title,
            month=excluded.month,
            year=excluded.year,
            description=excluded.description,
            pdf_url=excluded.pdf_url,
            cover_image=excluded.cover_image,
            published_at=excluded.published_at`,
        args: [
          iss.id,
          iss.slug,
          iss.title,
          iss.month,
          iss.year,
          iss.description ?? "",
          iss.pdfUrl ?? "",
          iss.coverImage ?? null,
          iss.publishedAt,
        ],
      });
    }
    return { mode: "turso" };
  }
  try {
    await fs.writeFile(DATA_PATH, JSON.stringify(issues, null, 2), "utf8");
    memoryStore = null;
    return { mode: "disk" };
  } catch {
    memoryStore = issues;
    return { mode: "memory" };
  }
}

export async function getIssueBySlug(
  slug: string,
): Promise<MonthlyIssue | undefined> {
  const issues = await getIssues();
  return issues.find((i) => i.slug === slug);
}

export async function upsertIssue(
  issue: MonthlyIssue,
): Promise<{ issue: MonthlyIssue; mode: PersistMode }> {
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      await db.execute({
        sql: `INSERT INTO issues
          (id, slug, title, month, year, description, pdf_url, cover_image, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            slug=excluded.slug,
            title=excluded.title,
            month=excluded.month,
            year=excluded.year,
            description=excluded.description,
            pdf_url=excluded.pdf_url,
            cover_image=excluded.cover_image,
            published_at=excluded.published_at`,
        args: [
          issue.id,
          issue.slug,
          issue.title,
          issue.month,
          issue.year,
          issue.description ?? "",
          issue.pdfUrl ?? "",
          issue.coverImage ?? null,
          issue.publishedAt,
        ],
      });
      return { issue, mode: "turso" };
    } catch (err) {
      console.error("[issues] Turso upsert failed", err);
      throw err;
    }
  }
  const issues = await getIssues();
  const idx = issues.findIndex((i) => i.id === issue.id);
  if (idx >= 0) issues[idx] = issue;
  else issues.unshift(issue);
  const { mode } = await persist(issues);
  return { issue, mode };
}

export async function deleteIssue(
  id: string,
): Promise<{ ok: boolean; mode: PersistMode }> {
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      const result = await db.execute({
        sql: "DELETE FROM issues WHERE id = ?",
        args: [id],
      });
      return {
        ok: (result.rowsAffected ?? 0) > 0,
        mode: "turso",
      };
    } catch (err) {
      console.error("[issues] Turso delete failed", err);
      throw err;
    }
  }
  const issues = await getIssues();
  const next = issues.filter((i) => i.id !== id);
  if (next.length === issues.length) return { ok: false, mode: "disk" };
  const { mode } = await persist(next);
  return { ok: true, mode };
}

export { slugify };
