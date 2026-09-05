import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getArticles } from "@/lib/articles";
import { getIssues } from "@/lib/issues";
import { ArchivesChrome } from "@/components/ArchivesChrome";
import { ArchivesIssues } from "@/components/ArchivesIssues";

export const metadata: Metadata = {
  title: "Archives",
  description: "Numéros mensuels et archives chronologiques — Journal Ferñent",
};

export default async function ArchivesPage() {
  const [articles, issues] = await Promise.all([getArticles(), getIssues()]);
  const sortedArticles = [...articles].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  const sortedIssues = [...issues].sort(
    (a, b) => b.year - a.year || b.month - a.month,
  );

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-10">
      <ArchivesChrome />

      <ArchivesIssues issues={sortedIssues} />

      <section className="mt-12">
        <h2 className="font-serif text-xl font-bold tracking-tight mb-4">
          Catalogue des articles
        </h2>
        <ol className="divide-y divide-rule border border-rule bg-paper-elevated">
          {sortedArticles.map((a) => (
            <li
              key={a.id}
              className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-fernent-red/[0.03] transition-colors"
            >
              {a.coverImage && (
                <div className="relative h-12 w-20 shrink-0 overflow-hidden border border-rule bg-rule">
                  <Image
                    src={a.coverImage}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized={a.coverImage.endsWith(".svg")}
                  />
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-5 flex-1 min-w-0">
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
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
