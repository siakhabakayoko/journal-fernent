import { Resend } from "resend";

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export function getEmailFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "Journal Ferñent <onboarding@resend.dev>"
  );
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://journal-fernent.vercel.app"
  );
}
