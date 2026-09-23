"use client";
import { PERKS, type PerkDef } from "@/content/perks";
import { useProfile } from "../../state/profile";
import { Shell } from "./Shell";

const ICONS: Record<PerkDef["icon"], string> = {
  coffee: "M6 8h9v5a4 4 0 01-4 4H10a4 4 0 01-4-4zM15 9h2a2 2 0 010 4h-2M8 4c0 1 1 1 1 2M11 4c0 1 1 1 1 2",
  microscope: "M9 3l3 3-4 4-3-3zM10 9l4 4M6 20h12M12 20a6 6 0 006-6M14 13l2-2",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  key: "M15 7a4 4 0 11-3.9 5H4v3H2v-5h9.1A4 4 0 0115 7z",
  mask: "M3 7c3-2 15-2 18 0 0 7-4 11-9 11S3 14 3 7zM8 11h2M14 11h2",
};

/** La mallette : les atouts à usage unique, en cartes. */
export function BriefcaseView() {
  const perks = useProfile((s) => s.perks);
  return (
    <Shell kicker="Mallette" title="Atouts" align="bottom" className="w-[min(60rem,96vw)]">
      <ul className="flex flex-wrap justify-center gap-3" style={{ perspective: "900px" }}>
        {PERKS.map((p) => {
          const n = perks[p.id] ?? 0;
          return (
            <li key={p.id}>
              <div
                tabIndex={0}
                className={`group relative h-60 w-40 rounded-lg p-3 text-ivory shadow-[0_18px_40px_rgba(0,0,0,0.55)] outline-none transition-transform duration-300 hover:-translate-y-3 hover:[transform:rotateX(8deg)] focus-visible:-translate-y-3 focus-visible:ring-2 focus-visible:ring-brass ${n ? "" : "brightness-[0.45] grayscale"}`}
                style={{ background: `linear-gradient(160deg, ${p.color}, #0b0b0e)`, border: "1px solid rgba(201,162,74,0.55)" }}
              >
                <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-brass-light">×{n}</span>
                <svg viewBox="0 0 24 24" className="mx-auto mt-3 h-12 w-12 text-brass-light" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
                  <path d={ICONS[p.icon]} />
                </svg>
                <p className="mt-3 text-center font-serif text-lg leading-tight">{p.name}</p>
                <p className="mt-2 text-center text-[0.72rem] leading-snug text-ivory/85">{p.effect}</p>
                <p className="absolute inset-x-3 bottom-3 text-center font-serif text-[0.7rem] italic text-ivory/55">{p.flavor}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-center text-xs text-ivory/55">Les atouts se jouent pendant les affaires. Vous en gagnerez en réussissant vos dossiers.</p>
    </Shell>
  );
}
