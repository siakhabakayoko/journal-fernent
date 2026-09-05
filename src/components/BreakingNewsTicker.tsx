"use client";

import Link from "next/link";
import type { Article } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function BreakingNewsTicker({ articles }: { articles: Article[] }) {
  const { t } = useLanguage();
  if (!articles.length) return null;

  const items = articles.slice(0, 8);
  const loop = [...items, ...items];

  return (
    <div
      className="border-y border-ink bg-ink text-paper"
      role="region"
      aria-label="À la une — fil d'actualité"
    >
      <div className="mx-auto max-w-6xl flex items-stretch">
        <div className="shrink-0 bg-fernent-red px-3 sm:px-4 py-2 flex items-center">
          <span className="kicker !text-white !tracking-[0.16em] text-[0.65rem] sm:text-[0.7rem]">
            {t.home.aLaUne}
          </span>
        </div>
        <div className="relative flex-1 overflow-hidden py-2">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-ink to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-ink to-transparent z-10" />
          <div className="ticker-track gap-10 px-4">
            {loop.map((a, i) => (
              <Link
                key={`${a.id}-${i}`}
                href={`/article/${a.slug}`}
                className="inline-flex items-center gap-3 whitespace-nowrap text-sm text-paper/90 hover:text-white transition-colors"
              >
                <span className="h-1 w-1 rounded-full bg-fernent-red shrink-0" aria-hidden />
                <span className="font-medium tracking-wide">{a.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
