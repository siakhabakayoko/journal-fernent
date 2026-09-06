import { promises as fs } from "fs";
import path from "path";
import type { Rubric, Video } from "./types";
import { isRubric } from "./types";
import seed from "../../content/videos.json";
import {
  ensureSchema,
  ensureSeeded,
  getTursoClient,
  isTursoConfigured,
} from "./db";
import type { PersistMode } from "./articles";

const DATA_PATH = path.join(process.cwd(), "content", "videos.json");

let memoryStore: Video[] | null = null;

/** Extract 11-char YouTube video id from common watch/share/embed URLs. */
export function extractYoutubeId(input: string): string | undefined {
  const raw = input.trim();
  if (!raw) return undefined;
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      // /embed/ID, /shorts/ID, /live/ID, /v/ID
      if (
        parts.length >= 2 &&
        ["embed", "shorts", "live", "v"].includes(parts[0]) &&
        /^[a-zA-Z0-9_-]{11}$/.test(parts[1])
      ) {
        return parts[1];
      }
    }
  } catch {
    /* not a URL */
  }
  const m = raw.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return m?.[1];
}

export function normalizeVideo(partial: Partial<Video> & Pick<Video, "id" | "title">): Video {
  const youtubeUrl = String(partial.youtubeUrl || "").trim() || undefined;
  const youtubeId =
    partial.youtubeId?.trim() ||
    (youtubeUrl ? extractYoutubeId(youtubeUrl) : undefined) ||
    undefined;
  const videoUrl = String(partial.videoUrl || "").trim() || undefined;
  const thumbnailUrl = String(partial.thumbnailUrl || "").trim() || undefined;
  const hasMedia = Boolean(youtubeId || videoUrl);
  const rubricRaw = partial.rubric != null ? String(partial.rubric).trim() : "";
  const rubric: Rubric | undefined = isRubric(rubricRaw) ? rubricRaw : undefined;
  return {
    id: partial.id,
    title: partial.title.trim(),
    description: String(partial.description || "").trim(),
    publishedAt: String(
      partial.publishedAt || new Date().toISOString().slice(0, 10),
    ),
    duration: String(partial.duration || "").trim() || undefined,
    youtubeUrl,
    youtubeId,
    videoUrl,
    thumbnailUrl,
    rubric,
    placeholder: hasMedia ? false : partial.placeholder !== false,
  };
}

function cloneSeed(): Video[] {
  return (JSON.parse(JSON.stringify(seed)) as Video[]).map((v) =>
    normalizeVideo(v),
  );
}

function rowToVideo(row: Record<string, unknown>): Video {
  return normalizeVideo({
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ""),
    publishedAt: String(row.published_at ?? row.publishedAt ?? ""),
    duration: row.duration != null ? String(row.duration) : undefined,
    youtubeUrl:
      row.youtube_url != null
        ? String(row.youtube_url)
        : row.youtubeUrl != null
          ? String(row.youtubeUrl)
          : undefined,
    youtubeId:
      row.youtube_id != null
        ? String(row.youtube_id)
        : row.youtubeId != null
          ? String(row.youtubeId)
          : undefined,
    videoUrl:
      row.video_url != null
        ? String(row.video_url)
        : row.videoUrl != null
          ? String(row.videoUrl)
          : undefined,
    thumbnailUrl:
      row.thumbnail_url != null
        ? String(row.thumbnail_url)
        : row.thumbnailUrl != null
          ? String(row.thumbnailUrl)
          : undefined,
    rubric:
      row.rubric != null && String(row.rubric).trim()
        ? (String(row.rubric) as Rubric)
        : undefined,
    placeholder: Number(row.placeholder ?? 1) !== 0,
  });
}

const VIDEO_SELECT =
  "id, title, description, published_at, duration, youtube_url, youtube_id, video_url, thumbnail_url, placeholder, rubric";

async function readFromDisk(): Promise<Video[] | null> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return (JSON.parse(raw) as Video[]).map((v) => normalizeVideo(v));
  } catch {
    return null;
  }
}

async function getVideosFromTurso(): Promise<Video[]> {
  await ensureSeeded();
  const db = getTursoClient();
  const result = await db.execute(
    `SELECT ${VIDEO_SELECT} FROM videos ORDER BY published_at DESC`,
  );
  return result.rows.map((r) => rowToVideo(r as Record<string, unknown>));
}

