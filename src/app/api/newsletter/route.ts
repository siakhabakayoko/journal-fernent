import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type Entry = { email: string; createdAt: string };

const FILE = path.join(process.cwd(), "content", "newsletter.json");
let memory: Entry[] = [];

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function load(): Promise<Entry[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Entry[];
  } catch {
    return memory;
  }
}

async function save(entries: Entry[]) {
  try {
    await fs.writeFile(FILE, JSON.stringify(entries, null, 2), "utf8");
  } catch {
    memory = entries;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!validEmail(email)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const entries = await load();
  if (!entries.some((e) => e.email === email)) {
    entries.push({ email, createdAt: new Date().toISOString() });
    await save(entries);
  }
  return NextResponse.json({ ok: true });
}
