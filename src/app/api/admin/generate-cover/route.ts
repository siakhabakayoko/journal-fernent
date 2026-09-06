import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  FLUX_DEFAULT_SIZE,
  FLUX_FETCH_TIMEOUT_MS,
  fluxHealthStatus,
  generateFluxImage,
  hasNvidiaApiKey,
} from "@/lib/nvidia";

export const runtime = "nodejs";
/**
 * FLUX can take 10–60s+ on cold start. Fluid / Hobby with Fluid Compute
 * allows up to 300s; classic Hobby caps at 60 (Vercel clamps if unsupported).
 */
export const maxDuration = 300;

const RUBRIC_HINTS: Record<string, string> = {
  senegal:
    "Senegal, Dakar, West African urban and rural life, Teranga, contemporary Senegalese society",
  afrique:
    "pan-African landscapes and cities, African solidarity, continent-wide civic life",
  international:
    "global South perspectives, international diplomacy, world politics from an African viewpoint",
  economie:
    "markets, ports, agriculture, labor, informal economy, development and inequality in Africa",
  social:
    "community organizing, youth, education, health, women's rights, social justice in West Africa",
  "notre-journal":
    "independent journalism newsroom, militant press, red editorial aesthetic, print media craft",
};

function buildCoverPrompt(input: {
  title: string;
  excerpt?: string;
  rubrique?: string;
  customPrompt?: string;
}): string {
  if (input.customPrompt?.trim()) {
    return [
      input.customPrompt.trim(),
      "Photorealistic editorial press photography, dramatic natural light, high detail.",
      "No text, no typography, no logos, no watermarks, no captions, no UI overlays.",
    ].join(" ");
  }

  const rubric = (input.rubrique || "senegal").toLowerCase();
  const hint = RUBRIC_HINTS[rubric] || RUBRIC_HINTS.senegal;
  const excerpt = (input.excerpt || "").trim().slice(0, 280);
  const title = input.title.trim();

  return [
    `Editorial cover photograph for a panafrican militant newspaper (Journal Ferñent).`,
    `Article title theme: "${title}".`,
    excerpt ? `Context: ${excerpt}.` : "",
    `Visual mood / setting: ${hint}.`,
    `Style: photorealistic documentary press photo, Magnum-style photojournalism,`,
    `natural light, shallow depth of field, cinematic but grounded, 35mm reportage.`,
    `Subjects: African people and places when relevant, dignity and agency, not exoticism.`,
    `Color: rich earth tones with restrained red accents (#E10600 energy), no neon cyberpunk.`,
    `Strict: no text, no letters, no logos, no watermarks, no newspaper masthead, no UI.`,
    `Composition suitable as a wide article cover (landscape-friendly framing).`,
  ]
    .filter(Boolean)
    .join(" ");
}

function extForMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  return ".png";
}

async function storeCoverImage(
  bytes: Buffer,
  mimeType: string,
): Promise<string> {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const name = `${Date.now().toString(36)}-flux-cover${extForMime(mimeType)}`;
  const relativeKey = `covers/articles/${yyyy}/${name}`;

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (blobToken) {
    const result = await put(relativeKey, bytes, {
      access: "public",
      token: blobToken,
      contentType: mimeType,
    });
    console.info("[generate-cover] stored on Vercel Blob", result.url);
    return result.url;
  }

  const publicDir = path.join(
    process.cwd(),
    "public",
    "covers",
    "articles",
    yyyy,
  );
  try {
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(path.join(publicDir, name), bytes);
    const url = `/covers/articles/${yyyy}/${name}`;
    console.info("[generate-cover] stored on filesystem", url);
    return url;
  } catch (err) {
    console.error("[generate-cover] filesystem write failed", err);
    // Avoid huge data-URL JSON that breaks the admin client on Vercel.
    throw new Error(
      "Impossible d'enregistrer l'image (système de fichiers en lecture seule). Configurez BLOB_READ_WRITE_TOKEN sur Vercel.",
    );
  }
}

/** Health / readiness for admin cover generation. */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const health = fluxHealthStatus();
  return NextResponse.json({
    ...health,
    maxDuration: 300,
    fetchTimeoutMs: FLUX_FETCH_TIMEOUT_MS,
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
  });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!hasNvidiaApiKey()) {
    return NextResponse.json(
      {
        error: "missing_api_key",
        message:
          "NVIDIA_API_KEY n'est pas configurée. Ajoutez-la dans Vercel (Environment Variables) ou .env.local.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Corps JSON invalide." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "invalid", message: "Requête invalide." },
      { status: 400 },
    );
  }

  const {
    title,
    excerpt,
    summary,
    rubrique,
    category,
    customPrompt,
  } = body as Record<string, unknown>;

  const titleStr = typeof title === "string" ? title.trim() : "";
  if (!titleStr && !(typeof customPrompt === "string" && customPrompt.trim())) {
    return NextResponse.json(
      {
        error: "missing_title",
        message: "Le titre est requis pour générer une couverture.",
      },
      { status: 400 },
    );
  }

  const excerptStr =
    (typeof excerpt === "string" && excerpt) ||
    (typeof summary === "string" && summary) ||
    "";
  const rubriqueStr =
    (typeof rubrique === "string" && rubrique) ||
    (typeof category === "string" && category) ||
    "senegal";

  const prompt = buildCoverPrompt({
    title: titleStr || "Journal Ferñent",
    excerpt: excerptStr,
    rubrique: rubriqueStr,
    customPrompt: typeof customPrompt === "string" ? customPrompt : undefined,
  });

  try {
    const { bytes, mimeType } = await generateFluxImage(prompt, {
      width: FLUX_DEFAULT_SIZE,
      height: FLUX_DEFAULT_SIZE,
      seed: 0,
      steps: 4,
      signal: request.signal,
      timeoutMs: FLUX_FETCH_TIMEOUT_MS,
    });
    const url = await storeCoverImage(bytes, mimeType);
    return NextResponse.json({ url, prompt });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Échec de la génération FLUX.";
    console.error("[generate-cover]", message);
    const timedOut = /délai dépassé/i.test(message);
    return NextResponse.json(
      { error: timedOut ? "timeout" : "generation_failed", message },
      { status: timedOut ? 504 : 502 },
    );
  }
}
