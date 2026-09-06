import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { deleteIssue, getIssues, slugify, upsertIssue } from "@/lib/issues";
import type { MonthlyIssue } from "@/lib/types";
import { notifySubscribers } from "@/lib/notify-subscribers";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const issues = await getIssues();
  return NextResponse.json({ issues });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const month = Math.min(12, Math.max(1, Number(body.month) || 1));
  const year = Number(body.year) || new Date().getFullYear();
  const id =
    typeof body.id === "string" && body.id
      ? body.id
      : `iss_${Date.now().toString(36)}`;

  const existing = (await getIssues()).find((i) => i.id === id);
  const isCreate = !existing;

  const issue: MonthlyIssue = {
    id,
    slug:
      typeof body.slug === "string" && body.slug.trim()
        ? slugify(body.slug)
        : slugify(body.title),
    title: body.title.trim(),
    month,
    year,
    description: String(body.description || "").trim() || undefined,
    pdfUrl: String(body.pdfUrl || "").trim(),
    // Cover images disabled for mensuels — omit on save
    coverImage: undefined,
    publishedAt: String(
      body.publishedAt || `${year}-${String(month).padStart(2, "0")}-01`,
    ),
  };
  let result;
  try {
    result = await upsertIssue(issue);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/issues] persist failed", message);
    return NextResponse.json(
      { error: "persist_failed", message },
      { status: 500 },
    );
  }

  if (isCreate) {
    void notifySubscribers({
      kind: "issue",
      title: issue.title,
      excerpt: issue.description,
      path: "/mensuel",
    }).catch((err) =>
      console.error("[admin/issues] notify failed", err),
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
  let result;
  try {
    result = await deleteIssue(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/issues] delete persist failed", message);
    return NextResponse.json(
      { error: "persist_failed", message },
      { status: 500 },
    );
  }
  if (!result.ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(result);
}
