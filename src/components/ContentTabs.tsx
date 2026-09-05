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
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className="mt-6 flex flex-wrap gap-2 border-b border-rule"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
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
  );
}
