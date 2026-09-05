"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function ArchivesChrome() {
  const { t } = useLanguage();
  return (
    <header>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold border-b-4 border-fernent-red pb-3 inline-block">
        {t.archives.title}
      </h1>
      <p className="mt-3 text-neutral-700">{t.archives.intro}</p>
      <p className="mt-2 text-sm text-neutral-500 italic">{t.archives.placeholder}</p>
    </header>
  );
}
