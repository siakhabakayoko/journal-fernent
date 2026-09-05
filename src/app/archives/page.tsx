import type { Metadata } from "next";
import Link from "next/link";
import { getArticles } from "@/lib/articles";
import { ArchivesChrome } from "@/components/ArchivesChrome";

export const metadata: Metadata = {
  title: "Archives",
  description: "Archives chronologiques — Journal Ferñent",
};

export default async function ArchivesPage() {
  const articles = [...(await getArticles())].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-10">
      <ArchivesChrome />
      <ol className="mt-8 divide-y divide-rule border border-rule bg-paper-elevated">
        {articles.map((a) => (
          <li
            key={a.id}
            className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-5 hover:bg-fernent-red/[0.03] transition-colors"
          >
            <time
              dateTime={a.publishedAt}
              className="text-[0.7rem] uppercase tracking-wider text-muted shrink-0 w-28"
            >
              {a.publishedAt}
            </time>
            <Link
              href={`/article/${a.slug}`}
              className="font-serif font-bold text-ink hover:text-fernent-red transition-colors"
            >
              {a.title}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
