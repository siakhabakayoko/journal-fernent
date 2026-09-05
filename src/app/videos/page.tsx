import type { Metadata } from "next";
import videos from "../../../content/videos.json";
import { VideosChrome } from "@/components/VideosChrome";

export const metadata: Metadata = {
  title: "Vidéos",
  description: "Reportages et entretiens — Journal Ferñent",
};

export default function VideosPage() {
  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-8 sm:py-10">
      <VideosChrome />
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <li
            key={v.id}
            className="border border-rule bg-paper-elevated overflow-hidden card-lift group"
          >
            <div className="editorial-panel aspect-video flex items-center justify-center">
              <div className="relative z-10 flex flex-col items-center gap-2 text-white/90">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/10 text-lg backdrop-blur-sm group-hover:bg-fernent-red group-hover:border-fernent-red transition-colors">
                  ▶
                </span>
                <span className="text-xs font-bold uppercase tracking-wider">
                  {v.duration}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <h2 className="font-serif text-lg font-bold leading-snug group-hover:text-fernent-red transition-colors">
                {v.title}
              </h2>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">
                {v.description}
              </p>
              <p className="mt-3 kicker">Placeholder</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
