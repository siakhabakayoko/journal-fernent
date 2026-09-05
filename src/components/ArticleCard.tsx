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
  variant = "default",
}: {
  article: Article;
  featured?: boolean;
  variant?: "default" | "compact" | "hero";
}) {
  const { t, locale } = useLanguage();
  const rubricLabel = t.nav[article.rubric];

  if (variant === "hero" || featured) {
    return (
      <article className="group grid gap-0 lg:grid-cols-2 border border-rule bg-paper-elevated overflow-hidden card-lift">
        <div className="editorial-panel min-h-[220px] sm:min-h-[280px] lg:min-h-full flex items-end p-6 sm:p-8">
          <div className="relative z-10">
            <span className="kicker !text-white/90">{rubricLabel}</span>
            <p className="mt-3 font-serif text-2xl sm:text-3xl font-bold text-white leading-tight max-w-md">
              {article.title}
            </p>
          </div>
        </div>
        <div className="p-5 sm:p-7 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href={`/rubrique/${article.rubric}`}
              className="kicker hover:underline"
            >
              {rubricLabel}
            </Link>
            <span className="text-rule-strong">·</span>
            <time
              dateTime={article.publishedAt}
              className="text-muted font-normal"
            >
              {formatDate(article.publishedAt, locale)}
            </time>
          </div>
          <h2 className="mt-3 font-serif text-2xl sm:text-[1.85rem] font-bold text-ink leading-snug group-hover:text-fernent-red transition-colors">
            <Link href={`/article/${article.slug}`}>{article.title}</Link>
          </h2>
          <p className="mt-3 text-base text-muted leading-relaxed line-clamp-4">
            {article.excerpt}
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">
              {t.home.by} {article.author}
            </span>
            <Link
              href={`/article/${article.slug}`}
              className="font-bold text-fernent-red hover:underline underline-offset-4"
            >
              {t.home.readMore} →
            </Link>
          </div>
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="group border-b border-rule py-3.5 last:border-b-0">
        <div className="flex items-center gap-2 text-[0.65rem]">
          <Link
            href={`/rubrique/${article.rubric}`}
            className="kicker hover:underline"
          >
            {rubricLabel}
          </Link>
          <span className="text-rule-strong">·</span>
          <time dateTime={article.publishedAt} className="text-muted">
            {formatDate(article.publishedAt, locale)}
          </time>
        </div>
        <h3 className="mt-1.5 font-serif text-base sm:text-lg font-bold leading-snug text-ink group-hover:text-fernent-red transition-colors">
          <Link href={`/article/${article.slug}`}>{article.title}</Link>
        </h3>
      </article>
    );
  }

  return (
    <article className="group border border-rule bg-paper-elevated p-4 sm:p-5 card-lift h-full flex flex-col">
      <div className="flex items-center gap-2 text-xs">
        <Link
          href={`/rubrique/${article.rubric}`}
          className="kicker hover:underline"
        >
          {rubricLabel}
        </Link>
        <span className="text-rule-strong">·</span>
        <time
          dateTime={article.publishedAt}
          className="text-muted font-normal normal-case tracking-normal"
        >
          {formatDate(article.publishedAt, locale)}
        </time>
      </div>
      <h2 className="mt-2.5 font-serif text-xl font-bold text-ink leading-snug group-hover:text-fernent-red transition-colors">
        <Link href={`/article/${article.slug}`}>{article.title}</Link>
      </h2>
      <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-3 flex-1">
        {article.excerpt}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm border-t border-rule pt-3">
        <span className="text-muted text-xs">
          {t.home.by} {article.author}
        </span>
        <Link
          href={`/article/${article.slug}`}
          className="font-bold text-fernent-red hover:underline underline-offset-4 text-xs uppercase tracking-wider"
        >
          {t.home.readMore} →
        </Link>
      </div>
    </article>
  );
}
