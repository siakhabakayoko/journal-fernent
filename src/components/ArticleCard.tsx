"use client";

import Link from "next/link";
import type { Article } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function formatDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale === "wo" ? "fr-SN" : "fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ArticleCard({
  article,
  featured = false,
}: {
  article: Article;
  featured?: boolean;
}) {
  const { t, locale } = useLanguage();
  const rubricLabel = t.nav[article.rubric];

  return (
    <article
      className={`group border border-neutral-200 bg-white ${featured ? "p-5 sm:p-6" : "p-4"}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fernent-red">
        <Link href={`/rubrique/${article.rubric}`} className="hover:underline">
          {rubricLabel}
        </Link>
        <span className="text-neutral-400">·</span>
        <time dateTime={article.publishedAt} className="text-neutral-500 normal-case tracking-normal font-normal">
          {formatDate(article.publishedAt, locale)}
        </time>
      </div>
      <h2
        className={`mt-2 font-serif font-bold text-black leading-snug group-hover:text-fernent-red transition-colors ${featured ? "text-2xl sm:text-3xl" : "text-xl"}`}
      >
        <Link href={`/article/${article.slug}`}>{article.title}</Link>
      </h2>
      <p className={`mt-2 text-neutral-700 leading-relaxed ${featured ? "text-base sm:text-lg" : "text-sm sm:text-base"}`}>
        {article.excerpt}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-neutral-500">
          {t.home.by} {article.author}
        </span>
        <Link
          href={`/article/${article.slug}`}
          className="font-semibold text-fernent-red hover:underline"
        >
          {t.home.readMore} →
        </Link>
      </div>
    </article>
  );
}
