"use client";

import type { SVGProps } from "react";
import Image from "next/image";
import { CONTACT_EMAIL } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const PRINCIPLE_ICONS = [
  // Mouvement ouvrier et populaire — raised fist / workers
  (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M15 11V6.5a1.5 1.5 0 0 1 3 0V14a5 5 0 0 1-5 5h-1.5a5.5 5.5 0 0 1-5.3-4.1L5 11.5a1.5 1.5 0 0 1 2.7-1.3L9 13" />
      <path d="M6 11V9.5a1.5 1.5 0 0 1 3 0V11" />
    </svg>
  ),
  // Libération nationale — broken chain
  (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M8.5 14.5 6 17a3.5 3.5 0 0 1-5-5l2.5-2.5" />
      <path d="M15.5 9.5 18 7a3.5 3.5 0 0 1 5 5l-2.5 2.5" />
      <path d="M9 11.5 7.5 13" />
      <path d="M16.5 11 15 12.5" />
      <path d="M11 9.5 10 8" />
      <path d="M14 14.5 13 13" />
    </svg>
  ),
  // Émancipation des femmes — women / solidarity (Venus-inspired group)
  (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="9" cy="7" r="2.25" />
      <circle cx="15.5" cy="7.5" r="2" />
      <path d="M9 9.25v5.5" />
      <path d="M6.5 12.5h5" />
      <path d="M9 14.75 6.75 19" />
      <path d="M9 14.75 11.25 19" />
      <path d="M15.5 9.5v4.25" />
      <path d="M13.5 12.25h4" />
      <path d="M15.5 13.75 13.75 17.5" />
      <path d="M15.5 13.75 17.25 17.5" />
    </svg>
  ),
  // Solidarité internationaliste — globe + handshake motif
  (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
      <path d="M7.5 14.5c1 .8 2.2 1.3 3.5 1.3s2.5-.5 3.5-1.3" />
      <path d="M8 16.5h8" />
    </svg>
  ),
] as const;

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
          {h.principles.map((card, index) => {
            const Icon = PRINCIPLE_ICONS[index] ?? PRINCIPLE_ICONS[0];
            return (
              <li
                key={card.title}
                className="border border-rule bg-paper p-4 sm:p-5"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-fernent-red/25 bg-fernent-red/5 text-fernent-red">
                  <Icon className="h-7 w-7" />
                </div>
                <p className="font-serif font-bold text-ink">{card.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/85">
                  {card.body}
                </p>
              </li>
            );
          })}
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
