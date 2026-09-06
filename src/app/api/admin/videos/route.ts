import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { deleteVideo, getVideos, normalizeVideo, upsertVideo } from "@/lib/videos";
import { isRubric, type Video } from "@/lib/types";
import { notifySubscribers } from "@/lib/notify-subscribers";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const videos = await getVideos();
  return NextResponse.json({ videos });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const id =
    typeof body.id === "string" && body.id
      ? body.id
      : `v_${Date.now().toString(36)}`;

  const existing = (await getVideos()).find((v) => v.id === id);
  const isCreate = !existing;

  const video: Video = normalizeVideo({
    id,
    title: body.title,
    description: String(body.description || ""),
    publishedAt: String(
      body.publishedAt || new Date().toISOString().slice(0, 10),
    ),
    duration: String(body.duration || "").trim() || undefined,
    youtubeUrl: String(body.youtubeUrl || "").trim() || undefined,
    youtubeId: String(body.youtubeId || "").trim() || undefined,
    videoUrl: String(body.videoUrl || "").trim() || undefined,
    thumbnailUrl: String(body.thumbnailUrl || "").trim() || undefined,
    rubric: (() => {
      const r = String(body.rubric || "").trim();
      return isRubric(r) ? r : undefined;
    })(),
    placeholder: body.placeholder,
  });
  const result = await upsertVideo(video);

  if (isCreate) {
    void notifySubscribers({
      kind: "video",
      title: video.title,
      excerpt: video.description,
      path: "/capsules",
    }).catch((err) =>
      console.error("[admin/videos] notify failed", err),
    );
  }

  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const result = await deleteVideo(id);
  if (!result.ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(result);
}
