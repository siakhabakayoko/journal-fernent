import { NextResponse } from "next/server";
import type { ContactMessage } from "@/lib/types";
import { addContactMessage } from "@/lib/contact-messages";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Honeypot: bots fill "website" / "company" — silently accept
  const honeypot =
    (typeof body.website === "string" && body.website.trim()) ||
    (typeof body.company === "string" && body.company.trim());
  if (honeypot) {
    return NextResponse.json({ ok: true });
  }

  const name =
    typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const subject =
    typeof body.subject === "string"
      ? body.subject.trim().slice(0, 200) || undefined
      : undefined;
  const text =
    typeof body.body === "string" ? body.body.trim().slice(0, 5000) : "";

  if (!name || !validEmail(email) || !text) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const message: ContactMessage = {
    id: `cm_${Date.now().toString(36)}`,
    name,
    email,
    subject,
    body: text,
    createdAt: new Date().toISOString(),
    status: "new",
  };
  const result = await addContactMessage(message);
  return NextResponse.json({
    ok: true,
    message: result.message,
    mode: result.mode,
  });
}
