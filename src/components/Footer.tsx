"use client";

import Link from "next/link";
import { CONTACT_EMAIL, RUBRICS } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Logo } from "./Logo";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t-[3px] border-fernent-red bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-10 sm:py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo onDark className="h-9 sm:h-10 w-auto max-w-[14rem]" />
            <p className="mt-4 text-sm text-white/65 leading-relaxed max-w-xs italic">
              « {t.motto} »
            </p>
          </div>

          <div>
            <p className="kicker !text-fernent-red mb-3">Rubriques</p>
            <ul className="space-y-2 text-sm">
              {RUBRICS.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={r.href}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    {t.nav[r.slug]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="kicker !text-fernent-red mb-3">Explorer</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/breves" className="text-white/80 hover:text-white transition-colors">
                  {t.nav.breves}
                </Link>
              </li>
              <li>
                <Link href="/mensuel" className="text-white/80 hover:text-white transition-colors">
                  {t.nav.mensuel}
                </Link>
              </li>
              <li>
                <Link href="/capsules" className="text-white/80 hover:text-white transition-colors">
                  {t.nav.capsules}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-white/80 hover:text-white transition-colors">
                  {t.footer.contact}
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-white/80 hover:text-white transition-colors">
                  {t.nav.admin}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="kicker !text-fernent-red mb-3">{t.footer.contact}</p>
            <a
              className="text-sm text-white underline decoration-fernent-red underline-offset-4 hover:text-fernent-red break-all transition-colors"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
            <p className="mt-4 text-xs text-white/40 leading-relaxed">
              Mentions légales · Politique de confidentialité
              <span className="block mt-1">(placeholders)</span>
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-white/45">
          <p>{t.footer.rights}</p>
          <p>© {new Date().getFullYear()} Journal Ferñent</p>
        </div>
      </div>
    </footer>
  );
}
