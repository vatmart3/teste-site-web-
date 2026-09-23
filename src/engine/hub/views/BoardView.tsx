"use client";
import { Shell } from "./Shell";

/** Tableau de liège : ce que l'on sait déjà de Meridian (il devient interactif avec l'enquête). */
export function BoardView() {
  return (
    <Shell kicker="Tableau d'enquête" title="Meridian Logistics" className="w-[min(46rem,95vw)]">
      <div className="cork relative h-[min(26rem,60vh)] overflow-hidden rounded-sm border-[10px] border-[#3b2a18] shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path d="M 25 12 Q 45 35 72 16" stroke="#b01818" strokeWidth="0.5" fill="none" vectorEffect="non-scaling-stroke" />
          <path d="M 72 16 Q 60 45 43 60" stroke="#b01818" strokeWidth="0.5" fill="none" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        </svg>
        {[
          { x: "8%", y: "10%", r: -3, title: "Le client", text: "Fonds de pension des chauffeurs de Meridian. 60 M$ perdus en 18 mois." },
          { x: "55%", y: "14%", r: 2, title: "La cible", text: "Meridian Logistics Inc. — 4 000 camions, coté au Nasdaq. Comptes publiés dans 3 jours." },
          { x: "26%", y: "58%", r: -1, title: "Consigne de Harlow", text: "« Trouvez-moi la fraude. » Rendu : demain, 8 h 00." },
        ].map((n) => (
          <div key={n.title} className="absolute w-[34%] bg-[#f6f0de] p-3 text-[#2a2118] shadow-lg" style={{ left: n.x, top: n.y, transform: `rotate(${n.r}deg)` }}>
            <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[#c0201a] shadow" />
            <p className="font-sans text-[0.6rem] uppercase tracking-[0.25em] text-[#8a6a26]">{n.title}</p>
            <p className="mt-1 font-serif text-sm leading-snug">{n.text}</p>
          </div>
        ))}
        <p className="absolute bottom-3 right-3 max-w-[40%] bg-[#f3e27a] p-2 font-serif text-xs text-[#2a2118] shadow" style={{ transform: "rotate(2deg)" }}>
          Pendant l&apos;enquête, vous punaiserez ici les pièces et tirerez le fil rouge entre elles.
        </p>
      </div>
    </Shell>
  );
}
