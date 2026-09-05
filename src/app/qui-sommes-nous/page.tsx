import { AboutNotreJournal } from "@/components/AboutNotreJournal";
import { QuiSommesNousChrome } from "@/components/QuiSommesNousChrome";

export default function QuiSommesNousPage() {
  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-12">
      <QuiSommesNousChrome />
      <div className="mt-8 space-y-10">
        <AboutNotreJournal />
        <div className="border-t border-rule pt-8">
          <QuiSommesNousChrome section="histoire" />
        </div>
      </div>
    </div>
  );
}
