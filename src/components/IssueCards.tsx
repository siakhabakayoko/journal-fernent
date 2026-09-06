"use client";

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

export function IssueCards({ issues }: { issues: MonthlyIssue[] }) {
  const { t } = useLanguage();

  if (issues.length === 0) {
    return <p className="text-sm text-muted italic">{t.archives.noIssues}</p>;
  }

  return (
    <ul className="space-y-4">
      {issues.map((iss) => {
        const hasPdf = Boolean(iss.pdfUrl && iss.pdfUrl !== "#");
        const pdfName =
          iss.pdfUrl?.split("/").pop()?.split("?")[0] || "fernent.pdf";
        return (
          <li
            key={iss.id}
            className="border border-rule bg-paper-elevated p-4 sm:p-5"
          >
            <p className="kicker mb-1">
              {MONTHS_FR[iss.month] || iss.month} {iss.year}
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">{iss.title}</h3>
            {iss.description && (
              <p className="mt-1 text-sm text-muted leading-relaxed">
                {iss.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {hasPdf ? (
                <>
                  <a
                    href={iss.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-fernent-red px-3 py-2 text-xs font-bold uppercase tracking-wider text-fernent-red hover:bg-fernent-red hover:text-white transition-colors"
                  >
                    {t.archives.consultPdf}
                  </a>
                  <a
                    href={iss.pdfUrl}
                    download={pdfName}
                    className="inline-flex items-center gap-2 bg-fernent-red px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-fernent-red-deep transition-colors"
                  >
                    {t.archives.downloadPdf} ↓
                  </a>
                </>
              ) : (
                <span className="inline-flex items-center gap-2 border border-rule-strong px-3 py-2 text-xs font-semibold text-muted">
                  {t.archives.pdfComingSoon}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
