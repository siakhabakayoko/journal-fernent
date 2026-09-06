"use client";

import { NotreHistoire } from "@/components/NotreHistoire";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function QuiSommesNousChrome({
  section,
}: {
  section?: "histoire";
} = {}) {
  const { t } = useLanguage();

  if (section === "histoire") {
    return <NotreHistoire />;
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
