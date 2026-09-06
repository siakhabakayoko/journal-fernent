/**
 * Shared helpers for article listen / pre-generated TTS audio.
 * Keep this module free of Node-only APIs so client components can import it.
 */

/** Plain text sent to TTS — same shape as ArticleListenButton historically used. */
export function buildArticleListenText(
  title: string,
  excerpt: string,
  body: string,
): string {
  const paragraphs = body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return [title.trim(), excerpt.trim(), ...paragraphs]
    .filter(Boolean)
    .join("\n\n");
}
