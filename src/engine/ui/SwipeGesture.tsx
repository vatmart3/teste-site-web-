"use client";
/** Geste « glisser pour… » (ouvrir la portière). Au clavier : Entrée ou flèche droite. */
import { useRef, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { panelBus } from "../director/events";

export function SwipeGesture({ label }: { label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [done, setDone] = useState(false);
  const drag = useRef<{ start: number; width: number } | null>(null);

  const finish = () => {
    if (done) return;
    setDone(true);
    setX(1);
    void audio.sfx("sfx-car-door", { volume: 0.9 });
    window.setTimeout(() => panelBus.emit(true), 250);
  };

  return (
    <div className="fixed inset-x-0 bottom-[12vh] z-[45] flex justify-center px-6">
      <div ref={track} className="relative h-14 w-[min(22rem,80vw)] rounded-full border border-brass/40 bg-black/45 backdrop-blur-sm">
        <span className="pointer-events-none absolute inset-0 grid place-items-center pl-10 font-sans text-[0.7rem] uppercase tracking-[0.3em] text-ivory/70" style={{ opacity: 1 - x * 1.5 }}>
          {label} ›
        </span>
        <button
          type="button"
          aria-label={label}
          autoFocus
          onKeyDown={(e) => (e.key === "Enter" || e.key === "ArrowRight" || e.key === " ") && (e.preventDefault(), finish())}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { start: e.clientX - x * ((track.current?.clientWidth ?? 300) - 56), width: (track.current?.clientWidth ?? 300) - 56 };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || done) return;
            const v = Math.max(0, Math.min(1, (e.clientX - d.start) / d.width));
            setX(v);
            if (v > 0.92) finish();
          }}
          onPointerUp={() => {
            const moved = x > 0.05;
            drag.current = null;
            if (done) return;
            setX(moved ? 0 : 0.18); // simple clic : le bouton esquisse le geste pour le suggérer
            if (!moved) window.setTimeout(() => setX(0), 350);
          }}
          className="absolute left-1 top-1 grid h-12 w-12 cursor-grab touch-none place-items-center rounded-full bg-gradient-to-b from-brass-light to-brass text-navy shadow-lg transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-ivory active:cursor-grabbing"
          style={{ transform: `translateX(calc(${x} * (min(22rem, 80vw) - 3.5rem)))`, transition: drag.current ? "none" : "transform 0.35s cubic-bezier(.2,.8,.2,1)" }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
