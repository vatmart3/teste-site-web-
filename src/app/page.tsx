"use client";

import { useEffect, useRef, useState } from "react";
import { ConvertProgress } from "@/components/ConvertProgress";
import { Dropzone } from "@/components/Dropzone";
import { Highlight } from "@/components/Highlight";
import { PageThumbs } from "@/components/PageThumbs";
import { PaperBackdrop, type HeroPhase } from "@/components/hero/PaperBackdrop";
import { QuotaMeter } from "@/components/QuotaMeter";
import { Results } from "@/components/Results";
import { readExamDate, writeExamDate } from "@/lib/client/quota";
import { useConvert } from "@/lib/client/useConvert";

export default function Page() {
  const { state, addFiles, movePage, removePage, convert, reset } = useConvert();
  const [examDate, setExamDate] = useState("");
  const [phase, setPhase] = useState<HeroPhase>("repos");
  const [statsKey, setStatsKey] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => setExamDate(readExamDate()), []);

  useEffect(() => {
    if (state.phase === "preparing" || state.phase === "converting") {
      setPhase("scan");
      return;
    }
    if (state.phase === "ready") {
      setPhase("separation");
      const timer = window.setTimeout(() => setPhase("resultat"), 1500);
      return () => window.clearTimeout(timer);
    }
    setPhase("repos");
    return;
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "ready") return;
    setStatsKey((key) => key + 1);
    const timer = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [state.phase]);

  const busy = state.phase === "preparing" || state.phase === "converting";
  const hasResult = state.conversion !== null || state.partial !== null;

  return (
    <main>
      <section className="relative isolate min-h-[64svh] px-4 pb-12 pt-6 sm:min-h-[80svh] sm:px-6 sm:pt-10">
        <PaperBackdrop phase={phase} />

        <div className="mx-auto w-full max-w-4xl">
          <p className="titre text-lg tracking-tight">
            <Highlight seed="marque">FICHÉ</Highlight>
          </p>

          <h1 className="affiche mt-7 sm:mt-10">Convertisseur de cours</h1>

          <div className="mt-6 sm:mt-8">
            <Dropzone
              onFiles={(files) => void addFiles(files)}
              disabled={busy}
              compact={state.pages.length > 0}
            />
          </div>

          <div className="mt-2">
            <QuotaMeter refreshKey={statsKey} />
          </div>

          {state.error ? (
            <div role="alert" className="mt-3 border-l-4 border-bic-bleu bg-papier px-3 py-2">
              <p className="titre text-base">{state.error.message}</p>
              {state.error.hint ? (
                <p className="lecture text-[0.98rem]">{state.error.hint}</p>
              ) : null}
            </div>
          ) : null}

          {state.phase === "preparing" ? (
            <p role="status" className="mt-3 text-sm text-encre-clair">
              {state.stepLabel || "Préparation des pages…"}
            </p>
          ) : null}

          {state.pages.length > 0 ? (
            <div className="mt-6">
              <PageThumbs
                pages={state.pages}
                onMove={movePage}
                onRemove={removePage}
                disabled={busy}
              />

              <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-4">
                <button
                  type="button"
                  className="bouton text-base"
                  disabled={busy}
                  onClick={() => void convert(state.pages, examDate)}
                >
                  {state.phase === "converting"
                    ? "Conversion en cours…"
                    : state.conversion
                      ? "Reconvertir"
                      : `Convertir ${state.pages.length} page${state.pages.length > 1 ? "s" : ""}`}
                </button>

                <label className="flex flex-col text-sm text-encre-clair">
                  <span>Mon contrôle est le</span>
                  <input
                    type="date"
                    value={examDate}
                    disabled={busy}
                    onChange={(event) => {
                      setExamDate(event.target.value);
                      writeExamDate(event.target.value);
                    }}
                    className="mt-1 border border-encre bg-papier px-2 py-1 text-encre"
                  />
                </label>

                <button type="button" className="bouton-nu text-sm" disabled={busy} onClick={reset}>
                  Tout effacer
                </button>
              </div>
            </div>
          ) : null}

          {state.phase === "converting" ? (
            <div className="mt-6">
              <ConvertProgress step={state.step} />
            </div>
          ) : null}
        </div>
      </section>

      <div ref={resultsRef} className="scroll-mt-2">
        {hasResult ? (
          <Results
            conversion={state.conversion}
            partial={state.partial}
            streaming={state.phase === "converting"}
            examDate={examDate}
            elapsedMs={state.elapsedMs}
            fromCache={state.fromCache}
          />
        ) : null}
      </div>

      <footer className="mt-10 border-t border-encre sm:mt-16">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-encre-clair sm:px-6">
          <p>
            Tes fichiers sont lus en mémoire puis jetés. Seul le résultat reste, et seulement dans
            ton navigateur.
          </p>
          <p>
            Gratuit, 3 cours par jour. Pro à 4,99 €/mois en phase 2 : illimité, planches
            d&apos;impression, Notion, historique.
          </p>
        </div>
      </footer>
    </main>
  );
}
