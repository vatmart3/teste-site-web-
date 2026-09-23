"use client";
/** Débrief : compteur d'honoraires mécanique, note, réputation ; puis la leçon d'associé à ranger. */
import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { LESSONS } from "@/content/lessons";
import { formatDollars } from "../career/ranks";
import { panelBus } from "../director/events";
import { LessonArticle } from "../hub/views/LibraryView";

export interface DebriefState {
  visible: boolean;
  grade: string;
  score: number;
  fees: number;
  hours: number;
  reputation: number;
  found: number;
  total: number;
  /** Ce qui est compté (« anomalies », « contradictions »). */
  unit: string;
  set: (patch: Partial<Omit<DebriefState, "set">>) => void;
}

export const useDebrief = create<DebriefState>()((set) => ({
  visible: false,
  grade: "",
  score: 0,
  fees: 0,
  hours: 0,
  reputation: 0,
  found: 0,
  total: 0,
  unit: "anomalies",
  set: (patch) => set(patch),
}));

/** Rouleaux de chiffres qui tournent jusqu'au montant (comme un vieux compteur de caisse). */
function RollingCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(value * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const digits = String(Math.round(shown)).padStart(String(Math.round(value)).length, "0").split("");
  return (
    <span className="inline-flex gap-[0.06em] rounded bg-[#0b0906] p-[0.08em] text-[2.4rem] shadow-[inset_0_0_0.2em_#000]" aria-label={formatDollars(value)}>
      <span className="self-center px-1 font-serif text-[0.7em] text-[#f0d48c]">$</span>
      {digits.map((d, i) => (
        <span key={i} className="odometer-window">
          <span className="odometer-strip" style={{ transform: `translateY(${-Number(d)}em)`, transition: "transform 0.12s linear" }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

export function DebriefOverlay() {
  const d = useDebrief();
  if (!d.visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[12vh] z-40 flex justify-center px-4">
      <div className="hub-panel animate-hotspot-in rounded-md px-6 py-4 text-center font-sans text-ivory" role="status" aria-live="polite">
        <p className="text-[0.62rem] uppercase tracking-[0.35em] text-brass/80">Heures facturées · {String(d.hours).replace(".", ",")} h</p>
        <div className="mt-2">
          <RollingCounter value={d.fees} />
        </div>
        <p className="mt-3 text-sm text-ivory/80">
          Note <span className="font-serif text-xl text-brass-light">{d.grade}</span> · {d.found}/{d.total} {d.unit} · Réputation{" "}
          <span className="text-brass-light">+{d.reputation}</span>
        </p>
      </div>
    </div>
  );
}

/** La (les) leçon(s) débloquée(s), sur papier à en-tête ; « Ranger » les met dans la bibliothèque. */
export function LessonPanel({ ids }: { ids: string[] }) {
  const [i, setI] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const list = LESSONS.filter((l) => ids.includes(l.id));
  useEffect(() => {
    // Focus sans faire défiler l'article (sinon le titre sort du cadre).
    btn.current?.focus({ preventScroll: true });
  }, [i]);
  const lesson = list[i];
  if (!lesson) return null;
  const last = i >= list.length - 1;
  return (
    <div className="fixed inset-0 z-[45] grid place-items-center bg-black/45 px-4">
      <div className="w-[min(44rem,95vw)] animate-hotspot-in">
        <p className="mb-2 text-center font-sans text-[0.62rem] uppercase tracking-[0.35em] text-brass/80">
          Leçon d&apos;associé {list.length > 1 ? `· ${i + 1}/${list.length}` : ""}
        </p>
        <LessonArticle
          lesson={lesson}
          footer={
            <div className="mt-5 flex justify-end">
              <button
                ref={btn}
                type="button"
                onClick={() => (last ? panelBus.emit(true) : setI(i + 1))}
                className="rounded-sm bg-[#16223a] px-5 py-2 font-sans text-xs uppercase tracking-[0.25em] text-[#e7c878] hover:bg-[#0b1426]"
              >
                {last ? "Ranger dans la bibliothèque" : "Leçon suivante"}
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}
