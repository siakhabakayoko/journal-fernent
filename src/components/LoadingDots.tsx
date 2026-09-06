"use client";

type Props = {
  /** Visible label next to the dots (French UI). */
  label?: string;
  /** Screen-reader announcement when no visible label. */
  srLabel?: string;
  className?: string;
  /** Dot color: red (default) or white on dark/red backgrounds. */
  tone?: "red" | "white" | "muted";
  size?: "sm" | "md";
};

export function LoadingDots({
  label,
  srLabel,
  className = "",
  tone = "red",
  size = "md",
}: Props) {
  const toneClass =
    tone === "white"
      ? "loading-dots--white"
      : tone === "muted"
        ? "loading-dots--muted"
        : "loading-dots--red";
  const sizeClass = size === "sm" ? "loading-dots--sm" : "";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {(label || srLabel) && (
        <span className={label ? "text-inherit" : "sr-only"}>
          {label || srLabel}
        </span>
      )}
      <span
        className={`loading-dots ${toneClass} ${sizeClass}`}
        aria-hidden
      >
        <span />
        <span />
        <span />
      </span>
    </span>
  );
}
