/** Split text into overlapping chunks (~500–800 chars). */
export function chunkText(
  text: string,
  opts: { size?: number; overlap?: number } = {},
): string[] {
  const size = opts.size ?? 700;
  const overlap = opts.overlap ?? 120;
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!normalized) return [];
  if (normalized.length <= size) return [normalized];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + size, normalized.length);
    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const soft = Math.max(
        window.lastIndexOf("\n\n"),
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? "),
      );
      if (soft > size * 0.4) {
        end = start + soft;
        if (".!?".includes(normalized[end] || "")) end += 1;
        if (normalized[end] === " ") end += 1;
      } else {
        const sp = window.lastIndexOf(" ");
        if (sp > size * 0.4) end = start + sp;
      }
    }
    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= normalized.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}
