"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Highlight } from "./Highlight";
import { prettyMath } from "@/lib/latex";
import type { Flashcard } from "@/lib/schemas";

type Verdict = "known" | "shaky" | "unknown";

type Props = {
  cards: Flashcard[];
  daysLeft: number | null;
};

const DIFFICULTY_LABEL = ["", "à savoir", "à comprendre", "piège"];

export function FlashcardsView({ cards, daysLeft }: Props) {
  // Avec une date de contrôle, les cartes les plus casse-gueule passent devant.
  const ordered = useMemo(() => {
    if (daysLeft === null) return cards;
    return [...cards].sort((a, b) => b.difficulty - a.difficulty);
  }, [cards, daysLeft]);

  const [queue, setQueue] = useState<string[]>(() => ordered.map((card) => card.id));
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const byId = useMemo(() => new Map(ordered.map((card) => [card.id, card])), [ordered]);
  const currentId = queue[0];
  const current = currentId ? byId.get(currentId) : undefined;
  const mastered = Object.values(verdicts).filter((v) => v === "known").length;

  const answer = useCallback(
    (verdict: Verdict) => {
      if (!currentId) return;
      setVerdicts((current) => ({ ...current, [currentId]: verdict }));
      setAnswered((count) => count + 1);
      setFlipped(false);
      setQueue((current) => {
        const [head, ...rest] = current;
        if (!head) return current;
        if (verdict === "known") return rest;
        // « pas du tout » revient vite, « à revoir » attend un peu
        const gap = verdict === "unknown" ? 2 : 4;
        const position = Math.min(gap, rest.length);
        return [...rest.slice(0, position), head, ...rest.slice(position)];
      });
    },
    [currentId],
  );

  const restart = useCallback(() => {
    setQueue(ordered.map((card) => card.id));
    setVerdicts({});
    setAnswered(0);
    setFlipped(false);
  }, [ordered]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setFlipped((value) => !value);
      } else if (flipped && event.key === "1") answer("known");
      else if (flipped && event.key === "2") answer("shaky");
      else if (flipped && event.key === "3") answer("unknown");
      else if (event.key === "ArrowRight") setFlipped(true);
      else if (event.key === "ArrowLeft") setFlipped(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, flipped]);

  if (!current) {
    return (
      <div className="pb-24 pt-10">
        <h2 className="titre text-titre">
          <Highlight seed="fin">Paquet terminé.</Highlight>
        </h2>
        <p className="lecture colonne mt-4">
          {mastered} carte{mastered > 1 ? "s" : ""} sur {cards.length} marquée
          {mastered > 1 ? "s" : ""} comme sue{mastered > 1 ? "s" : ""}. La mémoire lâche vite :
          repasse ce paquet demain, puis dans trois jours, puis dans une semaine. C&apos;est le
          rythme qui marche, pas la durée d&apos;une session.
        </p>
        <button type="button" className="bouton mt-6" onClick={restart}>
          Refaire le paquet
        </button>
      </div>
    );
  }

  const total = cards.length;
  const progress = Math.max(mastered, answered > 0 ? 1 : 0);

  return (
    <div className="pb-24">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-encre pb-3">
        <p className="titre text-base">
          {answered > 0 ? (
            <>
              {progress} fiche{progress > 1 ? "s" : ""} sur {total} maîtrisée
              {progress > 1 ? "s" : ""}
            </>
          ) : (
            <>
              {total} fiches. Retourne la première.
            </>
          )}
        </p>
        <p className="text-sm text-encre-clair">
          {daysLeft !== null ? (
            <span className="text-encre">
              {daysLeft > 0
                ? `Contrôle dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""} · `
                : daysLeft === 0
                  ? "Contrôle aujourd'hui · "
                  : ""}
            </span>
          ) : null}
          {queue.length} restante{queue.length > 1 ? "s" : ""} dans la pile
        </p>
      </div>

      {answered > 0 ? (
        <div className="mt-3 h-2 w-full border border-encre bg-papier" aria-hidden>
          <div
            className="h-full bg-stabilo-jaune transition-[width] duration-200"
            style={{ width: `${Math.round((progress / total) * 100)}%` }}
          />
        </div>
      ) : null}

      <div className="deck-scene mt-6">
        <div
          className="deck-carte relative mx-auto h-[24rem] w-full max-w-[34rem] sm:h-[26rem]"
          data-face={flipped ? "verso" : "recto"}
          onPointerDown={(event) => {
            swipe.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) setFlipped(dx < 0);
          }}
        >
          <button
            type="button"
            className="deck-face bristol absolute inset-0 flex w-full flex-col justify-between p-6 text-left sm:p-8"
            aria-label="Recto. Entrée ou espace pour retourner."
            onClick={() => setFlipped(true)}
          >
            <span className="flex items-center justify-between text-sm text-encre-clair">
              <span>{current.tag}</span>
              <span>{DIFFICULTY_LABEL[current.difficulty] ?? ""}</span>
            </span>
            <span className="titre text-[1.45rem] leading-tight sm:text-[1.75rem]">
              {prettyMath(current.front)}
            </span>
            <span className="text-sm text-encre-clair">
              {current.hint ? `Indice : ${prettyMath(current.hint)}` : "Touche la carte pour retourner"}
            </span>
          </button>

          <div className="deck-face deck-face-verso bristol absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
            <button
              type="button"
              className="flex-1 text-left"
              aria-label="Verso. Entrée ou espace pour revenir au recto."
              onClick={() => setFlipped(false)}
            >
              <span className="lecture block text-[1.15rem] leading-relaxed sm:text-[1.28rem]">
                {prettyMath(current.back)}
              </span>
            </button>
            <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                type="button"
                className="bouton justify-center px-1 text-[0.82rem] sm:px-4 sm:text-base"
                onClick={() => answer("known")}
              >
                Su
              </button>
              <button
                type="button"
                className="bouton bouton-blanc justify-center px-1 text-[0.82rem] sm:px-4 sm:text-base"
                onClick={() => answer("shaky")}
              >
                À revoir
              </button>
              <button
                type="button"
                className="bouton bouton-blanc justify-center px-1 text-[0.82rem] sm:px-4 sm:text-base"
                onClick={() => answer("unknown")}
              >
                Pas du tout
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-encre-clair">
        Espace pour retourner · balaye vers la gauche · 1, 2, 3 pour répondre
      </p>
    </div>
  );
}
