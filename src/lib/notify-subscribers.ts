import { listNewsletterEmails } from "./newsletter";
import {
  getEmailFrom,
  getResendClient,
  getSiteUrl,
  isResendConfigured,
} from "./resend";

export type NotifyKind = "article" | "video" | "issue";

export type NotifyPayload = {
  kind: NotifyKind;
  title: string;
  excerpt?: string;
  /** Path or absolute URL to the content */
  path: string;
};

const KIND_LABEL: Record<NotifyKind, string> = {
  article: "Nouvelle brève",
  video: "Nouvelle capsule",
  issue: "Nouveau mensuel",
};

function absoluteUrl(path: string): string {
  const base = getSiteUrl().replace(/\/$/, "");
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildHtml(payload: NotifyPayload, link: string): string {
  const label = KIND_LABEL[payload.kind];
  const excerpt = (payload.excerpt || "").trim();
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #B91C1C; font-weight: bold; margin: 0 0 8px;">Journal Ferñent</p>
  <h1 style="font-size: 22px; margin: 0 0 12px;">${escapeHtml(label)} : ${escapeHtml(payload.title)}</h1>
  ${excerpt ? `<p style="color: #444; margin: 0 0 20px;">${escapeHtml(excerpt)}</p>` : ""}
  <p style="margin: 0 0 24px;">
    <a href="${escapeAttr(link)}" style="display: inline-block; background: #B91C1C; color: #fff; text-decoration: none; padding: 10px 16px; font-size: 13px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase;">Lire sur le site</a>
  </p>
  <p style="font-size: 12px; color: #888; margin: 0;">Vous recevez cet e-mail car vous êtes abonné·e à la newsletter Ferñent.</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Notify all newsletter subscribers about newly published content.
 * Never throws — returns {skipped:true} if Resend is not configured.
 */
export async function notifySubscribers(
  payload: NotifyPayload,
): Promise<{ skipped: boolean; sent?: number; error?: string }> {
  if (!isResendConfigured()) {
    console.warn(
      "[notify-subscribers] RESEND_API_KEY missing — skipping email alert",
    );
    return { skipped: true };
  }

  const resend = getResendClient();
  if (!resend) {
    return { skipped: true };
  }

  const emails = await listNewsletterEmails();
  if (emails.length === 0) {
    console.warn("[notify-subscribers] no newsletter subscribers — skip");
    return { skipped: true };
  }

  const link = absoluteUrl(payload.path);
  const subject = `[Ferñent] ${KIND_LABEL[payload.kind]} : ${payload.title}`;
  const html = buildHtml(payload, link);
  const from = getEmailFrom();

  try {
    let sent = 0;
    const batches = chunk(emails, 50);
    for (const batch of batches) {
      const { error } = await resend.batch.send(
        batch.map((to) => ({
          from,
          to: [to],
          subject,
          html,
        })),
      );
      if (error) {
        console.error("[notify-subscribers] batch error", error);
        return {
          skipped: false,
          sent,
          error: typeof error === "object" && error && "message" in error
            ? String((error as { message: string }).message)
            : String(error),
        };
      }
      sent += batch.length;
    }
    return { skipped: false, sent };
  } catch (err) {
    console.error("[notify-subscribers] send failed", err);
    return {
      skipped: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
