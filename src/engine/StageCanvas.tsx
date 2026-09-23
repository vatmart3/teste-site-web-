"use client";
import { Canvas } from "@react-three/fiber";
import { NoToneMapping } from "three";
import { useStage } from "./state/stage";
import { PlatePlane } from "./plate/PlatePlane";
import { Effects } from "./fx/Effects";

/** Scène WebGL : pile de plates (transitions) + post-traitement. */
export function StageCanvas({ quality }: { quality: "high" | "medium" }) {
  const plates = useStage((s) => s.plates);
  const current = useStage((s) => s.current);
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={quality === "high" ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance", toneMapping: NoToneMapping }}
      flat
      frameloop="always"
      onCreated={({ gl }) => gl.setClearColor("#05070c")}
    >
      {plates.map((p, i) => (
        <PlatePlane key={p.key} inst={p} order={i + 1} isCurrent={p.key === current?.key} quality={quality} />
      ))}
      <Effects quality={quality} />
    </Canvas>
  );
}
