"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function MastheadDate() {
  const { locale } = useLanguage();
  const [label, setLabel] = useState("");

  useEffect(() => {
    const d = new Date();
    setLabel(
      new Intl.DateTimeFormat(locale === "wo" ? "fr-SN" : "fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d),
    );
  }, [locale]);

  return (
    <time className="text-[0.7rem] sm:text-xs uppercase tracking-[0.12em] text-muted capitalize">
      {label || "\u00a0"}
    </time>
  );
}

function MastheadPortrait({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <div className="relative shrink-0 h-14 w-14 sm:h-20 sm:w-20">
      <Image
        src={src}
        alt={alt}
        width={160}
        height={160}
        className="h-14 w-14 sm:h-20 sm:w-20 object-contain drop-shadow-sm"
        sizes="(max-width: 640px) 56px, 80px"
        priority
      />
    </div>
  );
}

export function Header() {
  const { t, locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);

  const primary = [
    { href: "/breves", label: t.nav.breves },
    { href: "/mensuel", label: t.nav.mensuel },
    { href: "/capsules", label: t.nav.capsules },
    { href: "/#qui-sommes-nous", label: t.nav.quiSommesNous },
  ];

  const secondary = [{ href: "/contact", label: t.nav.contact }];

  return (
    <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur-md border-b border-rule">
      {/* Thin prestige top band */}
      <div className="h-1 bg-fernent-red" aria-hidden />

      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        {/* Dateline + lang */}
        <div className="flex items-center justify-between gap-3 pt-2.5 pb-1">
          <div className="flex items-center gap-3 min-w-0">
            <MastheadDate />
            <span className="hidden sm:inline text-rule-strong" aria-hidden>
              |
            </span>
            <span className="hidden sm:inline text-[0.65rem] uppercase tracking-[0.18em] text-muted">
              Vol. I · Édition numérique
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="inline-flex rounded-sm border border-rule-strong text-[0.7rem] font-bold overflow-hidden tracking-wider"
              role="group"
              aria-label={t.lang.label}
            >
              <button
                type="button"
                className={`px-2.5 py-1 transition-colors ${locale === "fr" ? "bg-fernent-red text-white" : "bg-paper-elevated text-ink hover:bg-rule"}`}
                onClick={() => setLocale("fr")}
              >
                {t.lang.fr}
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 border-l border-rule-strong transition-colors ${locale === "wo" ? "bg-fernent-red text-white" : "bg-paper-elevated text-ink hover:bg-rule"}`}
                onClick={() => setLocale("wo")}
              >
                {t.lang.wo}
              </button>
            </div>

            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-sm border border-rule-strong px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              Menu
            </button>
          </div>
        </div>

        {/* Masthead lockup */}
        <div className="rule-double my-1">
          <div className="rule-double-inner" />
        </div>

        <div className="flex items-center justify-center gap-3 sm:gap-5 md:gap-6 px-1 sm:px-2 py-3 sm:py-4">
          <MastheadPortrait
            src="/about/masthead-assane.png"
            alt={t.histoire.assaneName}
          />
          <Link
            href="/"
            className="flex min-w-0 flex-1 flex-col items-center text-center group mx-1 sm:mx-2"
            onClick={() => setOpen(false)}
          >
            <Logo priority className="h-9 sm:h-14 w-auto max-w-[min(48vw,18rem)] sm:max-w-[min(70vw,28rem)]" />
            <p className="mt-2 max-w-xl text-[0.7rem] sm:text-xs text-muted italic leading-snug px-2">
              « {t.motto} »
            </p>
          </Link>
          <MastheadPortrait
            src="/about/masthead-birane.png"
            alt={t.histoire.biraneName}
          />
        </div>

        <div className="rule-double mb-0">
          <div className="rule-double-inner" />
        </div>

        {/* Desktop: content-type nav */}
        <nav
          className="hidden md:flex flex-wrap items-center justify-center gap-x-0.5 gap-y-1 py-2 text-[0.8rem] font-bold uppercase tracking-[0.08em]"
          aria-label="Navigation"
        >
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-2.5 py-1.5 text-ink hover:text-fernent-red hover:bg-fernent-red/5 transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <span className="mx-1.5 h-3.5 w-px bg-rule-strong" aria-hidden />
          {secondary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-2.5 py-1.5 text-muted hover:text-fernent-red hover:bg-fernent-red/5 transition-colors normal-case tracking-normal font-semibold"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile drawer */}
        {open && (
          <nav
            id="mobile-nav"
            className="md:hidden border-t border-rule py-2 pb-3 flex flex-col gap-0.5"
          >
            {[...primary, ...secondary].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-2 py-2.5 text-sm font-bold uppercase tracking-wide hover:bg-fernent-red hover:text-white transition-colors"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
