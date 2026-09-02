"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { HeroPhase } from "./Scene";

const Scene = dynamic(() => import("./Scene").then((mod) => mod.Scene), {
  ssr: false,
  loading: () => null,
});

export type { HeroPhase };

/**
 * La feuille est le fond du hero : le titre et le convertisseur sont imprimés
 * dessus. Un seul moment orchestré — dépôt, scan, pliage, séparation — et
 * `prefers-reduced-motion` le remplace par la feuille statique équivalente.
 */
export function PaperBackdrop({ phase }: { phase: HeroPhase }) {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || reduced) return <StaticPaper phase={phase} />;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <Scene phase={phase} />
    </div>
  );
}

function StaticPaper({ phase }: { phase: HeroPhase }) {
  const separated = phase === "separation" || phase === "resultat";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <svg
        viewBox="0 0 400 520"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="rasant" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="62%" stopColor="#f6f6f3" />
            <stop offset="100%" stopColor="#e6e6e1" />
          </linearGradient>
        </defs>
        <rect width="400" height="520" fill="#ffffff" />
        <rect x="46" y="34" width="308" height="452" fill="url(#rasant)" />
        {Array.from({ length: 22 }, (_, index) => (
          <line
            key={index}
            x1="46"
            x2="354"
            y1={62 + index * 20}
            y2={62 + index * 20}
            stroke="#0b0b0c"
            strokeOpacity="0.05"
          />
        ))}
        {phase === "scan" ? (
          <rect x="46" y="230" width="308" height="10" fill="#ffe94a" opacity="0.7" />
        ) : null}
        {separated ? (
          <g>
            <rect x="60" y="200" width="86" height="60" fill="#ffffff" stroke="#0b0b0c" />
            <circle cx="200" cy="230" r="7" fill="#0b0b0c" />
            <circle cx="176" cy="206" r="5" fill="#ff7bb0" />
            <circle cx="224" cy="206" r="5" fill="#ff7bb0" />
            <circle cx="182" cy="256" r="5" fill="#ff7bb0" />
            <line x1="200" y1="230" x2="176" y2="206" stroke="#0b0b0c" />
            <line x1="200" y1="230" x2="224" y2="206" stroke="#0b0b0c" />
            <line x1="200" y1="230" x2="182" y2="256" stroke="#0b0b0c" />
            <rect x="256" y="196" width="70" height="68" fill="#ffffff" stroke="#0b0b0c" />
            <line x1="266" y1="214" x2="316" y2="214" stroke="#0b0b0c" />
            <line x1="266" y1="230" x2="316" y2="230" stroke="#0b0b0c" />
            <line x1="266" y1="246" x2="300" y2="246" stroke="#0b0b0c" />
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}
