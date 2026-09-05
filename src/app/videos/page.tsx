import type { Metadata } from "next";
import videos from "../../../content/videos.json";
import { VideosChrome } from "@/components/VideosChrome";

export const metadata: Metadata = {
  title: "Vidéos",
  description: "Reportages et entretiens — Journal Ferñent",
};

export default function VideosPage() {
  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-8">
      <VideosChrome />
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <li key={v.id} className="border border-neutral-200 bg-white overflow-hidden">
            <div className="aspect-video bg-neutral-900 flex items-center justify-center text-white/80 text-sm">
              ▶ {v.duration}
            </div>
            <div className="p-4">
              <h2 className="font-serif text-lg font-bold">{v.title}</h2>
              <p className="mt-1 text-sm text-neutral-600">{v.description}</p>
              <p className="mt-2 text-xs text-fernent-red font-semibold uppercase tracking-wide">
                Placeholder
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
