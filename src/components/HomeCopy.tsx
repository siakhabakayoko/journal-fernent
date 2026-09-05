"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Section = "aLaUne" | "recent" | "ourGoal" | "ourGoalText";

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
