import { listNewsletterEmails } from "./newsletter";
import {
  getEmailFrom,
  getResendClient,
  getSiteUrl,
  isResendConfigured,
} from "./resend";
import { CONTACT_EMAIL, MOTTO } from "./types";

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

const BRAND = {
  red: "#E10600",
  paper: "#faf8f5",
  ink: "#14110f",
  muted: "#6b6560",
  rule: "#e7e2da",
  white: "#ffffff",
} as const;

function absoluteUrl(path: string, siteUrl = getSiteUrl()): string {
  const base = siteUrl.replace(/\/$/, "");
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
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

export type AlertEmailInput = {
  kind: NotifyKind;
  title: string;
  excerpt?: string;
  link: string;
  siteUrl?: string;
};

export type AlertEmail = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Build magazine-style HTML + plain-text alert for Resend.
 * Exported for reuse and tests.
 */
export function buildAlertEmail(input: AlertEmailInput): AlertEmail {
  const siteUrl = (input.siteUrl || getSiteUrl()).replace(/\/$/, "");
  const label = KIND_LABEL[input.kind];
  const title = input.title.trim();
  const excerpt = (input.excerpt || "").trim();
  const link = input.link;
  const logoUrl = `${siteUrl}/logo-fernent.png`;
  const subject = `[Ferñent] ${label} : ${title}`;

  const safeLabel = escapeHtml(label);
  const safeTitle = escapeHtml(title);
  const safeExcerpt = escapeHtml(excerpt);
  const safeLink = escapeAttr(link);
  const safeSite = escapeAttr(siteUrl);
  const safeLogo = escapeAttr(logoUrl);
  const safeMotto = escapeHtml(MOTTO);
  const safeContact = escapeHtml(CONTACT_EMAIL);
  const safeContactHref = escapeAttr(`mailto:${CONTACT_EMAIL}`);

  const excerptBlock = excerpt
    ? `<tr>
      <td style="padding: 0 0 28px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 16px; line-height: 1.65; color: ${BRAND.muted};">
        ${safeExcerpt}
      </td>
    </tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${safeLabel} — Journal Ferñent</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.paper}; color: ${BRAND.ink}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${safeLabel} : ${safeTitle}${excerpt ? ` — ${safeExcerpt}` : ""}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.paper};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: ${BRAND.white}; border: 1px solid ${BRAND.rule};">
          <!-- Red accent bar -->
          <tr>
            <td style="height: 4px; line-height: 4px; font-size: 0; background-color: ${BRAND.red};">&nbsp;</td>
          </tr>

          <!-- Masthead -->
          <tr>
            <td style="padding: 28px 36px 20px; text-align: center; border-bottom: 1px solid ${BRAND.rule};">
              <a href="${safeSite}" style="text-decoration: none; color: ${BRAND.ink};">
                <img src="${safeLogo}" alt="Journal Ferñent" width="56" height="56" style="display: block; margin: 0 auto 14px; border: 0; outline: none;" />
              </a>
              <p style="margin: 0 0 6px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 22px; line-height: 1.2; letter-spacing: 0.02em; color: ${BRAND.ink};">
                <a href="${safeSite}" style="text-decoration: none; color: ${BRAND.ink};">Journal Ferñent</a>
              </p>
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.45; letter-spacing: 0.04em; color: ${BRAND.muted};">
                « ${safeMotto} »
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 36px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 0 0 18px;">
                    <span style="display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${BRAND.red}; border: 1px solid ${BRAND.red}; padding: 5px 10px;">
                      ${safeLabel}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 26px; line-height: 1.25; font-weight: normal; color: ${BRAND.ink};">
                    ${safeTitle}
                  </td>
                </tr>
                ${excerptBlock}
                <tr>
                  <td style="padding: 0 0 36px;" align="left">
                    <a href="${safeLink}" style="display: inline-block; background-color: ${BRAND.red}; color: ${BRAND.white}; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 14px 22px;">
                      Lire sur le site
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px 28px; border-top: 1px solid ${BRAND.rule}; background-color: ${BRAND.paper};">
              <p style="margin: 0 0 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.55; color: ${BRAND.muted};">
                Vous recevez cet e-mail car vous êtes inscrit·e à la newsletter Ferñent.
              </p>
              <p style="margin: 0 0 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.55; color: ${BRAND.muted};">
                <a href="${safeSite}" style="color: ${BRAND.red}; text-decoration: underline;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>
                &nbsp;·&nbsp;
                <a href="${safeContactHref}" style="color: ${BRAND.red}; text-decoration: underline;">${safeContact}</a>
              </p>
              <p style="margin: 0; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.4; color: ${BRAND.ink};">
                — Journal Ferñent
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    `Journal Ferñent`,
    `« ${MOTTO} »`,
    ``,
    `${label}`,
    title,
    excerpt ? `` : null,
    excerpt || null,
    ``,
    `Lire sur le site : ${link}`,
    ``,
    `—`,
    `Vous recevez cet e-mail car vous êtes inscrit·e à la newsletter Ferñent.`,
    siteUrl,
    CONTACT_EMAIL,
  ].filter((line): line is string => line !== null);

  return {
    subject,
    html,
    text: textLines.join("\n"),
  };
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
  const { subject, html, text } = buildAlertEmail({
    kind: payload.kind,
    title: payload.title,
    excerpt: payload.excerpt,
    link,
  });
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
          text,
        })),
      );
      if (error) {
        console.error("[notify-subscribers] batch error", error);
        return {
          skipped: false,
          sent,
          error:
            typeof error === "object" && error && "message" in error
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
