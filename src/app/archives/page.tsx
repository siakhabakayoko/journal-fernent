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
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-8">
      <ArchivesChrome />
      <ol className="mt-8 divide-y divide-neutral-200 border border-neutral-200 bg-white">
        {articles.map((a) => (
          <li key={a.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <time dateTime={a.publishedAt} className="text-xs text-neutral-500 shrink-0 w-28">
              {a.publishedAt}
            </time>
            <Link href={`/article/${a.slug}`} className="font-serif font-semibold hover:text-fernent-red">
              {a.title}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
