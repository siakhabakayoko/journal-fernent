"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function ContactChrome({ email }: { email: string }) {
  const { t } = useLanguage();
  return (
    <>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold border-b-4 border-fernent-red pb-3 inline-block">
        {t.contact.title}
      </h1>
      <p className="mt-4 text-neutral-700 leading-relaxed">{t.contact.intro}</p>
      <div className="mt-8 border border-neutral-200 bg-neutral-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-fernent-red">
          {t.contact.email}
        </p>
        <a
          href={`mailto:${email}`}
          className="mt-2 inline-block text-xl font-semibold text-black hover:text-fernent-red break-all"
        >
          {email}
        </a>
        <p className="mt-4">
          <a
            href={`mailto:${email}?subject=Fer%C3%B1ent`}
            className="inline-block bg-fernent-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            {t.contact.writeUs}
          </a>
        </p>
      </div>
    </>
  );
}
