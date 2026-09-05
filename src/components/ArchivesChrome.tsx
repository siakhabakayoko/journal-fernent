"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function ArchivesChrome() {
  const { t } = useLanguage();
  return (
    <header className="pb-2">
      <p className="kicker mb-2">Catalogue</p>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
        {t.archives.title}
      </h1>
      <div className="mt-3 h-[3px] w-16 bg-fernent-red" aria-hidden />
      <p className="mt-4 text-muted leading-relaxed">{t.archives.intro}</p>
      <p className="mt-2 text-sm text-muted/80 italic">{t.archives.placeholder}</p>
    </header>
  );
}
