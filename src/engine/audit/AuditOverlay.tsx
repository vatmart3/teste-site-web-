"use client";
/** Interface de l'audit : outils, heure du jeu, mémo, atouts, pages, liste accessible des lignes. */
import { useEffect, useMemo, useState } from "react";
import { PERKS } from "@/content/perks";
import { audio } from "../audio/AudioEngine";
import { onFrame } from "../loop";
import { useProfile } from "../state/profile";
import { useSettings } from "../state/settings";
import { useUi } from "../state/ui";
import { docLines, pageCache } from "./docRenderer";
import { inkBox, marksFor } from "./marks";
import { latestMarks } from "./scoring";
import { auditBus, formatGameTime, useAudit, type AuditTool } from "./state";

const TOOLS: { id: AuditTool; label: string; key: string; icon: string }[] = [
  { id: "hand", label: "Main", key: "M", icon: "M8 13V5a1.5 1.5 0 013 0v6m0-1V4a1.5 1.5 0 013 0v6m0-1V6a1.5 1.5 0 013 0v7a7 7 0 01-7 7h-1a6 6 0 01-5-3l-2.5-4a1.5 1.5 0 012.5-1.6L8 13" },
  { id: "highlighter", label: "Surligneur", key: "S", icon: "M4 20h6M14.5 4.5l5 5L10 19H5v-5z" },
  { id: "loupe", label: "Loupe", key: "L", icon: "M10.5 17a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM15.5 15.5L21 21" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Horloge du jeu : avance tant que l'audit tourne (sauf option « sans chrono » et panneaux ouverts). */
function useGameClock() {
  const noTimer = useSettings((s) => s.noTimer);
  useEffect(
    () =>
      onFrame((dt) => {
        const st = useAudit.getState();
        if (!st.active || !st.running || !st.def || noTimer) return;
        if (useUi.getState().panel) return;
        const rate = (st.def.deadlineMinutes - st.def.startMinutes) / st.def.realSeconds;
        const m = st.minutes + dt * rate;
        if (m >= st.deadline) {
          st.set({ minutes: st.deadline, running: false });
          auditBus.emit({ type: "timeup" });
        } else st.set({ minutes: m });
      }),
    [noTimer],
  );
}

function Clock() {
  const minutes = useAudit((s) => Math.floor(s.minutes));
  const deadline = useAudit((s) => s.deadline);
  const noTimer = useSettings((s) => s.noTimer);
  const left = deadline - minutes;
  const urgent = !noTimer && left <= 60;
  return (
    <div className={`rounded-md border px-3 py-2 font-sans ${urgent ? "border-[#d9534f]/70 bg-[#2a0d0d]/80" : "border-brass/30 bg-black/55"} backdrop-blur-sm`} role="timer" aria-label={`Heure : ${formatGameTime(minutes)}`}>
      <p className="text-[0.58rem] uppercase tracking-[0.3em] text-ivory/55">{noTimer ? "Sans chrono" : "Rendu à 8 h 00"}</p>
      <p className={`font-serif text-2xl tabular-nums ${urgent ? "text-[#ff8a80]" : "text-ivory"}`}>{formatGameTime(minutes)}</p>
    </div>
  );
}

function Memo() {
  const def = useAudit((s) => s.def);
  const marks = useAudit((s) => s.marks);
  const [open, setOpen] = useState(true);
  const active = useMemo(() => latestMarks(marks), [marks]);
  const texts = useMemo(() => {
    const t: Record<string, string> = {};
    for (const d of def?.docs ?? []) for (const l of docLines(d)) t[l.id] = l.text;
    return t;
  }, [def]);
  if (!def) return null;
  return (
    <aside className="paper w-[min(19rem,80vw)] rotate-[0.6deg] px-4 py-3 text-[#2a2118]" aria-label="Mémo pour Harlow">
      <button type="button" className="flex w-full items-baseline justify-between" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="font-serif text-lg">Mémo — Meridian</span>
        <span className="font-sans text-xs text-[#6b5a44]">{active.length} constat{active.length > 1 ? "s" : ""}</span>
      </button>
      {open && (
        <>
          <ol className="mt-2 max-h-[34vh] space-y-2 overflow-y-auto pr-1">
            {active.length === 0 && <li className="font-serif text-sm italic text-[#6b5a44]">Surlignez une ligne suspecte, puis dites ce qui cloche.</li>}
            {active.map((m) => {
              const a = def.anomalies.find((x) => x.id === m.category);
              return (
                <li key={m.lineId} className="border-l-2 border-[#e9cf45] pl-2">
                  <p className="font-sans text-[0.62rem] uppercase tracking-[0.18em] text-[#8a6a26]">{a?.label ?? "?"}</p>
                  <p className="line-clamp-2 font-serif text-[0.82rem] leading-snug">{texts[m.lineId]}</p>
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={() => auditBus.emit({ type: "submit" })}
            className="mt-3 w-full rounded-sm bg-[#16223a] px-3 py-2 font-sans text-[0.68rem] uppercase tracking-[0.22em] text-[#e7c878] hover:bg-[#0b1426]"
          >
            Rendre le mémo à Harlow
          </button>
        </>
      )}
    </aside>
  );
}

function Perks() {
  const perks = useProfile((s) => s.perks);
  const list = PERKS.filter((p) => p.id === "all-nighter" || p.id === "expert");
  return (
    <div className="flex gap-2" role="group" aria-label="Atouts">
      {list.map((p) => {
        const n = perks[p.id] ?? 0;
        return (
          <button
            key={p.id}
            type="button"
            disabled={n <= 0}
            title={p.effect}
            onClick={() => auditBus.emit({ type: "perk", id: p.id as "all-nighter" | "expert" })}
            className="rounded-md border border-brass/40 bg-black/55 px-3 py-1.5 text-left font-sans text-[0.7rem] text-ivory backdrop-blur-sm transition enabled:hover:border-brass disabled:opacity-40"
          >
            <span className="block text-brass-light">
              {p.name} ×{n}
            </span>
            <span className="block text-[0.6rem] text-ivory/60">{p.id === "all-nighter" ? "+30 s de chrono" : "révèle une anomalie"}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Liste des lignes du document tenu : surligner au clavier / au doigt, et lecture par lecteur d'écran. */
function LinesList({ onClose }: { onClose: () => void }) {
  const def = useAudit((s) => s.def);
  const reading = useAudit((s) => s.reading);
  const variantKey = useAudit((s) => s.variantKey);
  const page = useAudit((s) => (reading ? (s.pages[reading] ?? 0) : 0));
  const doc = def?.docs.find((d) => d.id === reading);
  if (!doc) return null;
  const lines = docLines(doc).filter((l) => l.page === page);
  return (
    <div className="hub-panel max-h-[50vh] w-[min(26rem,90vw)] overflow-y-auto rounded-md p-3 font-sans text-ivory" role="dialog" aria-label="Lignes du document">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[0.62rem] uppercase tracking-[0.3em] text-brass/80">Lignes de la page</p>
        <button type="button" onClick={onClose} className="text-xs text-ivory/60 hover:text-ivory">
          Fermer
        </button>
      </div>
      <ul className="space-y-1">
        {lines.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              className="w-full rounded px-2 py-1.5 text-left text-[0.8rem] leading-snug hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
              onClick={() => {
                const r = pageCache(doc, page, variantKey);
                const b = r.boxes[l.id];
                if (b) inkBox(marksFor(doc.id, page, r.canvas.height / r.canvas.width), b);
                void audio.sfx("sfx-highlighter", { volume: 0.35 });
                auditBus.emit({ type: "highlight", docId: doc.id, lineId: l.id });
              }}
            >
              {l.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Toolbar() {
  const tool = useAudit((s) => s.tool);
  const reading = useAudit((s) => s.reading);
  const def = useAudit((s) => s.def);
  const page = useAudit((s) => (reading ? (s.pages[reading] ?? 0) : 0));
  const zoom = useAudit((s) => s.zoom);
  const [list, setList] = useState(false);
  const doc = def?.docs.find((d) => d.id === reading);
  const pages = doc?.pages.length ?? 1;
  const setPage = (p: number) => {
    if (!reading) return;
    const st = useAudit.getState();
    st.set({ pages: { ...st.pages, [reading]: Math.max(0, Math.min(pages - 1, p)) } });
    void audio.sfx("sfx-paper-flip", { volume: 0.7 });
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (useUi.getState().panel || (e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      if (k === "m") useAudit.getState().set({ tool: "hand" });
      if (k === "s") useAudit.getState().set({ tool: "highlighter" });
      if (k === "l") useAudit.getState().set({ tool: "loupe" });
      if (e.key === "Escape") useAudit.getState().set({ reading: null, zoom: 1 });
      if (e.key === "ArrowRight") setPage(page + 1);
      if (e.key === "ArrowLeft") setPage(page - 1);
      if (e.key === "+" || e.key === "=") useAudit.getState().set({ zoom: Math.min(2.4, useAudit.getState().zoom * 1.2) });
      if (e.key === "-") useAudit.getState().set({ zoom: Math.max(1, useAudit.getState().zoom / 1.2) });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const btn = "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-[0.7rem] uppercase tracking-[0.15em] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass";
  return (
    <div className="flex flex-col items-center gap-2">
      {list && <LinesList onClose={() => setList(false)} />}
      <div className="flex flex-wrap items-center justify-center gap-1 rounded-full border border-brass/30 bg-black/60 p-1 text-ivory backdrop-blur-sm" role="toolbar" aria-label="Outils">
        {TOOLS.map((t) => (
          <button key={t.id} type="button" aria-pressed={tool === t.id} onClick={() => useAudit.getState().set({ tool: t.id })} className={`${btn} ${tool === t.id ? "bg-brass text-navy" : "hover:bg-white/10"}`}>
            <Icon d={t.icon} />
            {t.label}
            <kbd className="ml-0.5 text-[0.6rem] opacity-60">{t.key}</kbd>
          </button>
        ))}
        {reading && (
          <>
            <span className="mx-1 h-5 w-px bg-ivory/20" aria-hidden />
            {pages > 1 && (
              <>
                <button type="button" className={`${btn} hover:bg-white/10`} onClick={() => setPage(page - 1)} disabled={page === 0} aria-label="Page précédente">
                  ‹
                </button>
                <span className="font-sans text-xs tabular-nums text-ivory/70">
                  {page + 1}/{pages}
                </span>
                <button type="button" className={`${btn} hover:bg-white/10`} onClick={() => setPage(page + 1)} disabled={page >= pages - 1} aria-label="Page suivante">
                  ›
                </button>
              </>
            )}
            <button type="button" className={`${btn} hover:bg-white/10`} onClick={() => useAudit.getState().set({ zoom: zoom > 1.2 ? 1 : 1.9 })} aria-label="Zoom">
              {zoom > 1.2 ? "Dézoomer" : "Zoomer"}
            </button>
            <button type="button" className={`${btn} hover:bg-white/10`} onClick={() => setList((v) => !v)} aria-expanded={list}>
              Lignes
            </button>
            <button type="button" className={`${btn} hover:bg-white/10`} onClick={() => useAudit.getState().set({ reading: null, zoom: 1 })}>
              Reposer <kbd className="text-[0.6rem] opacity-60">Échap</kbd>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function AuditOverlay() {
  const active = useAudit((s) => s.active);
  const running = useAudit((s) => s.running);
  useGameClock();
  if (!active || !running) return null;
  return (
    <>
      <div className="pointer-events-none fixed left-4 top-4 z-40 flex flex-col gap-2">
        <div className="pointer-events-auto">
          <Clock />
        </div>
        <div className="pointer-events-auto">
          <Perks />
        </div>
      </div>
      <div className="fixed right-4 top-16 z-40">
        <Memo />
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-[3vh] z-40 flex justify-center px-2">
        <div className="pointer-events-auto">
          <Toolbar />
        </div>
      </div>
    </>
  );
}
