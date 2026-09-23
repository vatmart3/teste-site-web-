"use client";
/**
 * Interface du tribunal : jauges (pression sur le témoin, patience de la juge, jury), bouton OBJECTION qui
 * pulse pendant que Brandt parle (touche O), choix du motif (touches 1-4), éventail des pièces à faire glisser
 * vers le témoin (ou à choisir au clavier), tampons plein écran (CONTRADICTION, RETENUE, REJETÉE).
 */
import { useEffect, useRef, useState } from "react";
import { CROSS_EXAMINATION } from "@/content/cases/crossExamination";
import { audio } from "../audio/AudioEngine";
import { onFrame } from "../loop";
import { roomAnchors } from "../room/anchors";
import { useSettings } from "../state/settings";
import { courtBus, useCourt } from "./state";
import { GROUND_LABELS, type ObjectionGround } from "./types";

const GROUNDS: ObjectionGround[] = ["leading", "hearsay", "speculation", "argumentative"];

function Gauge({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="w-44">
      <div className="flex items-baseline justify-between text-[0.58rem] uppercase tracking-[0.25em] text-ivory/70">
        <span>
          <span aria-hidden className="mr-1">
            {icon}
          </span>
          {label}
        </span>
        <span className="tabular-nums text-ivory/90">{Math.round(value)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ivory/10" role="meter" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function Objection() {
  const open = useCourt((s) => s.objectionOpen);
  const phase = useCourt((s) => s.phase);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.key === "o" || e.key === "O") && useCourt.getState().objectionOpen) courtBus.emit({ type: "objection" });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  if (phase !== "direct") return null;
  return (
    <button
      type="button"
      disabled={!open}
      onClick={() => courtBus.emit({ type: "objection" })}
      className={`pointer-events-auto absolute bottom-[14vh] right-[3vw] rounded-sm border-2 px-6 py-3 font-serif text-xl tracking-[0.08em] transition sm:text-2xl ${
        open ? "objection-pulse border-[#e04a3a] bg-[#5a0e0c]/85 text-[#ffe2d8] hover:bg-[#7a1410]" : "border-ivory/15 bg-black/30 text-ivory/30"
      }`}
    >
      OBJECTION !<span className="ml-2 align-middle font-sans text-[0.6rem] tracking-[0.2em] opacity-70">O</span>
    </button>
  );
}

