"use client";

import { useEffect, useMemo, useState } from "react";
import { ExportBar } from "./ExportBar";
import { FlashcardsView } from "./FlashcardsView";
import { KeepWork } from "./KeepWork";
import { MindMapView } from "./MindMapView";
import { ResultTabs, type TabKey } from "./ResultTabs";
import { SummaryView } from "./SummaryView";
import { daysUntil } from "@/lib/client/quota";
import type { Conversion, PartialConversion } from "@/lib/schemas";

type Props = {
  conversion: Conversion | null;
  partial: PartialConversion | null;
  streaming: boolean;
  examDate: string;
  elapsedMs: number;
  fromCache: boolean;
};

export function Results({ conversion, partial, streaming, examDate, elapsedMs, fromCache }: Props) {
  const [tab, setTab] = useState<TabKey>("resume");
  const summary = conversion?.summary ?? partial?.summary ?? null;
  const mindmap = conversion?.mindmap ?? null;
  const cards = conversion?.flashcards.cards ?? null;

  const ready: Record<TabKey, boolean> = useMemo(
    () => ({
      resume: summary !== null,
      carte: mindmap !== null,
      fiches: cards !== null && cards.length > 0,
    }),
    [summary, mindmap, cards],
  );

  useEffect(() => {
    if (!ready[tab]) setTab("resume");
  }, [ready, tab]);

  if (!summary) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <ResultTabs active={tab} onChange={setTab} ready={ready} />

      {conversion ? (
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <ExportBar conversion={conversion} tab={tab} />
          <p className="text-sm text-encre-clair">
            {fromCache
              ? "Déjà converti : ressorti du cache, sans nouvel appel."
              : `Converti en ${(elapsedMs / 1000).toFixed(1)} s`}
          </p>
        </div>
      ) : null}

      {conversion && conversion.pageIssues.length > 0 ? (
        <div className="mt-5 border-l-[3px] border-stabilo-rose bg-papier-scan px-3 py-2">
          <p className="titre text-[0.95rem]">
            Ce que je n&apos;ai pas pu lire — rien n&apos;a été inventé pour combler.
          </p>
          <ul className="mt-1">
            {conversion.pageIssues.map((issue) => (
              <li key={issue.page} className="mt-0.5 text-[0.85rem] leading-snug text-encre-clair">
                <strong className="titre text-encre">Page {issue.page}</strong> — {issue.problem}.{" "}
                {issue.advice}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6">
        <div
          role="tabpanel"
          id="panneau-resume"
          aria-labelledby="onglet-resume"
          hidden={tab !== "resume"}
        >
          <SummaryView summary={summary} streaming={streaming} />
        </div>
        <div
          role="tabpanel"
          id="panneau-carte"
          aria-labelledby="onglet-carte"
          hidden={tab !== "carte"}
        >
          {mindmap ? <MindMapView map={mindmap} /> : null}
        </div>
        <div
          role="tabpanel"
          id="panneau-fiches"
          aria-labelledby="onglet-fiches"
          hidden={tab !== "fiches"}
        >
          {cards ? <FlashcardsView cards={cards} daysLeft={daysUntil(examDate)} /> : null}
        </div>
      </div>

      {conversion ? <KeepWork cardCount={conversion.flashcards.cards.length} /> : null}
    </section>
  );
}
