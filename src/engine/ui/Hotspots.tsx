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

/**
 * Points de passage (cercles laiton au sol) et objets cliquables. Ils sont positionnés à chaque frame
 * avec la même projection que le shader, donc ils « collent » à la plate pendant la parallaxe.
 */
export function Hotspots() {
  const current = useStage((s) => s.current);
  const active = useUi((s) => s.activeHotspots);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const scene = current ? getScene(current.sceneId) : null;
  const list: HotspotDef[] = scene?.hotspots?.filter((h) => active.includes(h.id)) ?? [];
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
        const s = imageToScreen(fromAuthoring(hs.at), hs.depth, proj, cover);
        const p = screenToCss(s, w, h);
        el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
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
          onClick={() => hotspotBus.emit(hs.id)}
          onPointerEnter={() => void audio.sfx("sfx-ui-hover", { volume: 0.5 })}
          className="hotspot pointer-events-auto absolute left-0 top-0 animate-hotspot-in"
          data-kind={hs.kind}
        >
          <span className="hotspot-ring" />
          <span className="hotspot-label">{hs.label}</span>
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
