export type Rubric =
  | "senegal"
  | "afrique"
  | "international"
  | "economie"
  | "social"
  | "notre-journal";

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  rubric: Rubric;
  author: string;
  publishedAt: string;
  featured: boolean;
  commentsEnabled: boolean;
  /** Optional cover image URL or local path (e.g. /covers/… or /uploads/…). */
  coverImage?: string;
  /** Public URL of pre-generated listen audio (Vercel Blob). */
  audioUrl?: string;
  /** SHA-256 of the plain text used to generate audioUrl (skip regen when unchanged). */
  audioTextHash?: string;
};

export type MonthlyIssue = {
  id: string;
  slug: string;
  title: string;
  month: number;
  year: number;
  description?: string;
  pdfUrl: string;
  coverImage?: string;
  publishedAt: string;
};

export type Video = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  duration?: string;
  youtubeUrl?: string;
  youtubeId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  /** Optional content rubric for Capsules tabs. */
  rubric?: Rubric;
  /** true when neither youtube nor videoUrl */
  placeholder?: boolean;
};

export type Comment = {
  id: string;
  articleId: string;
  author: string;
  body: string;
  createdAt: string;
  /** Soft-hidden by moderation; excluded from public lists by default. */
  hidden?: boolean;
};

export type ContactMessageStatus = "new" | "read" | "archived";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject?: string;
  body: string;
  createdAt: string;
  status: ContactMessageStatus;
};

export type BannedKeyword = {
  id: string;
  word: string;
  createdAt: string;
};

/** Public rubrics shown as content tabs (Brèves / Capsules) and footer links. */
export const PUBLIC_RUBRICS: Rubric[] = [
  "senegal",
  "afrique",
  "international",
  "economie",
  "social",
];

/** All rubrics including legacy/admin-only `notre-journal`. */
export const ALL_RUBRICS: Rubric[] = [...PUBLIC_RUBRICS, "notre-journal"];

export const RUBRICS: { slug: Rubric; href: string }[] = PUBLIC_RUBRICS.map(
  (slug) => ({ slug, href: `/breves?r=${slug}` }),
);

export const MOTTO =
  "Union libre des peuples libres d'Afrique. Solidarité internationaliste des travailleurs";

export const CONTACT_EMAIL = "fernentbirane@gmail.com";

export function isRubric(value: string): value is Rubric {
  return (ALL_RUBRICS as string[]).includes(value);
}

export function isPublicRubric(value: string): value is Rubric {
  return (PUBLIC_RUBRICS as string[]).includes(value);
}