export async function getVideos(): Promise<Video[]> {
  if (isTursoConfigured()) {
    try {
      return await getVideosFromTurso();
    } catch (err) {
      console.error("[videos] Turso read failed, falling back to JSON", err);
    }
  }
  if (memoryStore) return [...memoryStore];
  const disk = await readFromDisk();
  if (disk) return disk;
  return cloneSeed();
}

async function persist(videos: Video[]): Promise<{ mode: PersistMode }> {
  if (isTursoConfigured()) {
    await ensureSchema();
    const db = getTursoClient();
    for (const v of videos) {
      await db.execute({
        sql: `INSERT INTO videos
          (id, title, description, published_at, duration, youtube_url, youtube_id, video_url, thumbnail_url, placeholder, rubric)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title=excluded.title,
            description=excluded.description,
            published_at=excluded.published_at,
            duration=excluded.duration,
            youtube_url=excluded.youtube_url,
            youtube_id=excluded.youtube_id,
            video_url=excluded.video_url,
            thumbnail_url=excluded.thumbnail_url,
            placeholder=excluded.placeholder,
            rubric=excluded.rubric`,
        args: [
          v.id,
          v.title,
          v.description,
          v.publishedAt,
          v.duration ?? null,
          v.youtubeUrl ?? null,
          v.youtubeId ?? null,
          v.videoUrl ?? null,
          v.thumbnailUrl ?? null,
          v.placeholder ? 1 : 0,
          v.rubric ?? null,
        ],
      });
    }
    return { mode: "turso" };
  }
  try {
    await fs.writeFile(DATA_PATH, JSON.stringify(videos, null, 2), "utf8");
    memoryStore = null;
    return { mode: "disk" };
  } catch {
    memoryStore = videos;
    return { mode: "memory" };
  }
}

export async function upsertVideo(
  video: Video,
): Promise<{ video: Video; mode: PersistMode }> {
  const normalized = normalizeVideo(video);
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      await db.execute({
        sql: `INSERT INTO videos
          (id, title, description, published_at, duration, youtube_url, youtube_id, video_url, thumbnail_url, placeholder, rubric)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title=excluded.title,
            description=excluded.description,
            published_at=excluded.published_at,
            duration=excluded.duration,
            youtube_url=excluded.youtube_url,
            youtube_id=excluded.youtube_id,
            video_url=excluded.video_url,
            thumbnail_url=excluded.thumbnail_url,
            placeholder=excluded.placeholder,
            rubric=excluded.rubric`,
        args: [
          normalized.id,
          normalized.title,
          normalized.description,
          normalized.publishedAt,
          normalized.duration ?? null,
          normalized.youtubeUrl ?? null,
          normalized.youtubeId ?? null,
          normalized.videoUrl ?? null,
          normalized.thumbnailUrl ?? null,
          normalized.placeholder ? 1 : 0,
          normalized.rubric ?? null,
        ],
      });
      return { video: normalized, mode: "turso" };
    } catch (err) {
      console.error("[videos] Turso upsert failed", err);
      throw err;
    }
  }
  const videos = await getVideos();
  const idx = videos.findIndex((v) => v.id === normalized.id);
  if (idx >= 0) videos[idx] = normalized;
  else videos.unshift(normalized);
  const { mode } = await persist(videos);
  return { video: normalized, mode };
}

export async function deleteVideo(
  id: string,
): Promise<{ ok: boolean; mode: PersistMode }> {
  if (isTursoConfigured()) {
    try {
      await ensureSchema();
      const db = getTursoClient();
      const result = await db.execute({
        sql: "DELETE FROM videos WHERE id = ?",
        args: [id],
      });
      return {
        ok: (result.rowsAffected ?? 0) > 0,
        mode: "turso",
      };
    } catch (err) {
      console.error("[videos] Turso delete failed", err);
      throw err;
    }
  }
  const videos = await getVideos();
  const next = videos.filter((v) => v.id !== id);
  if (next.length === videos.length) return { ok: false, mode: "disk" };
  const { mode } = await persist(next);
  return { ok: true, mode };
}
