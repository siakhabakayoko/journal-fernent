"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { ContentTabs } from "@/components/ContentTabs";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { isRubric, PUBLIC_RUBRICS, type Article } from "@/lib/types";

const ALL = "tout";

export function BrevesClient({ articles }: { articles: Article[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramR = searchParams.get("r");
  const current = paramR && isRubric(paramR) ? paramR : ALL;

  const tabs = useMemo(
    () => [
      { id: ALL, label: t.tabs.all },
      ...PUBLIC_RUBRICS.map((slug) => ({
        id: slug,
        label: t.nav[slug],
      })),
    ],
    [t],
  );

  const onChange = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === ALL) params.delete("r");
      else params.set("r", id);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const filtered = useMemo(() => {
    if (current === ALL) return articles;
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
