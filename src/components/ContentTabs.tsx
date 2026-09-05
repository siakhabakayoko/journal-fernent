"use client";

export type ContentTab = {
  id: string;
  label: string;
};

export function ContentTabs({
  tabs,
  activeId,
  onChange,
  ariaLabel = "Filtres",
}: {
  tabs: ContentTab[];
  /** Empty string / null = no tab selected (show all). */
  activeId: string | null;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  const current = activeId ?? "";

  return (
    <div className="mt-6 relative border-b border-rule">
      <div
        className="flex flex-nowrap items-end gap-0.5 overflow-x-auto whitespace-nowrap scrollbar-thin [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => {
          const active = tab.id === current;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              title={tab.label}
              className={`shrink-0 px-3 sm:px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors max-w-[9.5rem] sm:max-w-[11rem] truncate ${
                active
                  ? "border-fernent-red text-fernent-red"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
