import { NextResponse } from "next/server";
import { subscribeNewsletter } from "@/lib/newsletter";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!validEmail(email)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const result = await subscribeNewsletter(email);
  return NextResponse.json({ ok: true, mode: result.mode, created: result.created });
}
