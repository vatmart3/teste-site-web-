"use client";
/** Surcouche HTML du bureau : vue ouverte, boutons clavier des objets 3D, vie du bureau (notifications). */
import { useEffect, useRef } from "react";
import { audio } from "../audio/AudioEngine";
import { onFrame } from "../loop";
import { propAnchors } from "../props/model";
import { useUi } from "../state/ui";
import { useRender } from "../state/render";
import { HUB_OBJECTS, hubBus, useHub, type HubView } from "./state";
import { BriefcaseView } from "./views/BriefcaseView";
import { CasesView } from "./views/CasesView";
import { DoorView } from "./views/DoorView";
import { LibraryView } from "./views/LibraryView";
import { PhoneView } from "./views/PhoneView";
import { TerminalView } from "./views/TerminalView";

const NOTIFICATIONS = [
  { from: "Theo Park", text: "La photocopieuse du 52 est encore en panne. Celle du 51 marche. Je dis ça…" },
  { from: "Nora Ellis", text: "Livraison de sushis à la réception pour le pôle contentieux. Premier arrivé…" },
  { from: "Service informatique", text: "Rappel : changez votre mot de passe. « Harlow123 » n'est pas accepté." },
  { from: "Grant Mercer", text: "Toujours là ? Moi aussi. Ne le prends pas mal." },
  { from: "Comptabilité", text: "Merci de saisir vos heures avant vendredi 18 h. Par tranches de 6 minutes." },
];

const OBJECTS_3D: HubView[] = ["cases", "phone", "briefcase"];
const ROOM_OBJECTS: HubView[] = ["library", "board", "terminal", "door"];

function A11yButtons() {
  const room = useRender((s) => s.room);
  const list = room ? [...OBJECTS_3D, ...ROOM_OBJECTS] : OBJECTS_3D;
  const refs = useRef(new Map<HubView, HTMLButtonElement>());
  useEffect(
    () =>
      onFrame(() => {
        for (const v of [...OBJECTS_3D, ...ROOM_OBJECTS]) {
          const el = refs.current.get(v);
          const a = propAnchors[v];
          if (el && a) el.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -50%)`;
        }
      }),
    [],
  );
  return (
    <>
      {list.map((v) => (
        <button
          key={v}
          ref={(n) => {
            if (n) refs.current.set(v, n);
          }}
          type="button"
          onClick={() => hubBus.emit({ type: "open", view: v })}
          className="a11y-object fixed left-0 top-0 z-20 rounded-full border border-brass bg-black/60 px-3 py-1 font-sans text-xs text-ivory"
        >
          {HUB_OBJECTS[v]}
        </button>
      ))}
    </>
  );
}

function useOfficeLife() {
  const active = useHub((s) => s.active && !s.view && !s.moving);
  useEffect(() => {
    if (!active) return;
    let t: number;
    const schedule = () => {
      t = window.setTimeout(
        () => {
          const n = NOTIFICATIONS[Math.floor(Math.random() * NOTIFICATIONS.length)]!;
          useHub.getState().set({ notification: { ...n, id: Date.now() } });
          void audio.sfx("sfx-notification", { at: { x: 0.65, y: 0.4 }, depth: 0.55, volume: 0.7 });
          window.setTimeout(() => useHub.getState().set({ notification: null }), 6500);
          schedule();
        },
        25000 + Math.random() * 40000,
      );
    };
    schedule();
    return () => window.clearTimeout(t);
  }, [active]);
}

export function HubOverlay() {
  const active = useHub((s) => s.active);
  const view = useHub((s) => s.view);
  const moving = useHub((s) => s.moving);
  const css = useUi((s) => s.quality === "css");
  useOfficeLife();
  if (!active) return null;
  return (
    <>
      {!view && !moving && !css && <A11yButtons />}
      {!view && !moving && css && (
        // Rendu léger sans WebGL : les objets du bureau deviennent des boutons visibles.
        <div className="fixed inset-x-0 bottom-[6vh] z-20 flex justify-center gap-2">
          {OBJECTS_3D.map((v) => (
            <button key={v} type="button" onClick={() => hubBus.emit({ type: "open", view: v })} className="rounded-full border border-brass/60 bg-black/60 px-4 py-2 font-sans text-xs uppercase tracking-[0.2em] text-ivory hover:border-brass">
              {HUB_OBJECTS[v]}
            </button>
          ))}
        </div>
      )}
      {view === "cases" && <CasesView />}
      {view === "phone" && <PhoneView />}
      {view === "terminal" && <TerminalView />}
      {view === "briefcase" && <BriefcaseView />}
      {view === "library" && <LibraryView />}
      {view === "door" && <DoorView />}
    </>
  );
}
