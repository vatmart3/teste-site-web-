"use client";

import { useEffect, useState } from "react";
import type { ConvertStep } from "@/lib/sse";

const STEPS: { key: ConvertStep; label: string }[] = [
  { key: "upload", label: "J'envoie tes pages" },
  { key: "read", label: "Je lis le cours" },
  { key: "summary", label: "J'écris le résumé" },
  { key: "mindmap", label: "Je construis la carte" },
  { key: "flashcards", label: "Je fabrique les fiches" },
];

type Props = { step: ConvertStep; detail?: string };

export function ConvertProgress({ step, detail }: Props) {
  const [seconds, setSeconds] = useState(0);
  const index = Math.max(0, STEPS.findIndex((s) => s.key === step));

  useEffect(() => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      aria-live="polite"
      className="relative overflow-hidden border border-encre bg-papier px-4 py-4 sm:px-6"
    >
      {/* la barre de scan de la photocopieuse, pas un spinner */}
      <div className="scan pointer-events-none absolute inset-0" aria-hidden />

      <ol className="relative flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-5">
        {STEPS.map((entry, position) => {
          const state = position < index ? "fait" : position === index ? "cours" : "attente";
          return (
            <li
              key={entry.key}
              className={[
                "flex items-center gap-2 text-sm",
                state === "attente" ? "text-encre-clair" : "text-encre",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "inline-block h-2.5 w-2.5 border",
                  state === "attente" ? "border-photocopie" : "border-encre",
                  state === "fait" ? "bg-encre" : "",
                  state === "cours" ? "bg-stabilo-jaune" : "",
                ].join(" ")}
              />
              <span className={state === "cours" ? "font-semibold" : ""}>{entry.label}</span>
            </li>
          );
        })}
      </ol>

      <p className="relative mt-3 text-sm text-encre-clair tabular-nums">
        {detail ? `${detail} · ` : ""}
        {seconds} s
      </p>

      <style jsx>{`
        .scan {
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(255, 233, 74, 0.55) 46%,
            rgba(11, 11, 12, 0.16) 50%,
            transparent 54%
          );
          background-size: 100% 240%;
          animation: balayage 1.5s linear infinite;
        }
        @keyframes balayage {
          from {
            background-position: 0 -140%;
          }
          to {
            background-position: 0 140%;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .scan {
            animation: none;
            background: none;
            border-left: 3px solid var(--color-stabilo-jaune);
          }
        }
      `}</style>
    </section>
  );
}
