"use client";
import { CASES, caseStatus, CURRENT_PHASE } from "@/content/cases";
import { useHub } from "../state";
import { Shell, Soon } from "./Shell";

const STATUS_LABEL = { completed: "Terminée", available: "Ouverte", soon: "À venir", sealed: "Sous scellés" } as const;

/** Fiche de l'affaire choisie dans l'éventail 3D. */
export function CasesView() {
  const selected = useHub((s) => s.selectedCase);
  const meta = CASES.find((c) => c.id === selected);
  const status = meta ? caseStatus(meta, undefined, false, CURRENT_PHASE) : null;
  return (
    <Shell kicker="Saison 1 · L'affaire Meridian" title={meta ? `N° ${meta.number} — ${meta.title}` : "Choisissez une affaire"} align="bottom" className="hub-panel w-[min(44rem,94vw)] rounded-md p-4">
      {meta && status ? (
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.25em]" style={{ color: meta.tab === "#1f1f24" ? "#aaa" : meta.tab }}>
            {meta.kind} · {STATUS_LABEL[status]}
          </p>
          <p className="mt-1 font-serif text-base leading-snug text-ivory/90">{meta.summary}</p>
          <div className="mt-3">
            {status === "sealed" ? (
              <Soon>Affaire premium de la saison complète. Les achats (et le prix) arrivent avec les comptes joueurs.</Soon>
            ) : status === "soon" ? (
              <Soon>Cette affaire devient jouable dans une prochaine mise à jour (livraison {meta.availableInPhase}).</Soon>
            ) : (
              <button type="button" className="rounded-sm bg-brass px-5 py-2 text-xs uppercase tracking-[0.25em] text-navy">
                Ouvrir le dossier
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-ivory/70">Survolez les chemises, cliquez pour lire la fiche. Les trois premières affaires sont gratuites.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Affaires">
        {CASES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => useHub.getState().set({ selectedCase: c.id })}
            aria-pressed={selected === c.id}
            className={`rounded-sm border px-2 py-1 text-[0.65rem] uppercase tracking-[0.15em] ${selected === c.id ? "border-brass text-brass-light" : "border-ivory/15 text-ivory/60 hover:text-ivory"}`}
          >
            {c.number}. {c.title}
          </button>
        ))}
      </div>
    </Shell>
  );
}
