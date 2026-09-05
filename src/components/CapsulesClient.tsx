"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ContentTabs } from "@/components/ContentTabs";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { isPublicRubric, PUBLIC_RUBRICS, type Video } from "@/lib/types";

export function VideoCard({ v }: { v: Video }) {
  const isYoutube = Boolean(v.youtubeId);
  const isFile = Boolean(v.videoUrl) && !isYoutube;
  const isPlaceholder = !isYoutube && !isFile;

  return (
    <li className="border border-rule bg-paper-elevated overflow-hidden card-lift group list-none">
      <div className="aspect-video bg-ink/90 relative overflow-hidden">
        {isYoutube && v.youtubeId ? (
          <iframe
            title={v.title}
            src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : isFile && v.videoUrl ? (
          <video
            controls
            preload="metadata"
            poster={v.thumbnailUrl || undefined}
            className="absolute inset-0 h-full w-full object-contain bg-black"
            src={v.videoUrl}
          />
        ) : (
          <div className="editorial-panel absolute inset-0 flex items-center justify-center">
            <div className="relative z-10 flex flex-col items-center gap-2 text-white/90">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/10 text-lg backdrop-blur-sm group-hover:bg-fernent-red group-hover:border-fernent-red transition-colors">
                ▶
              </span>
              {v.duration ? (
                <span className="text-xs font-bold uppercase tracking-wider">
                  {v.duration}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <h2 className="font-serif text-lg font-bold leading-snug group-hover:text-fernent-red transition-colors">
          {v.title}
        </h2>
        <p className="mt-1.5 text-sm text-muted leading-relaxed">{v.description}</p>
        {isPlaceholder ? (
          <p className="mt-3 kicker">Placeholder</p>
        ) : v.duration ? (
          <p className="mt-3 text-xs text-muted">{v.duration}</p>
        ) : null}
      </div>
    </li>
  );
}

export function CapsulesClient({ videos }: { videos: Video[] }) {
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
      if (current === id) params.delete("r");
      else params.set("r", id);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [current, pathname, router, searchParams],
  );

  const filtered = useMemo(() => {
    if (!current) return videos;
    return videos.filter((v) => v.rubric === current);
  }, [videos, current]);

  return (
    <>
      <ContentTabs
        tabs={tabs}
        activeId={current}
        onChange={onChange}
        ariaLabel="Rubriques"
      />
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((v) => (
          <VideoCard key={v.id} v={v} />
        ))}
      </ul>
      {filtered.length === 0 && (
        <p className="mt-6 text-muted">{t.capsules.empty}</p>
      )}
    </>
  );
}
