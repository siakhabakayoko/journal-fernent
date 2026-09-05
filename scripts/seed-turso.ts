/**
 * Seed Turso from content/*.json when tables are empty.
 * Usage: bun run scripts/seed-turso.ts
 * Requires TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 */
import { ensureSchema, ensureSeeded, isTursoConfigured, getTursoClient } from "../src/lib/db";

async function main() {
  if (!isTursoConfigured()) {
    console.error(
      "Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN. Set them in .env.local or the environment.",
    );
    process.exit(1);
  }
  await ensureSchema();
  await ensureSeeded();
  const db = getTursoClient();
  const articles = await db.execute("SELECT COUNT(*) AS n FROM articles");
  const comments = await db.execute("SELECT COUNT(*) AS n FROM comments");
  const newsletter = await db.execute("SELECT COUNT(*) AS n FROM newsletter");
  const issues = await db.execute("SELECT COUNT(*) AS n FROM issues");
  const videos = await db.execute("SELECT COUNT(*) AS n FROM videos");
  console.log("Turso seed complete:");
  console.log(`  articles:   ${articles.rows[0]?.n}`);
  console.log(`  comments:   ${comments.rows[0]?.n}`);
  console.log(`  newsletter: ${newsletter.rows[0]?.n}`);
  console.log(`  issues:     ${issues.rows[0]?.n}`);
  console.log(`  videos:     ${videos.rows[0]?.n}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
