"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function VideosChrome() {
  const { t } = useLanguage();
  return (
    <header>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold border-b-4 border-fernent-red pb-3 inline-block">
        {t.videos.title}
      </h1>
      <p className="mt-3 text-neutral-700 max-w-2xl">{t.videos.intro}</p>
    </header>
  );
}
