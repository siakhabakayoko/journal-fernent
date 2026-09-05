"use client";

import Image from "next/image";
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

function Cover({
  src,
  alt,
  className,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className ?? "object-cover"}
      sizes={sizes ?? "(max-width: 768px) 100vw, 50vw"}
      priority={priority}
      unoptimized={src.endsWith(".svg")}
    />
  );
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
  const cover = article.coverImage?.trim();
  const isFeatured = variant === "hero" || featured;

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
    <article className="group border border-rule bg-paper-elevated overflow-hidden card-lift h-full flex flex-col">
      <Link
        href={`/article/${article.slug}`}
        className={`relative block overflow-hidden ${
          isFeatured
            ? "aspect-[16/9] sm:aspect-[21/9] min-h-[220px] sm:min-h-[280px]"
            : "aspect-[16/9]"
        } ${cover ? "bg-rule" : "editorial-panel"}`}
      >
        {cover && (
          <Cover
            src={cover}
            alt=""
            className="object-cover absolute inset-0"
            sizes={
              isFeatured
                ? "(max-width: 1024px) 100vw, 80vw"
                : "(max-width: 640px) 100vw, 33vw"
            }
            priority={isFeatured}
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
          <span className="kicker !text-white/90">{rubricLabel}</span>
          <h2
            className={`mt-2 font-serif font-bold text-white leading-snug ${
              isFeatured
                ? "text-2xl sm:text-3xl lg:text-[2rem] max-w-3xl"
                : "text-xl"
            }`}
          >
            {article.title}
          </h2>
        </div>
      </Link>

      <div
        className={`flex flex-col flex-1 ${
          isFeatured ? "p-5 sm:p-7" : "p-4 sm:p-5"
        }`}
      >
        <time
          dateTime={article.publishedAt}
          className="text-xs text-muted font-normal"
        >
          {formatDate(article.publishedAt, locale)}
        </time>
        <p
          className={`mt-2 text-muted leading-relaxed flex-1 ${
            isFeatured
              ? "text-base line-clamp-4"
              : "text-sm line-clamp-3"
          }`}
        >
          {article.excerpt}
        </p>
        <div
          className={`mt-4 flex items-center justify-between gap-3 ${
            isFeatured
              ? "text-sm"
              : "text-sm border-t border-rule pt-3"
          }`}
        >
          <span className={`text-muted ${isFeatured ? "" : "text-xs"}`}>
            {t.home.by} {article.author}
          </span>
          <Link
            href={`/article/${article.slug}`}
            className={`font-bold text-fernent-red hover:underline underline-offset-4 ${
              isFeatured ? "" : "text-xs uppercase tracking-wider"
            }`}
          >
            {t.home.readMore} →
          </Link>
        </div>
      </div>
    </article>
  );
}
