"use client";
/**
 * Fallback sans WebGL2 / appareil faible : mêmes plates (et vidéos) en parallaxe CSS,
 * calques détourés décalés selon leur profondeur, sans post-traitement.
 */
import { useEffect, useRef, useState } from "react";
import { getScene } from "@/content/scenes";
import { rig } from "./camera/rig";
import { onFrame } from "./loop";
import { useStage, type PlateInstance } from "./state/stage";
import { loadPlateTextures, type PlateTextures } from "./plate/textures";
import { registerPlate, unregisterPlate } from "./plate/registry";
import { viewParams } from "./plate/view";

function CssPlate({ inst, z }: { inst: PlateInstance; z: number }) {
  const scene = getScene(inst.sceneId);
  const [tex, setTex] = useState<PlateTextures | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const layers = useRef<(HTMLImageElement | null)[]>([]);
  // Mêmes « uniforms » que la version WebGL, pour que le directeur anime les transitions à l'identique.
  const uniforms = useRef({ uOpacity: { value: inst.transition === "cut" ? 1 : 0 }, uReveal: { value: inst.transition === "depth" ? 0 : 1 } });

  useEffect(() => {
    let alive = true;
    loadPlateTextures(scene, inst.variant).then((t) => alive && setTex(t));
    return () => {
      alive = false;
    };
  }, [scene, inst.variant]);

  useEffect(() => {
    if (!tex) return;
    if (inst.transition === "fade") uniforms.current.uOpacity.value = 0;
    else uniforms.current.uOpacity.value = 1;
    registerPlate(inst.key, { uniforms: uniforms.current });
    return () => unregisterPlate(inst.key);
  }, [tex, inst.key, inst.transition]);

  useEffect(
    () =>
      onFrame(() => {
        const el = root.current;
        const b = base.current;
        if (!el || !b) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const { cover, proj } = viewParams(scene, rig, w, h);
        const u = uniforms.current;
        el.style.opacity = String(u.uOpacity.value * Math.min(1, u.uReveal.value * 1.2));
        el.style.filter = `brightness(${rig.exposure})`;
        // Montée d'ascenseur : le décor descend (approximation sans profondeur).
        b.style.marginTop = `${rig.lift * h * 0.9}px`;
        // Taille de l'image affichée (cover + overscan) en px.
        const iw = w / cover.scale.x;
        const ih = h / cover.scale.y;
        const place = (node: HTMLElement, depth: number) => {
          const s = 1 + proj.dolly * (0.35 + 0.65 * depth);
          const dx = -(cover.pan.x + proj.offset.x * (depth - proj.pivot)) * iw * s;
          const dy = (cover.pan.y + proj.offset.y * (depth - proj.pivot)) * ih * s;
          const ox = (proj.dollyCenter.x - 0.5) * iw;
          const oy = (0.5 - proj.dollyCenter.y) * ih;
          node.style.width = `${iw}px`;
          node.style.height = `${ih}px`;
          node.style.transformOrigin = `calc(50% + ${ox}px) calc(50% + ${oy}px)`;
          node.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(${-cover.roll}rad) scale(${s})`;
        };
        place(b, scene.pivot);
        (scene.layers ?? []).forEach((l, i) => {
          const n = layers.current[i];
          if (!n) return;
          if (l.locked) {
            // Calque attaché à la caméra (cabine) : 16:9 plein écran, sans panoramique.
            const ar = w / h;
            n.style.width = `${ar > 16 / 9 ? w : (h * 16) / 9}px`;
            n.style.height = `${ar > 16 / 9 ? (w * 9) / 16 : h}px`;
            n.style.transform = "translate(-50%, -50%)";
          } else place(n, l.depth);
        });
      }),
    [scene],
  );

  if (!tex) return null;
  return (
    <div ref={root} className="absolute inset-0 overflow-hidden" style={{ zIndex: z, opacity: 0 }}>
      <div ref={base} className="absolute left-1/2 top-1/2 will-change-transform">
        {tex.css.video ? (
          <video className="h-full w-full object-cover" autoPlay muted loop playsInline poster={tex.css.color}>
            {tex.css.video.webm && <source src={tex.css.video.webm} type="video/webm" />}
            {tex.css.video.mp4 && <source src={tex.css.video.mp4} type="video/mp4" />}
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tex.css.color} alt="" className="h-full w-full object-cover" draggable={false} />
        )}
      </div>
      {(scene.layers ?? []).map((l, i) =>
        tex.css.layers[l.name] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={l.name}
            ref={(n) => {
              layers.current[i] = n;
            }}
            src={tex.css.layers[l.name]}
            alt=""
            className="absolute left-1/2 top-1/2 object-cover will-change-transform"
            draggable={false}
          />
        ) : null,
      )}
    </div>
  );
}

export function CssStage() {
  const plates = useStage((s) => s.plates);
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#05070c]">
      {plates.map((p, i) => (
        <CssPlate key={p.key} inst={p} z={i + 1} />
      ))}
      <div className="pointer-events-none absolute inset-0 z-50 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.65))]" />
    </div>
  );
}
