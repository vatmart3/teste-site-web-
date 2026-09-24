"use client";
import { Canvas } from "@react-three/fiber";
import { NoToneMapping } from "three";
import { useStage } from "./state/stage";
import { PlatePlane } from "./plate/PlatePlane";
import { Effects } from "./fx/Effects";
import { Passerby } from "./hub/Passerby";
import { RoomStage } from "./room/RoomStage";
import { PropsLayer } from "./props/PropsLayer";
import { PROP_FOV } from "./props/model";
import { WorldStage } from "./world/World";
import { useWorld } from "./world/runtime";

/** Scène WebGL : pile de plates (transitions) + post-traitement. */
/** Débogage / machines modestes : ?lite désactive ombres et post-traitement, résolution réduite. */
const LITE = typeof window !== "undefined" && window.location.search.includes("lite");

export function StageCanvas({ quality }: { quality: "high" | "medium" }) {
  const plates = useStage((s) => s.plates);
  const current = useStage((s) => s.current);
  const world = useWorld((s) => s.active);
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={LITE ? [0.6, 0.6] : quality === "high" ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance", toneMapping: NoToneMapping }}
      flat
      shadows={LITE ? false : "soft"}
      frameloop="always"
      camera={{ fov: PROP_FOV, position: [0, 0, 0], near: 0.01, far: 100 }}
      onCreated={(state) => {
        state.gl.setClearColor("#05070c");
        // Débogage : ?debug expose l'état R3F (scène, caméra) pour les tests automatisés.
        if (window.location.search.includes("debug")) (window as unknown as { __r3f: unknown }).__r3f = state;
      }}
    >
      {!world &&
        plates.map((p, i) => (
          <PlatePlane key={p.key} inst={p} order={i + 1} isCurrent={p.key === current?.key} quality={quality} />
        ))}
      {!world && <RoomStage quality={quality} />}
      {!world && <Passerby />}
      {!world && <PropsLayer />}
      <WorldStage />
      {!LITE && <Effects quality={quality} />}
    </Canvas>
  );
}