function GroundPicker() {
  const choosing = useCourt((s) => s.choosingGround);
  const noTimer = useSettings((s) => s.noTimer);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!choosing) return;
    first.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < GROUNDS.length) courtBus.emit({ type: "ground", ground: GROUNDS[i]! });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [choosing]);
  if (!choosing) return null;
  return (
    <div className="pointer-events-auto absolute bottom-[22vh] left-1/2 w-[min(40rem,94vw)] -translate-x-1/2 animate-hotspot-in rounded-sm border border-[#e04a3a]/50 bg-[#0d0a0a]/92 p-4 shadow-2xl" role="dialog" aria-label="Motif de l'objection">
      <p className="text-[0.62rem] uppercase tracking-[0.35em] text-[#f0a090]">Motif de l&apos;objection</p>
      {!noTimer && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-ivory/10">
          <div className="ground-timer h-full bg-[#e04a3a]" />
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {GROUNDS.map((g, i) => (
          <button
            key={g}
            ref={i === 0 ? first : undefined}
            type="button"
            onClick={() => courtBus.emit({ type: "ground", ground: g })}
            className="rounded-sm border border-ivory/20 px-3 py-2 text-left font-serif text-base text-ivory hover:border-brass hover:bg-brass/10 focus-visible:border-brass focus-visible:outline-none"
          >
            <span className="mr-2 font-sans text-xs text-brass/80">{i + 1}</span>
            {GROUND_LABELS[g]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Éventail de pièces : glisser une carte vers le témoin pour la lui opposer. */
function EvidenceFan() {
  const presenting = useCourt((s) => s.presenting);
  const pieces = useCourt((s) => s.pieces);
  const missing = useCourt((s) => s.missing);
  const used = useCourt((s) => s.used);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const zone = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(
    () =>
      onFrame(() => {
        const a = roomAnchors.witness;
        const el = zone.current;
        if (!el || !a) return;
        el.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -50%)`;
      }),
    [],
  );

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      const a = roomAnchors.witness;
      setNear(!!a && Math.hypot(e.clientX - a.x, e.clientY - a.y) < Math.max(90, window.innerWidth * 0.1));
    };
    const up = (e: PointerEvent) => {
      const a = roomAnchors.witness;
      const ok = !!a && Math.hypot(e.clientX - a.x, e.clientY - a.y) < Math.max(90, window.innerWidth * 0.1);
      const id = drag.id;
      setDrag(null);
      setNear(false);
      if (ok) courtBus.emit({ type: "present", piece: id });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag]);

  if (!presenting) return null;
  const all = [...pieces, ...missing];
  const n = all.length;
  const byId = new Map(CROSS_EXAMINATION.pieces.map((p) => [p.id, p]));
  return (
    <>
      <div ref={zone} className={`pointer-events-none absolute left-0 top-0 h-40 w-40 rounded-full border-2 border-dashed transition ${drag ? (near ? "scale-110 border-[#e04a3a] bg-[#e04a3a]/15" : "border-ivory/50") : "border-transparent"}`} aria-hidden />
      <div className="pointer-events-auto absolute bottom-[3vh] left-1/2 flex -translate-x-1/2 items-end" role="listbox" aria-label="Pièces du dossier">
        {all.map((id, i) => {
          const p = byId.get(id);
          if (!p) return null;
          const off = missing.includes(id);
          const rot = (i - (n - 1) / 2) * 5;
          const lift = Math.abs(i - (n - 1) / 2) * 6;
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={selected === id}
              disabled={off}
              onPointerDown={(e) => {
                if (off) return;
                e.preventDefault();
                setDrag({ id, x: e.clientX, y: e.clientY });
                void audio.sfx("sfx-paper-flip", { volume: 0.4, rate: 1.4 });
              }}
              onClick={() => !off && setSelected(id)}
              onKeyDown={(e) => {
                if (!off && e.key === "Enter") courtBus.emit({ type: "present", piece: id });
              }}
              className={`relative -mx-1 w-32 rounded-sm border p-2 text-left shadow-xl transition hover:-translate-y-3 focus-visible:-translate-y-3 focus-visible:outline-none ${
                off ? "cursor-not-allowed border-ivory/10 bg-[#2a2a2a] text-ivory/35 grayscale" : `cursor-grab border-[#b8a888] bg-[#f4efe2] text-[#231d16] ${selected === id ? "ring-2 ring-brass" : ""}`
              } ${drag?.id === id ? "opacity-30" : ""}`}
              style={{ transform: `rotate(${rot}deg) translateY(${lift}px)` }}
            >
              <p className="font-sans text-[0.55rem] uppercase tracking-[0.2em] text-[#8a2a1e]">{off ? "Non établie au tableau" : used.includes(id) ? "Déjà présentée" : "Pièce"}</p>
              <p className="mt-1 font-serif text-sm leading-tight">{p.title}</p>
              <p className="mt-1 font-serif text-xs italic opacity-80">{p.detail}</p>
            </button>
          );
        })}
      </div>
      {drag && (
        <div className="pointer-events-none fixed z-50 w-36 -translate-x-1/2 -translate-y-1/2 rotate-[-4deg] rounded-sm border border-[#b8a888] bg-[#f4efe2] p-2.5 text-[#231d16] shadow-2xl" style={{ left: drag.x, top: drag.y }}>
          <p className="font-serif text-sm leading-tight">{byId.get(drag.id)?.title}</p>
        </div>
      )}
      <div className="pointer-events-auto absolute bottom-[26vh] right-[2vw] flex flex-col items-end gap-2">
        {selected && (
          <button type="button" onClick={() => courtBus.emit({ type: "present", piece: selected })} className="rounded-full border border-[#e04a3a] bg-[#5a0e0c]/80 px-5 py-2 text-[0.7rem] uppercase tracking-[0.3em] text-[#ffe2d8] hover:bg-[#7a1410]">
            Présenter la pièce
          </button>
        )}
        <button type="button" onClick={() => courtBus.emit({ type: "pass" })} className="rounded-full border border-ivory/30 px-5 py-2 text-[0.7rem] uppercase tracking-[0.3em] text-ivory/80 hover:border-ivory/60">
          Continuer sans pièce
        </button>
      </div>
    </>
  );
}

function Stamp() {
  const stamp = useCourt((s) => s.stamp);
  if (!stamp) return null;
  const color = stamp.tone === "red" ? "#d8231c" : stamp.tone === "brass" ? "#e7c878" : "#b9b4aa";
  return (
    <div key={stamp.id} className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-live="assertive">
      <p className="court-stamp rounded-md border-[6px] px-8 py-3 font-serif text-5xl font-bold tracking-[0.12em] sm:text-7xl" style={{ color, borderColor: color }}>
        {stamp.text}
      </p>
    </div>
  );
}

export function CourtOverlay() {
  const hud = useCourt((s) => s.hud);
  const g = useCourt((s) => s.gauges);
  if (!hud) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[38] font-sans text-ivory">
      <div className="absolute left-[2vw] top-[3vh] grid gap-2 rounded-sm bg-[#07080b]/60 px-3 py-2 backdrop-blur-[2px]">
        <Gauge label="Pression" value={g.pressure} color="linear-gradient(90deg,#7a1410,#e04a3a)" icon="◆" />
        <Gauge label="Patience de la juge" value={g.patience} color="linear-gradient(90deg,#8a6a26,#e7c878)" icon="⚖" />
        <Gauge label="Jury" value={g.jury} color="linear-gradient(90deg,#2a4a6a,#7fb0e0)" icon="●" />
      </div>
      <Objection />
      <GroundPicker />
      <EvidenceFan />
      <Stamp />
    </div>
  );
}
