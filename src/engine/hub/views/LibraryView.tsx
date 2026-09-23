"use client";
import { useState } from "react";
import { LESSONS } from "@/content/lessons";
import { useProfile } from "../../state/profile";
import { Shell, Soon } from "./Shell";

const SHELF_SIZE = 12;

/** Étagère : reliures cuir aux titres dorés ; clic = la leçon sur papier à en-tête du cabinet. */
export function LibraryView() {
  const unlocked = useProfile((s) => s.lessons);
  const [open, setOpen] = useState<string | null>(null);
  const lesson = LESSONS.find((l) => l.id === open);
  const owned = LESSONS.filter((l) => unlocked.includes(l.id));
  return (
    <Shell kicker="Bibliothèque" title={lesson ? lesson.title : "Leçons d'associé"} className="w-[min(46rem,95vw)]">
      {lesson ? (
        <article className="paper max-h-[65vh] overflow-y-auto px-8 py-6 text-[#2a2118]">
          <header className="mb-4 flex items-baseline justify-between border-b border-[#c9a24a] pb-2">
            <p className="font-serif text-sm tracking-[0.3em]">HARLOW &amp; VANCE LLP</p>
            <p className="font-sans text-[0.6rem] uppercase tracking-[0.25em] text-[#8a6a26]">{lesson.category}</p>
          </header>
          {lesson.paragraphs.map((t, i) => (
            <p key={i} className="mb-3 font-serif text-[1.02rem] leading-relaxed">
              {t}
            </p>
          ))}
          <p className="mt-4 border-l-4 border-[#c9a24a] bg-[#efe6d0] px-4 py-2 font-serif italic">{lesson.takeaway}</p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setOpen(null)} className="font-sans text-xs uppercase tracking-[0.25em] text-[#6b5a44] hover:text-[#2a2118]">
              ‹ Retour à l&apos;étagère
            </button>
            <Soon>Export PDF et mode Révision : livraison 8.</Soon>
          </div>
        </article>
      ) : (
        <div>
          <div className="flex h-60 items-end gap-1 rounded-sm border-b-[10px] border-[#2a180e] bg-[#1a0f08] px-4 pt-4 shadow-[inset_0_20px_40px_rgba(0,0,0,0.6)]">
            {Array.from({ length: SHELF_SIZE }, (_, i) => {
              const l = owned[i];
              const h = 78 + ((i * 37) % 22);
              return l ? (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setOpen(l.id)}
                  className="leather-spine group relative w-10 rounded-t-sm transition-transform hover:-translate-y-2 focus-visible:-translate-y-2 focus-visible:outline-none"
                  style={{ height: `${h}%`, ["--spine" as string]: l.binding }}
                  aria-label={l.title}
                >
                  <span className="absolute inset-x-0 top-3 h-px bg-[#c9a24a]/80" />
                  <span className="absolute inset-0 flex items-center justify-center [writing-mode:vertical-rl] rotate-180 font-serif text-[0.72rem] tracking-wide text-[#e7c878]">{l.title}</span>
                  <span className="absolute inset-x-0 bottom-3 h-px bg-[#c9a24a]/80" />
                </button>
              ) : (
                <div key={i} className="w-10 rounded-t-sm bg-[#2a1c12]/80 shadow-inner" style={{ height: `${h}%` }} aria-hidden />
              );
            })}
          </div>
          <p className="mt-3 text-xs text-ivory/60">
            {owned.length} leçon{owned.length > 1 ? "s" : ""} sur l&apos;étagère. Chaque affaire en ajoute une, écrite par Harlow.
          </p>
        </div>
      )}
    </Shell>
  );
}
