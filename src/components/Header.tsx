"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { RUBRICS } from "@/lib/types";

export function Header() {
  const { t, locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);

  const rubricLinks = RUBRICS.map((r) => ({
    href: r.href,
    label: t.nav[r.slug],
  }));

  const extra = [
    { href: "/videos", label: t.nav.videos },
    { href: "/archives", label: t.nav.archives },
    { href: "/contact", label: t.nav.contact },
  ];

  return (
    <header className="border-b-4 border-fernent-red bg-white sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        <div className="flex items-center justify-between gap-3 py-3">
          <Link href="/" className="flex items-center gap-2 min-w-0" onClick={() => setOpen(false)}>
            <Logo className="h-10 w-10 shrink-0" />
            <div className="min-w-0">
              <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-black leading-none">
                Ferñent
              </div>
              <div className="text-[10px] sm:text-xs text-neutral-600 truncate max-w-[14rem] sm:max-w-none">
                {t.siteName}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div
              className="inline-flex rounded border border-neutral-300 text-xs font-semibold overflow-hidden"
              role="group"
              aria-label={t.lang.label}
            >
              <button
                type="button"
                className={`px-2 py-1 ${locale === "fr" ? "bg-fernent-red text-white" : "bg-white text-black hover:bg-neutral-50"}`}
                onClick={() => setLocale("fr")}
              >
                {t.lang.fr}
              </button>
              <button
                type="button"
                className={`px-2 py-1 border-l border-neutral-300 ${locale === "wo" ? "bg-fernent-red text-white" : "bg-white text-black hover:bg-neutral-50"}`}
                onClick={() => setLocale("wo")}
              >
                {t.lang.wo}
              </button>
            </div>

            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded border border-neutral-300 px-2.5 py-1.5 text-sm font-semibold"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              Menu
            </button>
          </div>
        </div>

        {/* Desktop: ALL rubrics visible as one-click links */}
        <nav
          className="hidden md:flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-neutral-200 py-2 text-sm font-semibold uppercase tracking-wide"
          aria-label="Rubriques"
        >
          {rubricLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-2.5 py-1.5 text-black hover:bg-fernent-red hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <span className="mx-1 h-4 w-px bg-neutral-300" aria-hidden />
          {extra.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-2.5 py-1.5 text-neutral-700 hover:bg-fernent-red hover:text-white transition-colors normal-case tracking-normal"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile drawer — complements, does not replace desktop nav */}
        {open && (
          <nav
            id="mobile-nav"
            className="md:hidden border-t border-neutral-200 py-2 pb-3 flex flex-col gap-1"
          >
            {[...rubricLinks, ...extra].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-2 py-2.5 text-sm font-semibold uppercase tracking-wide hover:bg-fernent-red hover:text-white"
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
