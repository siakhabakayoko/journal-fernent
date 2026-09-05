"use client";

import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="mt-auto border-t-4 border-fernent-red bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-8 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="font-serif text-2xl font-bold text-fernent-red">Ferñent</p>
          <p className="mt-2 text-sm text-neutral-300 max-w-md leading-relaxed">
            {t.motto}
          </p>
        </div>
        <div className="sm:text-right space-y-2 text-sm">
          <p>
            <a
              className="text-white underline decoration-fernent-red underline-offset-4 hover:text-fernent-red"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>
            <Link href="/contact" className="hover:text-fernent-red">
              {t.footer.contact}
            </Link>
            {" · "}
            <Link href="/admin" className="hover:text-fernent-red">
              {t.nav.admin}
            </Link>
          </p>
          <p className="text-neutral-500">{t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
