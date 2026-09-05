import type { Metadata } from "next";
import { ArchivesIssues } from "@/components/ArchivesIssues";
import { MensuelChrome } from "@/components/MensuelChrome";
import { getIssues } from "@/lib/issues";

export const metadata: Metadata = {
  title: "Mensuel",
  description: "Numéros mensuels en PDF — Journal Ferñent",
};

export default async function MensuelPage() {
  const issues = await getIssues();
  const sortedIssues = [...issues].sort(
    (a, b) => b.year - a.year || b.month - a.month,
  );

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-10">
      <MensuelChrome />
      <ArchivesIssues issues={sortedIssues} />
    </div>
  );
}
