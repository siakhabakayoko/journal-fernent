import type { Metadata } from "next";
import { Suspense } from "react";
import { BrevesChrome } from "@/components/BrevesChrome";
import { BrevesClient } from "@/components/BrevesClient";
import { getArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brèves",
  description: "Articles et analyses — Journal Ferñent",
};

export default async function BrevesPage() {
  const articles = await getArticles();
  const sorted = [...articles]
    .filter((a) => a.rubric !== "notre-journal")
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-8 sm:py-10">
      <BrevesChrome />
      <Suspense fallback={<p className="mt-8 text-muted">…</p>}>
        <BrevesClient articles={sorted} />
      </Suspense>
    </div>
  );
}
