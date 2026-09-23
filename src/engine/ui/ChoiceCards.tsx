"use client";
/** Choix de réponse en éventail de fiches cartonnées. Clavier : 1/2/3, flèches + Entrée. */
import { useEffect, useRef, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { panelBus } from "../director/events";
import type { ChoiceOption } from "../state/ui";

export function ChoiceCards({ prompt, options }: { prompt?: string; options: ChoiceOption[] }) {
  const [shown, setShown] = useState(false);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setShown(true);
      refs.current[0]?.focus();
    }, 30);
    const key = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) pick(options[n - 1]!.id);
    };
    window.addEventListener("keydown", key);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", key);
    };
  }, [options]);

  function pick(id: string) {
    void audio.sfx("sfx-paper-slide", { volume: 0.6 });
    panelBus.emit(id);
  }

  const mid = (options.length - 1) / 2;
  return (
    <div className="fixed inset-x-0 bottom-[max(5vh,calc((100dvh-100vw/2.35)/2+1vh))] z-[45] flex flex-col items-center px-3">
      {prompt && <p className="mb-3 font-sans text-[0.7rem] uppercase tracking-[0.3em] text-ivory/70">{prompt}</p>}
      <div role="group" aria-label={prompt ?? "Votre réponse"} className="flex items-end justify-center gap-2 sm:gap-0">
        {options.map((o, i) => {
          const k = i - mid;
          return (
            <button
              key={o.id}
              ref={(n) => {
                refs.current[i] = n;
              }}
              type="button"
              onClick={() => pick(o.id)}
              onFocus={() => void audio.sfx("sfx-ui-hover", { volume: 0.4 })}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") refs.current[(i + 1) % options.length]?.focus();
                if (e.key === "ArrowLeft") refs.current[(i - 1 + options.length) % options.length]?.focus();
              }}
              style={{ transform: shown ? `rotate(${k * 5}deg) translateY(${Math.abs(k) * 10}px)` : "translateY(140%)", transitionDelay: `${i * 70}ms` }}
              className="choice-card paper group w-[min(15rem,30vw)] px-4 pb-4 pt-3 text-left text-[#2a2118] transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] hover:!-translate-y-4 hover:!rotate-0 focus-visible:!-translate-y-4 focus-visible:!rotate-0 focus-visible:outline-none sm:-mx-2"
            >
              <span className="font-sans text-[0.6rem] uppercase tracking-[0.3em] text-[#8a6a26]">{i + 1}</span>
              <span className="mt-1 block font-serif text-[clamp(0.95rem,1.4vw,1.2rem)] leading-snug">{o.label}</span>
              {o.hint && <span className="mt-2 block font-sans text-[0.7rem] text-[#6b5a44]">{o.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
