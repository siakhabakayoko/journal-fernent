"use client";

import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { ArticleListenButton } from "@/components/ArticleListenButton";

export function ArticleChrome({ article }: { article: Article }) {
  const { t, locale } = useLanguage();
  const date = new Intl.DateTimeFormat(locale === "wo" ? "fr-SN" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(article.publishedAt));
  const cover = article.coverImage?.trim();

  return (
    <header className="border-b border-rule pb-6">
      {cover && (
        <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden border border-rule bg-rule">
          <Image
            src={cover}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
            unoptimized={
              cover.endsWith(".svg") ||
              cover.includes("pollinations.ai") ||
              cover.includes("blob.vercel-storage.com")
            }
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link
          href={`/breves?r=${article.rubric}`}
          className="kicker hover:underline"
        >
          {t.nav[article.rubric]}
        </Link>
        <span className="text-rule-strong">·</span>
        <time
          dateTime={article.publishedAt}
          className="text-ink font-bold"
        >
          {date}
        </time>
      </div>
      <h1 className="mt-4 font-serif text-3xl sm:text-[2.75rem] font-bold leading-[1.15] tracking-tight text-ink">
        {article.title}
      </h1>
      <p className="mt-5 text-lg sm:text-xl text-muted leading-relaxed border-l-[3px] border-fernent-red pl-4">
        {article.excerpt}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-ink font-bold">
          <span className="font-bold">{t.home.by} </span>
          {article.author}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted uppercase tracking-wider">
          <ArticleListenButton
            title={article.title}
            excerpt={article.excerpt}
            body={article.body}
            audioUrl={article.audioUrl}
          />
          <span>Ferñent</span>
          <span className="text-rule-strong">·</span>
          <span>Lecture</span>
        </div>
      </div>
    </header>
  );
}
