/**
 * Precompute corpus embeddings → content/rag-embeddings.json
 * Usage: bun run rag:index
 * Requires NVIDIA_API_KEY in env / .env.local / /workspace/.nvidia_api_key
 */
import { promises as fs } from "fs";
import path from "path";

async function loadEnv() {
  const candidates = [
    path.join(process.cwd(), ".env.local"),
    "/workspace/.nvidia_api_key",
  ];
  for (const p of candidates) {
    try {
      const raw = await fs.readFile(p, "utf8");
      if (p.endsWith(".nvidia_api_key")) {
        if (!process.env.NVIDIA_API_KEY) {
          process.env.NVIDIA_API_KEY = raw.trim();
        }
        continue;
      }
      for (const line of raw.split("\n")) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
        if (!m) continue;
        const key = m[1];
        let val = m[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  await loadEnv();
  if (!process.env.NVIDIA_API_KEY?.trim()) {
    console.error("NVIDIA_API_KEY manquante");
    process.exit(1);
  }
  const { getRagIndex } = await import("../src/lib/rag/index-store");
  const index = await getRagIndex({ forceRebuild: true });
  console.log(
    JSON.stringify(
      {
        ok: true,
        chunks: index.chunks.length,
        model: index.model,
        dimensions: index.dimensions,
        fingerprint: index.fingerprint,
        createdAt: index.createdAt,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
