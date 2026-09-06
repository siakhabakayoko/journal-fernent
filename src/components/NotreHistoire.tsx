"use client";

import Image from "next/image";
import { CONTACT_EMAIL } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function NotreHistoire({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const h = t.histoire;

  return (
    <div id="notre-histoire" className={`scroll-mt-28 space-y-10 ${className}`}>
      <header>
        <p className="kicker text-fernent-red mb-2">{h.kicker}</p>
        <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-ink">
          {h.title}
        </h3>
        <p className="mt-2 text-sm sm:text-base text-muted leading-relaxed">
          {h.subtitle}
        </p>
      </header>

      <section aria-labelledby="histoire-mission">
        <h4
          id="histoire-mission"
          className="font-serif text-lg font-bold tracking-tight text-ink"
        >
          {h.missionTitle}
        </h4>
        <div className="mt-4 space-y-4 text-[0.95rem] sm:text-base leading-relaxed text-ink/90">
          {h.missionParagraphs.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
          <p className="italic text-ink/80 border-l-2 border-fernent-red/40 pl-4">
            {h.motto}
          </p>
        </div>
      </section>

      <section aria-labelledby="histoire-principes">
        <h4
          id="histoire-principes"
          className="font-serif text-lg font-bold tracking-tight text-ink"
        >
          {h.principlesTitle}
        </h4>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {h.principles.map((card) => (
            <li
              key={card.title}
              className="border border-rule bg-paper p-4 sm:p-5"
            >
              <p className="font-serif font-bold text-ink">{card.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/85">
                {card.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="histoire-cofondateurs">
        <h4
          id="histoire-cofondateurs"
          className="font-serif text-lg font-bold tracking-tight text-ink"
        >
          {h.cofoundersTitle}
        </h4>
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-ink/90">
          {h.cofoundersIntro}
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <figure className="space-y-3">
            <div className="relative aspect-[4/5] overflow-hidden border border-rule bg-paper-elevated">
              <Image
                src="/about/assane-samb.jpg"
                alt={h.assaneName}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 320px"
              />
            </div>
            <figcaption>
              <p className="font-serif font-bold text-ink">{h.assaneName}</p>
              <p className="text-sm text-muted">{h.cofounderRole}</p>
            </figcaption>
          </figure>
          <figure className="space-y-3">
            <div className="relative aspect-[4/5] overflow-hidden border border-rule bg-paper-elevated">
              <Image
                src="/about/birane-gaye.jpg"
                alt={h.biraneName}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 320px"
              />
            </div>
            <figcaption>
              <p className="font-serif font-bold text-ink">{h.biraneName}</p>
              <p className="text-sm text-muted">{h.cofounderRole}</p>
            </figcaption>
          </figure>
        </div>
        <figure className="mt-6 space-y-3">
          <div className="relative aspect-[4/5] sm:aspect-[3/4] max-w-md mx-auto overflow-hidden border border-rule bg-paper-elevated">
            <Image
              src="/about/cofondateurs-2.jpg"
              alt={h.cofoundersPosterAlt}
              fill
              className="object-contain bg-[#f5e84a]"
              sizes="(max-width: 640px) 100vw, 448px"
            />
          </div>
          <figcaption className="text-center text-sm text-muted">
            {h.cofoundersPosterCaption}
          </figcaption>
        </figure>
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-ink/90">
          {h.cofoundersLegacy}
        </p>
      </section>

      <section aria-labelledby="histoire-equipe">
        <h4
          id="histoire-equipe"
          className="font-serif text-lg font-bold tracking-tight text-ink"
        >
          {h.teamTitle}
        </h4>
        <div className="mt-4 border border-rule bg-paper-elevated p-4 sm:p-5">
          <p className="kicker text-fernent-red mb-1">{h.dfrInitials}</p>
          <p className="font-serif text-lg font-bold text-ink">{h.dfrName}</p>
          <p className="text-sm text-muted">{h.dfrRole}</p>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-ink/90">
            {h.dfrBio}
          </p>
        </div>
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-ink/90">
          {h.heritage}
        </p>
      </section>

      <p className="text-sm sm:text-base leading-relaxed text-ink/90">
        {h.contactLabel}{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-fernent-red underline decoration-fernent-red/40 underline-offset-2 hover:decoration-fernent-red"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}
