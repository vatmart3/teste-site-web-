"use client";

import { useRef } from "react";
import { Highlight } from "./Highlight";

export type TabKey = "resume" | "carte" | "fiches";

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: "resume", label: "Résumé", hint: "le cours réécrit" },
  { key: "carte", label: "Carte", hint: "l'arborescence" },
  { key: "fiches", label: "Fiches", hint: "la révision" },
];

type Props = {
  active: TabKey;
  onChange: (key: TabKey) => void;
  ready: Record<TabKey, boolean>;
};

/**
 * Des intercalaires de classeur, pas une barre d'onglets : languettes soudées au
 * filet, perforation à gauche, et le surligneur tracé derrière le libellé actif.
 */
export function ResultTabs({ active, onChange, ready }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div className="sticky top-0 z-40 -mx-4 bg-papier px-4 pt-2 sm:-mx-6 sm:px-6">
      <div className="flex items-end">
      <span aria-hidden className="mb-2 mr-2 hidden shrink-0 flex-col gap-3 sm:flex">
        <span className="perfo" />
        <span className="perfo" />
      </span>
      <div
        role="tablist"
        aria-label="Les trois supports"
        className="flex flex-1 items-end gap-1 border-b border-encre"
        onKeyDown={(event) => {
          const index = TABS.findIndex((tab) => tab.key === active);
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const next = (index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
          const tab = TABS[next];
          if (!tab) return;
          onChange(tab.key);
          refs.current[next]?.focus();
        }}
      >
        {TABS.map((tab, index) => {
          const isActive = tab.key === active;
          const isReady = ready[tab.key];
          return (
            <button
              key={tab.key}
              ref={(node) => {
                refs.current[index] = node;
              }}
              role="tab"
              type="button"
              id={`onglet-${tab.key}`}
              aria-controls={`panneau-${tab.key}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              disabled={!isReady}
              onClick={() => onChange(tab.key)}
              className={[
                "relative flex min-w-0 flex-1 items-center gap-2 border border-b-0 px-2.5 pb-2 pt-2 text-left sm:flex-none sm:px-4",
                isActive
                  ? "translate-y-px border-encre bg-papier"
                  : "border-photocopie bg-papier-scan",
                isReady ? "" : "cursor-not-allowed opacity-40",
              ].join(" ")}
            >
              <span className="min-w-0">
                <span className="titre block truncate text-[0.95rem] sm:text-base">
                  {isActive ? (
                    <Highlight seed={tab.key} color={tab.key === "fiches" ? "rose" : "jaune"}>
                      {tab.label}
                    </Highlight>
                  ) : (
                    tab.label
                  )}
                </span>
                <span className="hidden text-xs text-encre-clair sm:block">{tab.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
