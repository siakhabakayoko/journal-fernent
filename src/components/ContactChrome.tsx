"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { ContactForm } from "@/components/ContactForm";

export function ContactChrome({ email }: { email: string }) {
  const { t } = useLanguage();
  return (
    <>
      <p className="kicker mb-2">Rédaction</p>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
        {t.contact.title}
      </h1>
      <div className="mt-3 h-[3px] w-16 bg-fernent-red" aria-hidden />
      <p className="mt-5 text-muted leading-relaxed max-w-xl">{t.contact.intro}</p>

      <div className="mt-8">
        <ContactForm />
      </div>

      <div className="mt-8 border border-rule bg-paper-elevated p-6 sm:p-8 card-lift">
        <p className="kicker">{t.contact.emailSecondary}</p>
        <a
          href={`mailto:${email}`}
          className="mt-3 inline-block font-serif text-xl sm:text-2xl font-bold text-ink hover:text-fernent-red break-all transition-colors"
        >
          {email}
        </a>
        <p className="mt-3 text-sm text-muted">{t.contact.orEmail}</p>
        <p className="mt-6">
          <a
            href={`mailto:${email}?subject=Fer%C3%B1ent`}
            className="inline-block border border-rule-strong px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-ink hover:bg-rule active:scale-[0.98] transition-all"
          >
            {t.contact.writeUs}
          </a>
        </p>
      </div>
    </>
  );
}
