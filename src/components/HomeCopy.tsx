"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Section = keyof Dictionary["home"];

export function HomeCopy({
  section,
  as: Tag = "div",
  className,
}: {
  section: Section;
  as?: "h2" | "p" | "div";
  className?: string;
}) {
  const { t } = useLanguage();
  return <Tag className={className}>{t.home[section]}</Tag>;
}
