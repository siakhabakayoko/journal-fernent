"use client";

import type { Rubric } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function RubricTitle({ slug }: { slug: Rubric }) {
  const { t } = useLanguage();
  return (
    <h1 className="font-serif text-3xl sm:text-4xl font-bold border-b-4 border-fernent-red pb-3 inline-block">
      {t.nav[slug]}
    </h1>
  );
}
