"use client";

import Image from "next/image";
import type { MonthlyIssue } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const MONTHS_FR = [
  "",
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function ArchivesIssues({ issues }: { issues: MonthlyIssue[] }) {
  const { t } = useLanguage();

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-bold tracking-tight mb-4">
        {t.archives.monthlyIssues}
      </h2>
      {issues.length === 0 ? (
        <p className="text-sm text-muted italic">{t.archives.noIssues}</p>
      ) : (
        <ul className="space-y-4">
          {issues.map((iss) => {
            const hasPdf = Boolean(iss.pdfUrl && iss.pdfUrl !== "#");
            return (
              <li
                key={iss.id}
                className="border border-rule bg-paper-elevated p-4 sm:p-5 flex flex-col sm:flex-row gap-4"
              >
                {iss.coverImage && (
                  <div className="relative h-28 w-full sm:w-40 shrink-0 overflow-hidden border border-rule bg-rule">
                    <Image
                      src={iss.coverImage}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="160px"
                      unoptimized={iss.coverImage.endsWith(".svg")}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="kicker mb-1">
                    {MONTHS_FR[iss.month] || iss.month} {iss.year}
                  </p>
                  <h3 className="font-serif text-lg font-bold text-ink">
                    {iss.title}
                  </h3>
                  {iss.description && (
                    <p className="mt-1 text-sm text-muted leading-relaxed">
                      {iss.description}
                    </p>
                  )}
                  <div className="mt-3">
                    {hasPdf ? (
                      <a
                        href={iss.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-fernent-red px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-fernent-red-deep transition-colors"
                      >
                        {t.archives.downloadPdf} ↓
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 border border-rule-strong px-3 py-2 text-xs font-semibold text-muted">
                        {t.archives.pdfComingSoon}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
