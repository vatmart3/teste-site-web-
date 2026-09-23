"use client";
/**
 * Éléments d'interface accrochés au décor : compteur d'étages mécanique de l'ascenseur,
 * horloge murale à l'heure de New York, voyant du lecteur de badge.
 */
import { useEffect, useRef, useState } from "react";
import { getScene } from "@/content/scenes";
import type { AnchorDef } from "@/content/types";
import { clockHands, newYorkTime } from "@/lib/time";
import { rig } from "../camera/rig";
import { onFrame } from "../loop";
import { coverScale, fromAuthoring, imageToScreen, screenToCss } from "../plate/projection";
import { viewParams } from "../plate/view";
import { useStage } from "../state/stage";
import { useHub } from "../hub/state";
import { useRender } from "../state/render";
import { propAnchors } from "../props/model";
import { roomAnchors } from "../room/anchors";

/** Éléments HTML conservés dans les pièces 3D (les autres sont modélisés : voyant du lecteur, horloge). */
const ROOM_ANCHORED = new Set<AnchorDef["kind"]>(["floor-counter"]);

/** État mutable des éléments accrochés (animé par le directeur). */
export const anchorState = { floor: 1, reader: "idle" as "idle" | "ok" | "denied" };

function Odometer() {
  const units = useRef<HTMLDivElement>(null);
  const tens = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onFrame(() => {
        const f = Math.max(0, anchorState.floor);
        const u = f % 10;
        const t = Math.floor(f / 10) + Math.max(0, u - 9);
        if (units.current) units.current.style.transform = `translateY(${-u}em)`;
        if (tens.current) tens.current.style.transform = `translateY(${-(t % 10)}em)`;
      }),
    [],
  );
  const wheel = (ref: React.RefObject<HTMLDivElement | null>) => (
    <div className="odometer-window">
      <div ref={ref} className="odometer-strip">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
    </div>
  );
  return (
    <div className="flex gap-[0.08em] rounded-[0.15em] bg-[#0b0906] p-[0.08em] shadow-[inset_0_0_0.2em_#000]" aria-label="Étage">
      {wheel(tens)}
      {wheel(units)}
    </div>
  );
}

function WallClock() {
  const [t, setT] = useState(() => newYorkTime());
  useEffect(() => {
    const id = window.setInterval(() => setT(newYorkTime()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const h = clockHands(t);
  return (
    <svg viewBox="-50 -50 100 100" className="h-full w-full drop-shadow-[0_0.3em_0.4em_rgba(0,0,0,0.6)]" role="img" aria-label={`Heure de New York : ${t.label}`}>
      <circle r="47" fill="#f1ece0" stroke="#1a1a1a" strokeWidth="4" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="0" y1="-40" x2="0" y2={i % 3 ? "-36" : "-33"} stroke="#222" strokeWidth={i % 3 ? 1.5 : 3} transform={`rotate(${i * 30})`} />
      ))}
      <text y="18" textAnchor="middle" fontSize="7" fontFamily="Georgia, serif" fill="#555">
        NEW YORK
      </text>
      <line y2="-22" stroke="#111" strokeWidth="4" strokeLinecap="round" transform={`rotate(${h.hour})`} />
      <line y2="-34" stroke="#111" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${h.minute})`} />
      <line y1="8" y2="-36" stroke="#b01818" strokeWidth="1" transform={`rotate(${h.second})`} />
      <circle r="2.5" fill="#b01818" />
    </svg>
  );
}

function ReaderLight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onFrame(() => {
        const el = ref.current;
        if (!el) return;
        const s = anchorState.reader;
        el.dataset.state = s;
      }),
    [],
  );
  return <div ref={ref} className="reader-light h-full w-full rounded-full" data-state="idle" />;
}

/** Notification du chat interne qui fait « vibrer » l'écran de l'ordinateur. */
function Notification() {
  const n = useHub((s) => s.notification);
  if (!n) return null;
  return (
    <div key={n.id} className="notify-bubble pointer-events-none absolute left-1/2 top-0 w-[17em] -translate-x-1/2 rounded-md border border-[#2a4a7a] bg-[#0a1b36]/95 px-[0.8em] py-[0.6em] font-sans text-[0.55em] text-[#cfe0ff] shadow-[0_0_30px_rgba(60,120,255,0.4)]" role="status">
      <p className="text-[0.85em] uppercase tracking-[0.2em] text-[#7f9fd0]">H&amp;V Chat · {n.from}</p>
      <p className="mt-[0.3em] leading-snug">{n.text}</p>
    </div>
  );
}

function AnchorView({ a }: { a: AnchorDef }) {
  switch (a.kind) {
    case "floor-counter":
      return <Odometer />;
    case "wall-clock":
    case "desk-clock":
      return <WallClock />;
    case "reader-light":
      return <ReaderLight />;
    case "notification":
      return <Notification />;
  }
}

/** Dans la pièce 3D : la notification du chat s'accroche à l'écran 3D. */
function RoomNotification() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onFrame(() => {
        const a = propAnchors.terminal;
        const el = ref.current;
        if (!a || !el) return;
        el.style.transform = `translate(${a.x}px, ${a.y - window.innerHeight * 0.12}px) translate(-50%, -50%)`;
        el.style.fontSize = `${window.innerHeight * 0.03}px`;
      }),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[15]">
      <div ref={ref} className="absolute left-0 top-0">
        <Notification />
      </div>
    </div>
  );
}

export function Anchors() {
  const current = useStage((s) => s.current);
  const room = useRender((s) => s.room);
  const scene = current ? getScene(current.sceneId) : null;
  const refs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!scene) return;
    return onFrame(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const { cover, proj } = viewParams(scene, rig, w, h);
      for (const a of scene.anchors ?? []) {
        const el = refs.current.get(a.id);
        if (!el) continue;
        const ra = roomAnchors[a.id];
        if (ra) {
          el.style.transform = `translate(${ra.x}px, ${ra.y}px) translate(-50%, -50%)`;
          el.style.fontSize = `${a.size * h * 0.55}px`;
          el.style.opacity = String(ra.visible ? rig.exposure : 0);
          continue;
        }
        let s;
        if (a.locked) {
          const sc = coverScale(w / h, 16 / 9);
          const p = fromAuthoring(a.at);
          s = { x: (p.x - 0.5) / sc.x + 0.5, y: (p.y - 0.5) / sc.y + 0.5 };
        } else s = imageToScreen(fromAuthoring(a.at), a.depth, proj, cover);
        const p = screenToCss(s, w, h);
        el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
        el.style.fontSize = `${a.size * h}px`;
        el.style.opacity = String(rig.exposure);
      }
    });
  }, [scene]);

  if (room?.startsWith("office-")) return <RoomNotification />;
  // Dans les autres pièces 3D, seuls les éléments accrochés à un point du décor restent (compteur d'étages).
  const list = room ? (scene?.anchors ?? []).filter((a) => ROOM_ANCHORED.has(a.kind)) : scene?.anchors;
  if (!list?.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[15]">
      {list.map((a) => (
        <div
          key={`${current?.key}-${a.id}`}
          ref={(n) => {
            if (n) refs.current.set(a.id, n);
            else refs.current.delete(a.id);
          }}
          className="absolute left-0 top-0"
          style={a.kind === "floor-counter" || a.kind === "notification" ? { opacity: 0 } : { width: "1em", height: "1em", opacity: 0 }}
        >
          <AnchorView a={a} />
        </div>
      ))}
    </div>
  );
}
