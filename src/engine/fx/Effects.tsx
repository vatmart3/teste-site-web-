"use client";
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, N8AO, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect } from "postprocessing";
import { useFrame } from "@react-three/fiber";
import { Vector2 } from "three";
import { useMemo, useRef } from "react";
import { rig } from "../camera/rig";
import { useRender } from "../state/render";
import { Exposure } from "./ExposureEffect";
import { useAudit } from "../audit/state";
import { roomBaseCamera } from "../room/registry";
import { propCamera } from "../props/model";

/** Distance de la feuille tenue en main (null si aucune) : la mise au point s'y cale. */
function heldSheetDistance(): number | null {
  const a = useAudit.getState();
  if (!a.active || !a.reading) return null;
  const half = a.def?.docs.find((d) => d.id === a.reading)?.format === "half";
  return (0.4 / a.zoom) * (half ? 0.85 : 1);
}

/**
 * Profondeur de champ des scènes 3D, pilotée par la même mise au point que les plates :
 * la « profondeur » de la caméra (0 = infini, 1 = contre l'objectif) est l'inverse de la distance.
 */
function RoomDepthOfField() {
  const ref = useRef<DepthOfFieldEffect>(null);
  const cur = useRef(1);
  useFrame((_, dt) => {
    const e = ref.current;
    if (!e) return;
    const held = heldSheetDistance();
    // Pièces autres que le bureau : la station donne la distance du sujet ; une mise au point très
    // proche (objet en main) prend le dessus.
    const r = useRender.getState();
    const cam = r.room ? roomBaseCamera(r.room, r.station, propCamera.pitch) : null;
    const subject = cam?.focus;
    const want = held ?? (subject !== undefined ? (rig.focus >= 0.8 ? 0.8 / rig.focus : subject) : 0.5 / Math.max(0.04, rig.focus));
    // La mise au point « glisse » d'un plan à l'autre, comme un pointeur de mise au point.
    cur.current += (want - cur.current) * Math.min(1, dt * 5);
    const d = cur.current;
    e.cocMaterial.focusDistance = d;
    e.cocMaterial.focusRange = Math.max(held ? 0.08 : 0.12, d * (held ? 0.35 : 0.55));
    e.bokehScale = held ? 4.5 : (1 + rig.aperture * (subject !== undefined && d > 3 ? 3 : 6)) * (cam?.dof ?? 1);
  });
  return <DepthOfField ref={ref} focusDistance={1} focusRange={0.5} bokehScale={2} resolutionScale={0.5} />;
}

/**
 * Post-traitement « cinéma » : exposition, bloom doux, ACES Filmic, aberration chromatique radiale,
 * vignettage et grain. Dans les pièces 3D : occlusion ambiante (N8AO) et profondeur de champ réelle.
 * Pour les plates 2,5D, la profondeur de champ et les rayons sont calculés dans le shader de plate.
 */
export function Effects({ quality }: { quality: "high" | "medium" }) {
  const ca = useMemo(() => new Vector2(0.0007, 0.0005), []);
  const room = useRender((s) => s.room);
  // Débogage visuel : ?nodof désactive la profondeur de champ 3D.
  const dof = room && !(typeof window !== "undefined" && window.location.search.includes("nodof"));
  if (quality === "medium") {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        {room ? <N8AO quality="performance" halfRes aoRadius={0.35} distanceFalloff={0.4} intensity={2.2} /> : <></>}
        {dof ? <RoomDepthOfField /> : <></>}
        <Exposure />
        <Bloom mipmapBlur intensity={0.4} luminanceThreshold={0.78} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.3} darkness={0.65} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={room ? 4 : 0} enableNormalPass={false}>
      {room ? <N8AO quality="medium" aoRadius={0.35} distanceFalloff={0.4} intensity={2.5} /> : <></>}
      {dof ? <RoomDepthOfField /> : <></>}
      <Exposure />
      <Bloom mipmapBlur intensity={room ? 0.45 : 0.6} luminanceThreshold={room ? 0.85 : 0.72} luminanceSmoothing={0.25} radius={0.75} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <ChromaticAberration offset={ca} radialModulation modulationOffset={0.35} />
      <Vignette offset={0.28} darkness={0.72} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.22} />
    </EffectComposer>
  );
}
