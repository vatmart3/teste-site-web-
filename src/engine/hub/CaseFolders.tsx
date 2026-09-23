"use client";
/**
 * Vue « affaires » : les six chemises se déploient en éventail devant la caméra (onglets colorés,
 * tampons de note, scellés pour les affaires premium). Survol = la chemise se soulève ; clic = fiche.
 */
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CASES, caseStatus, CURRENT_PHASE } from "@/content/cases";
import { audio } from "../audio/AudioEngine";
import { useProfile } from "../state/profile";
import { drawCaseCover } from "./textures";
import { useHub } from "./state";

export const caseFan = { t: 0 };

function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function CaseFolders() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const hoverLift = useRef<number[]>(CASES.map(() => 0));
  const selected = useHub((s) => s.selectedCase);
  const progress = useProfile((s) => s.cases);
  const gl = useThree((s) => s.gl);
  const hovered = useRef<number>(-1);

  const mats = useMemo(
    () =>
      CASES.map((c) => {
        const rec = progress[c.id];
        const status = caseStatus(c, rec, false, CURRENT_PHASE);
        return [
          new THREE.MeshStandardMaterial({ color: "#c29f62", roughness: 0.85 }),
          (() => {
            const t = tex(drawCaseCover(c, status, rec?.grade ?? null));
            // L'émission compense l'assombrissement du décor pendant la vue : les chemises restent lisibles.
            return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 0.35, roughness: 0.8 });
          })(),
        ] as const;
      }),
    [progress],
  );

  useFrame((_, dt) => {
    const n = CASES.length;
    const t = caseFan.t;
    CASES.forEach((c, i) => {
      const g = refs.current[i];
      if (!g) return;
      const k = i - (n - 1) / 2;
      const e = THREE.MathUtils.clamp(t * 1.6 - i * 0.12, 0, 1);
      const eased = 1 - Math.pow(1 - e, 3);
      const isSel = selected === c.id;
      const target = hovered.current === i || isSel ? 1 : 0;
      hoverLift.current[i]! += (target - hoverLift.current[i]!) * Math.min(1, dt * 10);
      const h = hoverLift.current[i]!;
      // De la pile (en bas à gauche, hors champ) vers l'éventail.
      g.position.set(THREE.MathUtils.lerp(-0.35, k * 0.105, eased), THREE.MathUtils.lerp(-0.4, 0.045 + Math.abs(k) * -0.012 + h * 0.03, eased), THREE.MathUtils.lerp(-0.8, -0.62 + i * 0.004 + h * 0.03, eased));
      g.rotation.set(THREE.MathUtils.lerp(-1.4, -0.12, eased), 0, THREE.MathUtils.lerp(0.4, -k * 0.07, eased) * (1 - h * 0.6));
      g.visible = t > 0.001;
    });
  });

  return (
    <group>
      {CASES.map((c, i) => (
        <group
          key={c.id}
          ref={(n) => {
            refs.current[i] = n;
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (hovered.current !== i) void audio.sfx("sfx-paper-flip", { volume: 0.25, rate: 1.5 });
            hovered.current = i;
            gl.domElement.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            if (hovered.current === i) hovered.current = -1;
            gl.domElement.style.cursor = "";
          }}
          onClick={(e) => {
            e.stopPropagation();
            void audio.sfx("sfx-paper-slide", { volume: 0.5 });
            useHub.getState().set({ selectedCase: c.id });
          }}
        >
          <mesh material={[mats[i]![0], mats[i]![0], mats[i]![0], mats[i]![0], mats[i]![1], mats[i]![0]]}>
            <boxGeometry args={[0.2, 0.27, 0.003]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
