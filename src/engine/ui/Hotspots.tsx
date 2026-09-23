"use client";
import { useEffect, useMemo, useRef } from "react";
import { getScene } from "@/content/scenes";
import type { HotspotDef } from "@/content/types";
import { audio } from "../audio/AudioEngine";
import { rig } from "../camera/rig";
import { hotspotBus } from "../director/events";
import { onFrame } from "../loop";
import { fromAuthoring, imageToScreen, screenToCss } from "../plate/projection";
import { viewParams } from "../plate/view";
import { useStage } from "../state/stage";
import { useUi } from "../state/ui";
import { PROP_LABELS, propAnchors } from "../props/model";
import { hubBus, useHub, type HubView } from "../hub/state";
import { useRender } from "../state/render";
import { roomAnchors } from "../room/anchors";

/** Zones du décor du bureau → vue ouverte. */
const REGION_VIEW: Record<string, HubView> = { shelf: "library", board: "board", terminal: "terminal", door: "door" };

/**
 * Points de passage (cercles laiton au sol) et objets cliquables. Ils sont positionnés à chaque frame
 * avec la même projection que le shader, donc ils « collent » à la plate pendant la parallaxe.
 */
export function Hotspots() {
  const current = useStage((s) => s.current);
  const active = useUi((s) => s.activeHotspots);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const scene = current ? getScene(current.sceneId) : null;
  const hubOpen = useHub((s) => s.active && !s.view && !s.moving);
  // Dans la pièce 3D, les zones du décor sont des objets 3D (RoomZone), pas des zones HTML.
  const room3d = useRender((s) => s.room);
  const list: HotspotDef[] = scene?.hotspots?.filter((h) => active.includes(h.id) || (hubOpen && !room3d && h.kind === "region" && REGION_VIEW[h.id])) ?? [];
  // Hotspots accrochés aux accessoires 3D (« prop:folder »…).
  const propList = useMemo(() => active.filter((id) => id.startsWith("prop:")), [active]);

  useEffect(
    () =>
      onFrame(() => {
        for (const id of propList) {
          const el = refs.current.get(id);
          const a = propAnchors[id.slice(5)];
          if (!el || !a) continue;
          el.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -50%)`;
          el.style.visibility = a.visible ? "visible" : "hidden";
        }
      }),
    [propList],
  );

  useEffect(() => {
    if (!scene) return;
    return onFrame(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const { cover, proj } = viewParams(scene, rig, w, h);
      for (const hs of scene.hotspots ?? []) {
        const el = refs.current.get(hs.id);
        if (!el) continue;
        // Pièce 3D : le point de passage est accroché au décor modélisé.
        const ra = roomAnchors[hs.id];
        if (ra) {
          el.style.transform = `translate(${ra.x}px, ${ra.y}px) translate(-50%, -50%)`;
          el.style.visibility = ra.visible ? "visible" : "hidden";
          continue;
        }
        el.style.visibility = "";
        const s = imageToScreen(fromAuthoring(hs.at), hs.depth, proj, cover);
        const p = screenToCss(s, w, h);
        el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
        if (hs.kind === "region" && hs.size) {
          const a = screenToCss(imageToScreen(fromAuthoring({ x: hs.at.x - hs.size.x / 2, y: hs.at.y - hs.size.y / 2 }), hs.depth, proj, cover), w, h);
          const b = screenToCss(imageToScreen(fromAuthoring({ x: hs.at.x + hs.size.x / 2, y: hs.at.y + hs.size.y / 2 }), hs.depth, proj, cover), w, h);
          el.style.width = `${Math.abs(b.x - a.x)}px`;
          el.style.height = `${Math.abs(b.y - a.y)}px`;
        }
      }
    });
  }, [scene]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {list.map((hs) => (
        <button
          key={hs.id}
          ref={(n) => {
            if (n) refs.current.set(hs.id, n);
            else refs.current.delete(hs.id);
          }}
          type="button"
          aria-label={hs.label}
          onClick={() => (hs.kind === "region" && REGION_VIEW[hs.id] && !active.includes(hs.id) ? hubBus.emit({ type: "open", view: REGION_VIEW[hs.id]! }) : hotspotBus.emit(hs.id))}
          onPointerEnter={() => void audio.sfx("sfx-ui-hover", { volume: 0.5 })}
          className={`${hs.kind === "region" ? "region" : "hotspot animate-hotspot-in"} pointer-events-auto absolute left-0 top-0`}
          data-kind={hs.kind}
        >
          {hs.kind !== "region" && <span className="hotspot-ring" />}
          <span className={hs.kind === "region" ? "region-label" : "hotspot-label"}>{hs.label}</span>
        </button>
      ))}
      {propList.map((id) => (
        <button
          key={id}
          ref={(n) => {
            if (n) refs.current.set(id, n);
            else refs.current.delete(id);
          }}
          type="button"
          aria-label={PROP_LABELS[id] ?? id}
          onClick={() => hotspotBus.emit(id)}
          onPointerEnter={() => void audio.sfx("sfx-ui-hover", { volume: 0.5 })}
          className="hotspot pointer-events-auto absolute left-0 top-0 animate-hotspot-in"
          data-kind="object"
        >
          <span className="hotspot-ring" />
          <span className="hotspot-label">{PROP_LABELS[id] ?? id}</span>
        </button>
      ))}
    </div>
  );
}
