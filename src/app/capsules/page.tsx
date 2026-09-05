import type { Metadata } from "next";
import { Suspense } from "react";
import { CapsulesChrome } from "@/components/CapsulesChrome";
import { CapsulesClient } from "@/components/CapsulesClient";
import { getVideos } from "@/lib/videos";

export const metadata: Metadata = {
  title: "Capsules",
  description: "Reportages et entretiens — Journal Ferñent",
};

export default async function CapsulesPage() {
  const videos = await getVideos();

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-8 sm:py-10">
      <CapsulesChrome />
      <Suspense fallback={<p className="mt-8 text-muted">…</p>}>
        <CapsulesClient videos={videos} />
      </Suspense>
    </div>
  );
}
