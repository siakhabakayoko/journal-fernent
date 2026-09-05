import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;
let seedReady: Promise<void> | null = null;

export function isTursoConfigured(): boolean {
  return Boolean(
    process.env.TURSO_DATABASE_URL?.trim() &&
      process.env.TURSO_AUTH_TOKEN?.trim(),
  );
}

export function getTursoClient(): Client {
  if (!isTursoConfigured()) {
    throw new Error("Turso is not configured (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN)");
  }
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!.trim(),
      authToken: process.env.TURSO_AUTH_TOKEN!.trim(),
    });
  }
  return client;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  rubric TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Rédaction Ferñent',
  published_at TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0,
  comments_enabled INTEGER NOT NULL DEFAULT 1,
  cover_image TEXT
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletter (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  pdf_url TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  published_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_articles_rubric ON articles(rubric);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_issues_year_month ON issues(year, month);
`;

async function migrateColumns(db: Client): Promise<void> {
  // Existing DBs created before cover_image / issues need soft migrations.
  try {
    await db.execute("ALTER TABLE articles ADD COLUMN cover_image TEXT");
  } catch {
    /* column may already exist */
  }
}

export async function ensureSchema(): Promise<void> {
  if (!isTursoConfigured()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getTursoClient();
      const statements = SCHEMA_SQL.split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const sql of statements) {
        await db.execute(sql);
      }
      await migrateColumns(db);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

/** Import seed JSON into empty Turso tables (once). */
export async function ensureSeeded(): Promise<void> {
  if (!isTursoConfigured()) return;
  await ensureSchema();
  if (!seedReady) {
    seedReady = (async () => {
      const db = getTursoClient();
      const count = await db.execute("SELECT COUNT(*) AS n FROM articles");
      const n = Number(count.rows[0]?.n ?? 0);
      if (n === 0) {
        const { default: articles } = await import("../../content/articles.json");
        const { default: comments } = await import("../../content/comments.json");
        const { default: newsletter } = await import("../../content/newsletter.json");

        for (const a of articles as Array<{
          id: string;
          slug: string;
          title: string;
          excerpt: string;
          body: string;
          rubric: string;
          author: string;
          publishedAt: string;
          featured: boolean;
          commentsEnabled: boolean;
          coverImage?: string;
        }>) {
          await db.execute({
            sql: `INSERT OR IGNORE INTO articles
              (id, slug, title, excerpt, body, rubric, author, published_at, featured, comments_enabled, cover_image)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              a.id,
              a.slug,
              a.title,
              a.excerpt,
              a.body,
              a.rubric,
              a.author,
              a.publishedAt,
              a.featured ? 1 : 0,
              a.commentsEnabled !== false ? 1 : 0,
              a.coverImage ?? null,
            ],
          });
        }

        for (const c of comments as Array<{
          id: string;
          articleId: string;
          author: string;
          body: string;
          createdAt: string;
        }>) {
          await db.execute({
            sql: `INSERT OR IGNORE INTO comments
              (id, article_id, author, body, created_at)
              VALUES (?, ?, ?, ?, ?)`,
            args: [c.id, c.articleId, c.author, c.body, c.createdAt],
          });
        }

        for (const e of newsletter as Array<{
          id?: string;
          email: string;
          createdAt: string;
        }>) {
          await db.execute({
            sql: `INSERT OR IGNORE INTO newsletter (id, email, created_at) VALUES (?, ?, ?)`,
            args: [e.id ?? `n_${e.email}`, e.email, e.createdAt],
          });
        }
      }

      const issueCount = await db.execute("SELECT COUNT(*) AS n FROM issues");
      if (Number(issueCount.rows[0]?.n ?? 0) === 0) {
        const { default: issues } = await import("../../content/issues.json");
        for (const iss of issues as Array<{
          id: string;
          slug: string;
          title: string;
          month: number;
          year: number;
          description?: string;
          pdfUrl: string;
          coverImage?: string;
          publishedAt: string;
        }>) {
          await db.execute({
            sql: `INSERT OR IGNORE INTO issues
              (id, slug, title, month, year, description, pdf_url, cover_image, published_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      }
    })().catch((err) => {
      seedReady = null;
      throw err;
    });
  }
  await seedReady;
}
