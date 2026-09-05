import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { isAdminAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".pdf",
  ".mp4",
  ".webm",
  ".ogg",
  ".mov",
]);

function safeName(original: string): string {
  const base = original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 80);
  return base || `file-${Date.now()}`;
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const blob = file as File;
  const ext = path.extname(blob.name || "").toLowerCase() || guessExt(blob.type);
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: "unsupported_type", message: "Images, PDF ou vidéo (mp4/webm/ogg/mov) uniquement." },
      { status: 400 },
    );
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const name = `${Date.now().toString(36)}-${safeName(blob.name || `upload${ext}`)}`;
  const relativeKey = `uploads/${yyyy}/${name}`;
  const bytes = Buffer.from(await blob.arrayBuffer());

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (blobToken) {
    const result = await put(relativeKey, bytes, {
      access: "public",
      token: blobToken,
      contentType: blob.type || undefined,
    });
    return NextResponse.json({ url: result.url });
  }

  // Local / writable filesystem
  const publicDir = path.join(process.cwd(), "public", "uploads", yyyy);
  try {
    await fs.mkdir(publicDir, { recursive: true });
    const dest = path.join(publicDir, name);
    await fs.writeFile(dest, bytes);
    return NextResponse.json({ url: `/uploads/${yyyy}/${name}` });
  } catch (err) {
    console.error("[upload] filesystem write failed", err);
    return NextResponse.json(
      {
        error: "readonly_filesystem",
        message:
          "Le système de fichiers est en lecture seule et BLOB_READ_WRITE_TOKEN est absent. Collez une URL d'image/PDF externe dans le champ URL, ou configurez Vercel Blob (BLOB_READ_WRITE_TOKEN).",
      },
      { status: 503 },
    );
  }
}

function guessExt(mime: string): string {
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/svg+xml") return ".svg";
  if (mime === "video/mp4") return ".mp4";
  if (mime === "video/webm") return ".webm";
  if (mime === "video/ogg") return ".ogg";
  if (mime === "video/quicktime") return ".mov";
  return "";
}
