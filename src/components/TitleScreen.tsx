"use client";
import { useState } from "react";
import { displayName, useProfile } from "@/engine/state/profile";

export type TitleChoice = "new" | "continue" | "replay";

/** Écran-titre. Le premier clic débloque aussi le son (obligatoire dans les navigateurs). */
export function TitleScreen({ onStart }: { onStart: (c: TitleChoice) => void }) {
  const [leaving, setLeaving] = useState(false);
  const profile = useProfile();
  const go = (c: TitleChoice) => {
    setLeaving(true);
    onStart(c);
  };
  const btn =
    "rounded-full border border-brass/40 px-8 py-3 font-sans text-xs uppercase tracking-[0.35em] text-ivory transition hover:border-brass hover:text-brass-light focus-visible:border-brass focus-visible:outline-none";
  return (
    <div className={`fixed inset-0 z-[60] grid place-items-center bg-ink transition-opacity duration-[1200ms] ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,162,74,0.08),transparent_60%)]" />
      <div className="relative flex flex-col items-center px-6 text-center">
        <p className="font-sans text-[0.7rem] uppercase tracking-[0.5em] text-brass/80">Harlow &amp; Vance · 44 – 52</p>
        <h1 className="mt-6 font-serif text-5xl font-medium tracking-wide text-ivory sm:text-7xl">Billable Hours</h1>
        <div className="mt-6 h-px w-24 bg-brass/50" />
        {profile.arrivalSeen ? (
          <div className="mt-12 flex flex-col items-center gap-3">
            <button type="button" autoFocus onClick={() => go("continue")} className={btn}>
              Continuer
            </button>
            <p className="font-serif text-sm italic text-ivory/50">{displayName(profile)} · Stagiaire</p>
            <div className="mt-4 flex gap-6">
              <button type="button" onClick={() => go("replay")} className="font-sans text-[0.65rem] uppercase tracking-[0.3em] text-ivory/50 hover:text-brass">
                Revoir l&apos;arrivée
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Recommencer une nouvelle partie ? Votre progression locale sera effacée.")) go("new");
                }}
                className="font-sans text-[0.65rem] uppercase tracking-[0.3em] text-ivory/50 hover:text-brass"
              >
                Nouvelle partie
              </button>
            </div>
          </div>
        ) : (
          <button type="button" autoFocus onClick={() => go("new")} className={`mt-12 ${btn}`}>
            Entrer
          </button>
        )}
        <p className="mt-8 font-sans text-xs text-ivory/40">Casque recommandé · Environ 5 minutes</p>
      </div>
    </div>
  );
}
