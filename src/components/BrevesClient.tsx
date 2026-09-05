"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { ContentTabs } from "@/components/ContentTabs";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { isPublicRubric, PUBLIC_RUBRICS, type Article } from "@/lib/types";

export function BrevesClient({ articles }: { articles: Article[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramR = searchParams.get("r");
  const current = paramR && isPublicRubric(paramR) ? paramR : null;

  const tabs = useMemo(
    () =>
      PUBLIC_RUBRICS.map((slug) => ({
        id: slug,
        label: t.nav[slug],
      })),
    [t],
  );

  const onChange = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      // Toggle: clicking the active tab clears the filter back to all.
      if (current === id) params.delete("r");
      else params.set("r", id);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [current, pathname, router, searchParams],
  );

  const filtered = useMemo(() => {
    if (!current) return articles;
    return articles.filter((a) => a.rubric === current);
  }, [articles, current]);

  return (
    <>
      <ContentTabs
        tabs={tabs}
        activeId={current}
        onChange={onChange}
        ariaLabel="Rubriques"
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {filtered.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
        {filtered.length === 0 && (
          <p className="text-muted col-span-full">{t.breves.empty}</p>
        )}
      </div>
    </>
  );
}
