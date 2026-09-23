"use client";
import { CASES, caseStatus, CURRENT_PHASE } from "@/content/cases";
import { hubBus, useHub } from "../state";
import { useProfile } from "../../state/profile";
import { Shell, Soon } from "./Shell";

const STATUS_LABEL = { completed: "Terminée", available: "Ouverte", soon: "À venir", sealed: "Sous scellés" } as const;

/** Fiche de l'affaire choisie dans l'éventail 3D. */
export function CasesView() {
  const selected = useHub((s) => s.selectedCase);
  const records = useProfile((s) => s.cases);
  const meta = CASES.find((c) => c.id === selected);
  const record = meta ? records[meta.id] : undefined;
  const status = meta ? caseStatus(meta, record, false, CURRENT_PHASE) : null;
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
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  autoFocus
                  onClick={() => hubBus.emit({ type: "case", id: meta.id })}
                  className="rounded-sm bg-brass px-5 py-2 text-xs uppercase tracking-[0.25em] text-navy hover:bg-brass-light"
                >
                  {record?.completed ? "Rejouer l'affaire" : "Ouvrir le dossier"}
                </button>
                {record?.completed && (
                  <p className="text-xs text-ivory/70">
                    Meilleure note <span className="font-serif text-base text-brass-light">{record.grade}</span> · {record.bestScore}/100 · {record.attempts} tentative{record.attempts > 1 ? "s" : ""}
                  </p>
                )}
                {!record?.completed && <p className="text-xs text-ivory/60">Environ 11 minutes · sauvegarde automatique à la fin</p>}
              </div>
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
