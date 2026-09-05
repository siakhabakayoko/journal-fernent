import type { Metadata } from "next";
import { getVideos } from "@/lib/videos";
import { VideosChrome } from "@/components/VideosChrome";

export const metadata: Metadata = {
  title: "Vidéos",
  description: "Reportages et entretiens — Journal Ferñent",
};

export default async function VideosPage() {
  const videos = await getVideos();
  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-8 sm:py-10">
      <VideosChrome />
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => {
          const isYoutube = Boolean(v.youtubeId);
          const isFile = Boolean(v.videoUrl) && !isYoutube;
          const isPlaceholder = !isYoutube && !isFile;
          return (
            <li
              key={v.id}
              className="border border-rule bg-paper-elevated overflow-hidden card-lift group"
            >
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
                <p className="mt-1.5 text-sm text-muted leading-relaxed">
                  {v.description}
                </p>
                {isPlaceholder ? (
                  <p className="mt-3 kicker">Placeholder</p>
                ) : v.duration ? (
                  <p className="mt-3 text-xs text-muted">{v.duration}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
