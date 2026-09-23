"use client";
import { useState } from "react";

/** Écran-titre : le premier clic débloque le son (obligatoire dans les navigateurs). */
export function TitleScreen({ onStart }: { onStart: () => void }) {
  const [leaving, setLeaving] = useState(false);
  return (
    <div
      className={`fixed inset-0 z-[60] grid place-items-center bg-ink transition-opacity duration-[1200ms] ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div className="bg-[radial-gradient(ellipse_at_center,rgba(201,162,74,0.08),transparent_60%)] absolute inset-0" />
      <div className="relative flex flex-col items-center px-6 text-center">
        <p className="font-sans text-[0.7rem] uppercase tracking-[0.5em] text-brass/80">Harlow &amp; Vance · 44 – 52</p>
        <h1 className="mt-6 font-serif text-5xl font-medium tracking-wide text-ivory sm:text-7xl">Billable Hours</h1>
        <div className="mt-6 h-px w-24 bg-brass/50" />
        <button
          type="button"
          autoFocus
          onClick={() => {
            setLeaving(true);
            onStart();
          }}
          className="group mt-12 rounded-full border border-brass/40 px-8 py-3 font-sans text-xs uppercase tracking-[0.35em] text-ivory transition hover:border-brass hover:text-brass-light focus-visible:border-brass focus-visible:outline-none"
        >
          Entrer
        </button>
        <p className="mt-6 font-sans text-xs text-ivory/40">Casque recommandé · Démo du moteur (phase 1)</p>
      </div>
    </div>
  );
}
