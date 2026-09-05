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

export const RUBRICS: { slug: Rubric; href: string }[] = [
  { slug: "senegal", href: "/rubrique/senegal" },
  { slug: "afrique", href: "/rubrique/afrique" },
  { slug: "international", href: "/rubrique/international" },
  { slug: "economie", href: "/rubrique/economie" },
  { slug: "social", href: "/rubrique/social" },
  { slug: "notre-journal", href: "/rubrique/notre-journal" },
];

export const MOTTO =
  "Union libre des peuples libres d'Afrique. Solidarité internationaliste des travailleurs";

export const CONTACT_EMAIL = "fernentbirane@gmail.com";
