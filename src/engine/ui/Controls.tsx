"use client";
import { useState } from "react";
import { skipBus } from "../director/events";
import { useSettings, type MotionSetting, type QualitySetting } from "../state/settings";
import { useUi } from "../state/ui";

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm">
      <span className="text-ivory/80">{label}</span>
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-36 accent-brass" />
    </label>
  );
}

/** Bouton muet toujours visible, réglages, et « Passer » pendant les cinématiques. */
export function Controls() {
  const s = useSettings();
  const skippable = useUi((u) => u.skippable);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed right-4 top-4 z-50 flex gap-2">
        <button type="button" className="icon-btn" aria-label={s.muted ? "Activer le son" : "Couper le son"} onClick={() => s.set({ muted: !s.muted })}>
          {s.muted ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l4 6M21 9l-4 6" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /></svg>
          )}
        </button>
        <button type="button" className="icon-btn" aria-label="Réglages" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
        </button>
      </div>

      {open && (
        <div role="dialog" aria-label="Réglages" className="fixed right-4 top-16 z-50 w-80 space-y-3 rounded-md border border-brass/30 bg-navy/90 p-5 font-sans text-ivory shadow-2xl backdrop-blur">
          <h2 className="font-serif text-lg text-brass">Réglages</h2>
          <Slider label="Général" value={s.master} onChange={(v) => s.set({ master: v })} />
          <Slider label="Musique" value={s.music} onChange={(v) => s.set({ music: v })} />
          <Slider label="Voix" value={s.voice} onChange={(v) => s.set({ voice: v })} />
          <Slider label="Effets" value={s.sfx} onChange={(v) => s.set({ sfx: v })} />
          <label className="flex items-center justify-between text-sm">
            <span className="text-ivory/80">Sous-titres</span>
            <input type="checkbox" checked={s.subtitles} onChange={(e) => s.set({ subtitles: e.target.checked })} className="accent-brass" />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span className="text-ivory/80">Taille du texte</span>
            <input type="range" min={0.8} max={1.6} step={0.1} value={s.textScale} onChange={(e) => s.set({ textScale: Number(e.target.value) })} className="w-36 accent-brass" />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span className="text-ivory/80">Mouvements</span>
            <select value={s.motion} onChange={(e) => s.set({ motion: e.target.value as MotionSetting })} className="rounded bg-black/40 px-2 py-1">
              <option value="auto">Auto (système)</option>
              <option value="full">Complets</option>
              <option value="reduced">Réduits</option>
            </select>
          </label>
          <label className="flex items-center justify-between text-sm">
            <span className="text-ivory/80">Qualité</span>
            <select value={s.quality} onChange={(e) => s.set({ quality: e.target.value as QualitySetting })} className="rounded bg-black/40 px-2 py-1">
              <option value="auto">Auto</option>
              <option value="high">Cinéma</option>
              <option value="medium">Équilibrée</option>
              <option value="css">Légère (sans WebGL)</option>
            </select>
          </label>
          <label className="flex items-center justify-between text-sm">
            <span className="text-ivory/80">Voix de synthèse</span>
            <input type="checkbox" checked={s.tts} onChange={(e) => s.set({ tts: e.target.checked })} className="accent-brass" />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span className="text-ivory/80">Sans chrono</span>
            <input type="checkbox" checked={s.noTimer} onChange={(e) => s.set({ noTimer: e.target.checked })} className="accent-brass" />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span className="text-ivory/80">Gyroscope (mobile)</span>
            <input type="checkbox" checked={s.gyro} onChange={(e) => s.set({ gyro: e.target.checked })} className="accent-brass" />
          </label>
        </div>
      )}

      {skippable && (
        <button type="button" onClick={() => skipBus.emit()} className="fixed bottom-4 right-4 z-50 font-sans text-xs uppercase tracking-[0.3em] text-ivory/60 transition hover:text-brass focus-visible:text-brass">
          Passer ›
        </button>
      )}
    </>
  );
}
