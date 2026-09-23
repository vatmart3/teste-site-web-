"use client";
/**
 * Interface du tableau d'enquête (par-dessus le liège 3D) : consigne, compteur de connexions, message de la
 * dernière tentative, bouton « Terminer ». Au clavier : choisir deux pièces dans la liste pour les relier.
 */
import { useEffect } from "react";
import { boardBus, useBoard } from "./state";

export function BoardOverlay() {
  const active = useBoard((s) => s.active);
  const def = useBoard((s) => s.def);
  const found = useBoard((s) => s.found);
  const selected = useBoard((s) => s.selected);
  const toast = useBoard((s) => s.toast);

  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") boardBus.emit({ type: "done" });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active]);

  if (!active || !def) return null;
  const pick = (id: string) => {
    const s = useBoard.getState().selected;
    if (!s) useBoard.getState().set({ selected: id });
    else if (s === id) useBoard.getState().set({ selected: null });
    else {
      useBoard.getState().set({ selected: null });
      boardBus.emit({ type: "connect", a: s, b: id });
    }
  };
  const enough = found.length >= def.required;
  return (
    <div className="pointer-events-none fixed inset-0 z-[40] font-sans text-ivory">
      <div className="absolute left-[2vw] top-[2vh] max-w-[16rem] rounded-sm bg-[#07080b]/70 px-3 py-2">
        <p className="text-[0.58rem] uppercase tracking-[0.35em] text-brass/80">Tableau d&apos;enquête</p>
        <h2 className="font-serif text-base">{def.title}</h2>
        <p className="mt-1 text-[0.7rem] leading-snug text-ivory/70">Tirez le fil rouge d&apos;une pièce à une autre quand l&apos;une contredit l&apos;autre.</p>
      </div>
      <div className="absolute right-[2vw] top-[3vh] rounded-sm border border-brass/30 bg-[#0b0d12]/80 px-3 py-2 text-right">
        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-brass/80">Contradictions</p>
        <p className="font-serif text-2xl tabular-nums">
          {found.length} <span className="text-base text-ivory/50">/ {def.links.length}</span>
        </p>
      </div>
      {toast && (
        <p key={toast.id} role="status" className={`animate-hotspot-in absolute bottom-[11vh] left-1/2 max-w-[min(42rem,90vw)] -translate-x-1/2 rounded-sm px-4 py-2 text-center text-sm shadow-lg ${toast.good ? "bg-[#f6f0de] text-[#2a1a10]" : "bg-[#2a0f10]/90 text-[#f3c0b8]"}`}>
          {toast.text}
        </p>
      )}
      <details className="pointer-events-auto absolute bottom-[3vh] left-[2vw] max-w-[18rem] rounded-sm border border-ivory/15 bg-[#0b0d12]/85 px-3 py-2 text-xs">
        <summary className="cursor-pointer text-ivory/70">Relier au clavier</summary>
        <ul className="mt-2 grid gap-1">
          {def.pieces.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p.id)} aria-pressed={selected === p.id} className={`w-full rounded-sm px-2 py-1 text-left hover:bg-ivory/10 focus-visible:outline focus-visible:outline-brass ${selected === p.id ? "bg-brass/30" : ""}`}>
                {p.title}
              </button>
            </li>
          ))}
        </ul>
      </details>
      <button
        type="button"
        onClick={() => boardBus.emit({ type: "done" })}
        className={`pointer-events-auto absolute bottom-[3vh] right-[2vw] rounded-full border px-5 py-2 text-[0.7rem] uppercase tracking-[0.3em] transition focus-visible:outline-none ${enough ? "border-brass bg-brass/20 text-brass-light hover:bg-brass/30" : "border-ivory/30 text-ivory/70 hover:border-ivory/60"}`}
      >
        {enough ? "Dossier prêt · Terminer" : "Quitter le tableau · Échap"}
      </button>
    </div>
  );
}
