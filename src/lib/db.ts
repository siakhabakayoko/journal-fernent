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
  cover_image TEXT,
  audio_url TEXT,
  audio_text_hash TEXT
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
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

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL,
  duration TEXT,
  youtube_url TEXT,
  youtube_id TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  placeholder INTEGER NOT NULL DEFAULT 1,
  rubric TEXT
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS banned_keywords (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_articles_rubric ON articles(rubric);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_issues_year_month ON issues(year, month);
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_banned_keywords_word ON banned_keywords(word);
`;

async function migrateColumns(db: Client): Promise<void> {
  // Existing DBs created before cover_image / issues need soft migrations.
  try {
    await db.execute("ALTER TABLE articles ADD COLUMN cover_image TEXT");
  } catch {
    /* column may already exist */
  }
  try {
    await db.execute("ALTER TABLE articles ADD COLUMN audio_url TEXT");
  } catch {
    /* column may already exist */
  }
  try {
    await db.execute("ALTER TABLE articles ADD COLUMN audio_text_hash TEXT");
  } catch {
    /* column may already exist */
  }
  try {
    await db.execute("ALTER TABLE comments ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* column may already exist */
  }
  try {
    await db.execute("ALTER TABLE videos ADD COLUMN rubric TEXT");
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

/** Sync seed JSON into Turso (articles: full replace; other tables: empty-only). */
export async function ensureSeeded(): Promise<void> {
  if (!isTursoConfigured()) return;
  await ensureSchema();
  if (!seedReady) {
    seedReady = (async () => {
      const db = getTursoClient();

      // Full replace sync of articles from content/articles.json (upsert + prune).
      const { default: articles } = await import("../../content/articles.json");
      type SeedArticle = {
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
        audioUrl?: string;
        audioTextHash?: string;
      };
      const seedArticles = articles as SeedArticle[];
      const seedIds = new Set(seedArticles.map((a) => a.id));

      for (const a of seedArticles) {
        await db.execute({
          sql: `INSERT INTO articles
            (id, slug, title, excerpt, body, rubric, author, published_at, featured, comments_enabled, cover_image, audio_url, audio_text_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              slug = excluded.slug,
              title = excluded.title,
              excerpt = excluded.excerpt,
              body = excluded.body,
              rubric = excluded.rubric,
              author = excluded.author,
              published_at = excluded.published_at,
              featured = excluded.featured,
              comments_enabled = excluded.comments_enabled,
              cover_image = COALESCE(NULLIF(articles.cover_image, ''), excluded.cover_image),
              audio_url = COALESCE(excluded.audio_url, articles.audio_url),
              audio_text_hash = COALESCE(excluded.audio_text_hash, articles.audio_text_hash)`,
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
            a.audioUrl ?? null,
            a.audioTextHash ?? null,
          ],
        });
      }

      // Drop retired prototype / "Notre journal" rows if they are not in the seed set.
      // Do not prune unknown admin-created ids.
      const retiredIds = [
        "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10",
      ];
      for (const id of retiredIds) {
        if (seedIds.has(id)) continue;
        await db.execute({
          sql: "DELETE FROM articles WHERE id = ?",
          args: [id],
        });
        await db.execute({
          sql: "DELETE FROM comments WHERE article_id = ?",
          args: [id],
        });
      }

      const commentCount = await db.execute("SELECT COUNT(*) AS n FROM comments");
      if (Number(commentCount.rows[0]?.n ?? 0) === 0) {
        const { default: comments } = await import("../../content/comments.json");
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
      }

      const newsletterCount = await db.execute(
        "SELECT COUNT(*) AS n FROM newsletter",
      );
      if (Number(newsletterCount.rows[0]?.n ?? 0) === 0) {
        const { default: newsletter } = await import(
          "../../content/newsletter.json"
        );
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

      // Upsert monthly issues from seed so new PDFs (e.g. Avril 2026) land in Turso.
      {
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
            sql: `INSERT INTO issues
              (id, slug, title, month, year, description, pdf_url, cover_image, published_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                slug = excluded.slug,
                title = excluded.title,
                month = excluded.month,
                year = excluded.year,
                description = excluded.description,
                pdf_url = excluded.pdf_url,
                cover_image = excluded.cover_image,
                published_at = excluded.published_at`,
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

      const videoCount = await db.execute("SELECT COUNT(*) AS n FROM videos");
      if (Number(videoCount.rows[0]?.n ?? 0) === 0) {
        const { default: videos } = await import("../../content/videos.json");
        for (const v of videos as Array<{
          id: string;
          title: string;
          description: string;
          publishedAt: string;
          duration?: string;
          youtubeUrl?: string;
          youtubeId?: string;
          videoUrl?: string;
          thumbnailUrl?: string;
          placeholder?: boolean;
          rubric?: string;
        }>) {
          const hasMedia = Boolean(v.youtubeId || v.youtubeUrl || v.videoUrl);
          await db.execute({
            sql: `INSERT OR IGNORE INTO videos
              (id, title, description, published_at, duration, youtube_url, youtube_id, video_url, thumbnail_url, placeholder, rubric)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              v.id,
              v.title,
              v.description ?? "",
              v.publishedAt,
              v.duration ?? null,
              v.youtubeUrl ?? null,
              v.youtubeId ?? null,
              v.videoUrl ?? null,
              v.thumbnailUrl ?? null,
              hasMedia ? 0 : v.placeholder !== false ? 1 : 0,
              v.rubric ?? null,
            ],
          });
        }
      }

      // One-time: drop retired "Notre journal" article from public catalog.
      try {
        await db.execute({
          sql: "DELETE FROM articles WHERE id = ? OR slug = ?",
          args: ["a9", "ce-que-veut-dire-fernent"],
        });
        await db.execute({
          sql: "DELETE FROM comments WHERE article_id = ?",
          args: ["a9"],
        });
      } catch {
        /* non-fatal */
      }

      // Backfill video rubrics from seed when column is empty (existing DBs).
      try {
        const { default: videoSeed } = await import("../../content/videos.json");
        for (const v of videoSeed as Array<{ id: string; rubric?: string }>) {
          if (!v.rubric) continue;
          await db.execute({
            sql: `UPDATE videos SET rubric = ?
                   WHERE id = ? AND (rubric IS NULL OR rubric = '')`,
            args: [v.rubric, v.id],
          });
        }
      } catch {
        /* seed missing or update failed — non-fatal */
      }

      const contactCount = await db.execute(
        "SELECT COUNT(*) AS n FROM contact_messages",
      );
      if (Number(contactCount.rows[0]?.n ?? 0) === 0) {
        try {
          const { default: messages } = await import(
            "../../content/contact-messages.json"
          );
          for (const m of messages as Array<{
            id: string;
            name: string;
            email: string;
            subject?: string;
            body: string;
            createdAt: string;
            status?: string;
          }>) {
            await db.execute({
              sql: `INSERT OR IGNORE INTO contact_messages
                (id, name, email, subject, body, created_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
              args: [
                m.id,
                m.name,
                m.email,
                m.subject ?? null,
                m.body,
                m.createdAt,
                m.status ?? "new",
              ],
            });
          }
        } catch {
          /* empty seed file is fine */
        }
      }

      const keywordCount = await db.execute(
        "SELECT COUNT(*) AS n FROM banned_keywords",
      );
      if (Number(keywordCount.rows[0]?.n ?? 0) === 0) {
        try {
          const { default: keywords } = await import(
            "../../content/banned-keywords.json"
          );
          for (const k of keywords as Array<{
            id: string;
            word: string;
            createdAt: string;
          }>) {
            await db.execute({
              sql: `INSERT OR IGNORE INTO banned_keywords (id, word, created_at)
                VALUES (?, ?, ?)`,
              args: [k.id, k.word, k.createdAt],
            });
          }
        } catch {
          /* empty seed file is fine */
        }
      }
    })().catch((err) => {
      seedReady = null;
      throw err;
    });
  }
  await seedReady;
}
