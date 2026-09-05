"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function BrevesChrome() {
  const { t } = useLanguage();
  return (
    <header className="pb-2">
      <p className="kicker mb-2">Articles</p>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
        {t.breves.title}
      </h1>
      <div className="mt-3 h-[3px] w-16 bg-fernent-red" aria-hidden />
      <p className="mt-4 text-muted max-w-2xl leading-relaxed">{t.breves.intro}</p>
    </header>
  );
}
