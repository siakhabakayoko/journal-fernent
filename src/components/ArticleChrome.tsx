"use client";

import Link from "next/link";
import type { Article } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function ArticleChrome({ article }: { article: Article }) {
  const { t, locale } = useLanguage();
  const date = new Intl.DateTimeFormat(locale === "wo" ? "fr-SN" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(article.publishedAt));

  return (
    <header>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fernent-red">
        <Link href={`/rubrique/${article.rubric}`} className="hover:underline">
          {t.nav[article.rubric]}
        </Link>
        <span className="text-neutral-400">·</span>
        <time dateTime={article.publishedAt} className="text-neutral-500 normal-case tracking-normal font-normal">
          {date}
        </time>
      </div>
      <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-bold leading-tight text-black">
        {article.title}
      </h1>
      <p className="mt-4 text-lg text-neutral-700 leading-relaxed border-l-4 border-fernent-red pl-3">
        {article.excerpt}
      </p>
      <p className="mt-3 text-sm text-neutral-500">
        {t.home.by} {article.author}
      </p>
    </header>
  );
}
