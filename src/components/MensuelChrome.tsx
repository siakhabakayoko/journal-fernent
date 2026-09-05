"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function MensuelChrome() {
  const { t } = useLanguage();
  return (
    <header className="pb-2">
      <p className="kicker mb-2">PDF</p>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
        {t.mensuel.title}
      </h1>
      <div className="mt-3 h-[3px] w-16 bg-fernent-red" aria-hidden />
      <p className="mt-4 text-muted leading-relaxed">{t.mensuel.intro}</p>
    </header>
  );
}
