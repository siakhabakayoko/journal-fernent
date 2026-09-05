"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function QuiSommesNousChrome({
  section,
}: {
  section?: "histoire";
} = {}) {
  const { t } = useLanguage();

  if (section === "histoire") {
    return (
      <>
        <p className="kicker text-fernent-red mb-2">{t.home.notreHistoire}</p>
        <h2 className="font-serif text-xl font-bold tracking-tight">
          {t.home.notreHistoire}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted italic leading-relaxed">
          {t.home.notreHistoirePlaceholder}
        </p>
      </>
    );
  }

  return (
    <>
      <p className="kicker mb-2">{t.nav.home}</p>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
        {t.home.about}
      </h1>
      <p className="mt-3 text-muted leading-relaxed max-w-2xl">
        {t.home.notreJournal}
      </p>
    </>
  );
}
