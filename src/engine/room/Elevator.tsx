"use client";
/**
 * L'ascenseur panoramique : cabine de verre et laiton qui monte réellement le long de la façade,
 * au-dessus d'une ville 3D (parallaxe vraie : les tours proches défilent, l'horizon reste). Le ciel
 * passe de la nuit à l'aube pendant la montée ; les rails et les consoles de la gaine défilent.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rig } from "../camera/rig";
import { PBR, useMat } from "../three/pbr";
import { SceneEnvironment } from "../three/environment";
import { City, type CityLook } from "./City";

export const ELEVATOR = { floorY: -1.62, height: 2.5, halfW: 0.85, front: -0.85, back: 0.75, riseMeters: 190 } as const;
/** Hauteur de la cabine (m) pour une valeur de rig.lift (0 → 0,32 pendant la montée). */
export function cabinHeight(lift: number): number {
  return (lift / 0.32) * ELEVATOR.riseMeters;
}
/** Indicateur d'étage, à hauteur d'yeux sur le montant gauche (le compteur mécanique HTML s'y accroche). */
export const ELEVATOR_PANEL: [number, number, number] = [-ELEVATOR.halfW + 0.2, ELEVATOR.floorY + 1.5, ELEVATOR.front + 0.03];
/** Soleil levant, à droite du cadre : les façades est des tours prennent la lumière rasante. */
const SUN_DIR: [number, number, number] = [0.72, 0.07, -0.69];

function Cabin() {
  const brass = useMat(() => PBR.brass({ color: "#cda45a" }), []);
  const floor = useMat(() => PBR.marble({ repeat: [1, 1] }), []);
  const glass = useMat(() => PBR.glass({ color: "#eef4f7", opacity: 0.08 }), []);
  const panel = useMat(() => new THREE.MeshStandardMaterial({ color: "#16120c", roughness: 0.4, metalness: 0.4 }), []);
  const ceiling = useMat(() => new THREE.MeshStandardMaterial({ color: "#fff6e6", emissive: "#ffe7c4", emissiveIntensity: 0.9 }), []);
  const E = ELEVATOR;
  const y0 = E.floorY;
  const H = E.height;
  const posts: [number, number][] = [
    [-E.halfW, E.front],
    [E.halfW, E.front],
    [-E.halfW, E.back],
    [E.halfW, E.back],
  ];
  return (
    <group>
      <mesh material={floor} position={[0, y0 - 0.03, (E.front + E.back) / 2]} receiveShadow>
        <boxGeometry args={[E.halfW * 2, 0.06, E.back - E.front]} />
      </mesh>
      <mesh material={ceiling} position={[0, y0 + H, (E.front + E.back) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[E.halfW * 2 - 0.2, E.back - E.front - 0.2]} />
      </mesh>
      {posts.map(([x, z]) => (
        <mesh key={`${x}${z}`} material={brass} position={[x, y0 + H / 2, z]}>
          <boxGeometry args={[0.06, H, 0.06]} />
        </mesh>
      ))}
      {/* Traverses haute et basse, main courante */}
      {[y0 + 0.08, y0 + H - 0.04].map((y) => (
        <group key={y}>
          <mesh material={brass} position={[0, y, E.front]}>
            <boxGeometry args={[E.halfW * 2, 0.08, 0.06]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={brass} position={[s * E.halfW, y, (E.front + E.back) / 2]}>
              <boxGeometry args={[0.06, 0.08, E.back - E.front]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh material={brass} position={[0, y0 + 0.95, E.front + 0.08]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, E.halfW * 2 - 0.1, 16]} />
      </mesh>
      {/* Vitres (avant et côtés) */}
      <mesh material={glass} position={[0, y0 + H / 2, E.front]}>
        <boxGeometry args={[E.halfW * 2 - 0.06, H - 0.16, 0.012]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={glass} position={[s * E.halfW, y0 + H / 2, (E.front + E.back) / 2]}>
          <boxGeometry args={[0.012, H - 0.16, E.back - E.front - 0.06]} />
        </mesh>
      ))}
      {/* Panneau d'étage (le compteur mécanique HTML s'y accroche) */}
      <mesh material={brass} position={[ELEVATOR_PANEL[0], ELEVATOR_PANEL[1], ELEVATOR_PANEL[2] - 0.004]}>
        <boxGeometry args={[0.3, 0.16, 0.012]} />
      </mesh>
      <mesh material={panel} position={[ELEVATOR_PANEL[0], ELEVATOR_PANEL[1], ELEVATOR_PANEL[2] + 0.004]}>
        <boxGeometry args={[0.27, 0.13, 0.01]} />
      </mesh>
      <pointLight position={[0, y0 + H - 0.2, 0]} intensity={2.2} distance={3} decay={2} color="#ffe2bc" />
    </group>
  );
}

/** Rails et consoles de la gaine devant la cabine : ils défilent vers le bas pendant la montée. */
function Shaft() {
  const steel = useMat(() => PBR.steel({ color: "#5a6068" }), []);
  const group = useRef<THREE.Group>(null);
  const brackets = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 4), []);
  useFrame(() => {
    // Les consoles sont posées tous les 4 m sur la façade : on les recycle autour de la cabine.
    const h = cabinHeight(rig.lift);
    if (group.current) group.current.position.y = -((h % 4) + 4) + 0;
  });
  return (
    <group>
      {[-1.05, 1.05].map((x) => (
        <mesh key={x} material={steel} position={[x, 0, ELEVATOR.front - 0.35]}>
          <boxGeometry args={[0.1, 80, 0.12]} />
        </mesh>
      ))}
      <group ref={group}>
        {brackets.map((y) => (
          <mesh key={y} material={steel} position={[0, y - 20, ELEVATOR.front - 0.35]}>
            <boxGeometry args={[2.3, 0.08, 0.1]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Soleil rasant qui monte en intensité pendant l'ascension (façades est dorées). */
function SunLight({ look }: { look: CityLook }) {
  const light = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    if (light.current) light.current.intensity = 0.2 + look.sunGlow * 2.6;
  });
  return <directionalLight ref={light} position={[SUN_DIR[0] * 500, SUN_DIR[1] * 500 + 20, SUN_DIR[2] * 500]} intensity={0.2} color="#ffb57a" />;
}

export function Elevator() {
  const cabin = useRef<THREE.Group>(null);
  const look = useMemo<CityLook>(() => ({ night: 1, sunGlow: 0 }), []);
  useFrame(() => {
    const k = Math.min(1, rig.lift / 0.32);
    // La nuit se lève pendant la montée.
    look.night = 1 - k * 0.72;
    look.sunGlow = Math.min(1, k * 1.3);
    if (cabin.current) cabin.current.position.y = cabinHeight(rig.lift);
  });
  return (
    <group>
      <SceneEnvironment name="dawn" intensity={0.35} />
      {/* La ville est fixe ; la cabine (et la caméra, voir registry) montent. */}
      <City look={look} seed={11} inner={60} groundY={-40} sunDir={SUN_DIR} />
      <group ref={cabin}>
        <Cabin />
        <Shaft />
      </group>
      <SunLight look={look} />
      <hemisphereLight args={["#9fb8e0", "#1a1410", 0.3]} />
    </group>
  );
}
