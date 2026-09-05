"use client";

import type { Rubric } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function RubricTitle({ slug }: { slug: Rubric }) {
  const { t } = useLanguage();
  return (
    <header>
      <p className="kicker mb-2">Rubrique</p>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
        {t.nav[slug]}
      </h1>
      <div className="mt-3 h-[3px] w-16 bg-fernent-red" aria-hidden />
    </header>
  );
}
