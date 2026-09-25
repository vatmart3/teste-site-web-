"use client";
import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
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
  // Qualité adaptative : si l'image saccade, la résolution baisse, puis le post-traitement se coupe.
  const max = quality === "high" ? 1.75 : 1.25;
  const [scale, setScale] = useState(1);
  const [lowFx, setLowFx] = useState(false);
  const dprMax = Math.max(0.6, Math.min(max, (typeof window !== "undefined" ? window.devicePixelRatio : 1) * scale));
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={LITE ? [0.6, 0.6] : [Math.min(0.75, dprMax), dprMax]}
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
      {!LITE && (
        <PerformanceMonitor
          bounds={() => [40, 58]}
          flipflops={4}
          onDecline={() =>
            setScale((v) => {
              // Déjà au plus bas : on sacrifie le post-traitement.
              if (v <= 0.6) setLowFx(true);
              return Math.max(0.5, v - 0.2);
            })
          }
          onIncline={() => setScale((v) => Math.min(1, v + 0.1))}
          onFallback={() => setLowFx(true)}
        />
      )}
      {!LITE && !lowFx && <Effects quality={quality} />}
    </Canvas>
  );
}
