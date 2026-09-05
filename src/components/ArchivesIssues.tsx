"use client";

import type { MonthlyIssue } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { IssueCards } from "@/components/IssueCards";

export function ArchivesIssues({ issues }: { issues: MonthlyIssue[] }) {
  const { t } = useLanguage();

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-bold tracking-tight mb-4">
        {t.archives.monthlyIssues}
      </h2>
      <IssueCards issues={issues} />
    </section>
  );
}
