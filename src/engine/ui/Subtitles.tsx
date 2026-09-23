"use client";
import { useEffect, useRef, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { advanceBus } from "../director/events";
import { useSettings } from "../state/settings";
import { useUi } from "../state/ui";

/** Sous-titres façon série, texte en « machine à écrire douce » ; clic = accélérer puis passer. */
export function Subtitles() {
  const sub = useUi((s) => s.subtitle);
  const enabled = useSettings((s) => s.subtitles);
  const scale = useSettings((s) => s.textScale);
  const [shown, setShown] = useState(0);
  const typing = useRef(false);

  useEffect(() => {
    if (!sub) return;
    setShown(0);
    typing.current = true;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i % 4 === 0) void audio.sfx("sfx-typewriter-soft", { volume: 0.12, rate: 0.9 + Math.random() * 0.2 });
      if (i >= sub.text.length) {
        typing.current = false;
        window.clearInterval(id);
      }
    }, 28);
    return () => window.clearInterval(id);
  }, [sub]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!useUi.getState().subtitle) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function advance() {
    if (!sub) return;
    if (typing.current) {
      typing.current = false;
      setShown(sub.text.length);
    } else advanceBus.emit();
  }

  if (!sub || !enabled) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(7vh,calc((100dvh-100vw/2.35)/2+2vh))] z-40 flex justify-center px-4">
      <button
        type="button"
        onClick={advance}
        className="pointer-events-auto max-w-[min(62rem,92vw)] cursor-pointer rounded-sm bg-black/45 px-5 py-3 text-center backdrop-blur-[2px] focus:outline-none focus-visible:ring-1 focus-visible:ring-brass"
        style={{ fontSize: `calc(clamp(1rem, 1.6vw, 1.35rem) * ${scale})` }}
        aria-live="polite"
      >
        {sub.speaker && <span className="mb-1 block font-sans text-[0.7em] uppercase tracking-[0.22em] text-brass">{sub.speaker}</span>}
        <span className="font-sans leading-snug text-ivory [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
          {sub.text.slice(0, shown)}
          <span className="opacity-0">{sub.text.slice(shown)}</span>
        </span>
      </button>
    </div>
  );
}
