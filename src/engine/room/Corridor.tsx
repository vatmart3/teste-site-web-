"use client";
/**
 * Le couloir de l'open space du 52e : bureaux vitrés des deux côtés (bureaux, écrans, collaborateurs),
 * rampes lumineuses, moquette, et au bout une baie vitrée sur Manhattan au matin. Trois « stations »
 * (06a, 06b, 06c) : la caméra avance réellement dans le couloir.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { PBR, useMat } from "../three/pbr";
import { SceneEnvironment } from "../three/environment";
import { City, type CityLook } from "./City";
import { Mannequin } from "./Mannequin";

export const CORRIDOR = { floorY: -1.62, ceilY: 1.12, halfW: 1.35, length: 27, officeDepth: 3.8, officeLen: 3.6 } as const;
export const CORRIDOR_STATIONS: Record<string, number> = { a: 0, b: -7, c: -14 };

let rectInit = false;
/** Au bout du couloir, la vue file jusqu'à l'horizon (pas de tour en face). */
const VISTA = { dir: [0, -1] as [number, number], angle: 0.32, dist: 1100 };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Office({ side, z, seed }: { side: -1 | 1; z: number; seed: number }) {
  const r = useMemo(() => rng(seed), [seed]);
  const conf = useMemo(
    () => ({
      person: r() < 0.7,
      pose: (r() < 0.45 ? "phone" : r() < 0.7 ? "stand" : "sit") as "phone" | "stand" | "sit",
      suit: ["#1d2433", "#2c2f36", "#3a3530", "#1a1a1e"][Math.floor(r() * 4)]!,
      hair: ["#2a2018", "#8a6a3a", "#111", "#c9a76a"][Math.floor(r() * 4)]!,
      skin: ["#e0b48f", "#a8785a", "#6b4630", "#c89c7e"][Math.floor(r() * 4)]!,
      screen: r() < 0.5 ? "#4fbf8a" : "#5c8fdc",
      rot: (r() - 0.5) * 1.2,
    }),
    [r],
  );
  const desk = useMat(() => PBR.wood("walnut", { repeat: [1, 0.5] }), []);
  const chair = useMat(() => PBR.leather({ color: "#161616", repeat: [1, 1] }), []);
  const screenMat = useMat(() => new THREE.MeshStandardMaterial({ color: "#000", emissive: conf.screen, emissiveIntensity: 1.6 }), [conf.screen]);
  const panel = useMat(() => new THREE.MeshStandardMaterial({ color: "#fff", emissive: "#fff5e6", emissiveIntensity: 1.5 }), []);
  // Cloisons entre bureaux : placage de chêne (chaud, vu en enfilade à travers les vitres du couloir).
  const wall = useMat(() => PBR.wood("oak", { repeat: [1.2, 1] }), []);
  const outerGlass = useMat(() => new THREE.MeshPhysicalMaterial({ color: "#cfe0ea", roughness: 0.03, transparent: true, opacity: 0.12, envMapIntensity: 1.5, depthWrite: false }), []);
  const mullion = useMat(() => new THREE.MeshStandardMaterial({ color: "#1c1d20", roughness: 0.4, metalness: 0.6 }), []);
  const art = useMat(() => new THREE.MeshStandardMaterial({ color: ["#6d4a3a", "#2f4a5c", "#8a7a5a", "#3c3a44"][seed % 4], roughness: 0.8 }), [seed]);
  const x = side * (CORRIDOR.halfW + CORRIDOR.officeDepth / 2);
  const deskGeo = useMemo(() => new RoundedBoxGeometry(1.6, 0.04, 0.75, 2, 0.01), []);
  const fy = CORRIDOR.floorY;
  return (
    <group position={[x, 0, z]}>
      {/* Baie vitrée extérieure (la ville au matin) et cloison entre bureaux */}
      <group position={[side * CORRIDOR.officeDepth / 2, (fy + CORRIDOR.ceilY) / 2, 0]} rotation={[0, -side * Math.PI / 2, 0]}>
        <mesh material={outerGlass}>
          <planeGeometry args={[CORRIDOR.officeLen, CORRIDOR.ceilY - fy]} />
        </mesh>
        {[-CORRIDOR.officeLen / 2, 0].map((x) => (
          <mesh key={x} material={mullion} position={[x, 0, 0.02]}>
            <boxGeometry args={[0.06, CORRIDOR.ceilY - fy, 0.05]} />
          </mesh>
        ))}
        <mesh material={mullion} position={[0, fy - (fy + CORRIDOR.ceilY) / 2 + 0.35, 0.06]}>
          <boxGeometry args={[CORRIDOR.officeLen, 0.05, 0.16]} />
        </mesh>
      </group>
      <mesh material={wall} position={[0, (fy + CORRIDOR.ceilY) / 2, -CORRIDOR.officeLen / 2]}>
        <boxGeometry args={[CORRIDOR.officeDepth, CORRIDOR.ceilY - fy, 0.08]} />
      </mesh>
      {/* Tableau sur la cloison */}
      <mesh material={art} position={[side * 0.4, fy + 1.55, -CORRIDOR.officeLen / 2 + 0.05]}>
        <planeGeometry args={[0.9, 0.62]} />
      </mesh>
      {/* Bureau, écran, fauteuil */}
      <mesh geometry={deskGeo} material={desk} position={[side * 0.6, fy + 0.74, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow />
      <mesh material={screenMat} position={[side * 0.95, fy + 1.02, 0.2]} rotation={[0, -side * Math.PI / 2, 0]}>
        <planeGeometry args={[0.55, 0.32]} />
      </mesh>
      <mesh material={chair} position={[side * 0.05, fy + 0.5, 0]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.5]} />
      </mesh>
      <mesh material={chair} position={[side * -0.18, fy + 0.85, 0]} castShadow>
        <boxGeometry args={[0.08, 0.6, 0.48]} />
      </mesh>
      {conf.person && (
        <Mannequin
          pose={conf.pose}
          suit={conf.suit}
          hair={conf.hair}
          skin={conf.skin}
          position={[side * (conf.pose === "sit" ? 0.05 : -0.3), fy, conf.pose === "sit" ? 0 : 0.6]}
          rotationY={conf.pose === "sit" ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : conf.rot + (side > 0 ? -Math.PI / 2 : Math.PI / 2)}
          seed={seed}
        />
      )}
      {/* Plafonnier du bureau */}
      <mesh material={panel} position={[0, CORRIDOR.ceilY - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 1.2]} />
      </mesh>
    </group>
  );
}

function GlassPartitions() {
  const glass = useMat(() => new THREE.MeshPhysicalMaterial({ color: "#dfe8ee", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.6 }), []);
  const frame = useMat(() => new THREE.MeshStandardMaterial({ color: "#1b1c20", roughness: 0.4, metalness: 0.6 }), []);
  const L = CORRIDOR.length;
  const H = CORRIDOR.ceilY - CORRIDOR.floorY;
  const mullions = useMemo(() => {
    const out: number[] = [];
    for (let z = 1; z > -L; z -= 1.2) out.push(z);
    return out;
  }, [L]);
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * CORRIDOR.halfW, (CORRIDOR.floorY + CORRIDOR.ceilY) / 2, 0]}>
          <mesh material={glass} position={[0, 0, -L / 2 + 1]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[L, H]} />
          </mesh>
          {mullions.map((z) => (
            <mesh key={z} material={frame} position={[0, 0, z]}>
              <boxGeometry args={[0.04, H, 0.04]} />
            </mesh>
          ))}
          <mesh material={frame} position={[0, -H / 2 + 0.05, -L / 2 + 1]}>
            <boxGeometry args={[0.05, 0.1, L]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Shell() {
  const floor = useMat(() => PBR.wood("oak", { repeat: [1.5, 12] }), []);
  const runner = useMat(() => PBR.carpet({ color: "#2a2f3c", repeat: [1, 12] }), []);
  const ceiling = useMat(() => PBR.plaster({ color: "#e6e3dc", repeat: [2, 10] }), []);
  const strip = useMat(() => new THREE.MeshStandardMaterial({ color: "#fff", emissive: "#fff6e8", emissiveIntensity: 2.2 }), []);
  const L = CORRIDOR.length;
  const W = CORRIDOR.halfW * 2 + CORRIDOR.officeDepth * 2;
  const strips = useMemo(() => {
    const out: number[] = [];
    for (let z = 0; z > -L + 1; z -= 2.2) out.push(z);
    return out;
  }, [L]);
  return (
    <group>
      <mesh material={floor} position={[0, CORRIDOR.floorY, -L / 2 + 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, L + 2]} />
      </mesh>
      <mesh material={runner} position={[0, CORRIDOR.floorY + 0.004, -L / 2 + 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.5, L]} />
      </mesh>
      <mesh material={ceiling} position={[0, CORRIDOR.ceilY, -L / 2 + 1]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, L + 2]} />
      </mesh>
      {strips.map((z) => (
        <mesh key={z} material={strip} position={[0, CORRIDOR.ceilY - 0.01, z]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.1, 0.12]} />
        </mesh>
      ))}
    </group>
  );
}

function EndWindow() {
  const frame = useMat(() => new THREE.MeshStandardMaterial({ color: "#16171a", roughness: 0.4, metalness: 0.6 }), []);
  const z = -CORRIDOR.length + 1;
  const H = CORRIDOR.ceilY - CORRIDOR.floorY;
  return (
    <group position={[0, (CORRIDOR.floorY + CORRIDOR.ceilY) / 2, z]}>
      {[-1.8, -0.6, 0.6, 1.8].map((x) => (
        <mesh key={x} material={frame} position={[x, 0, 0]}>
          <boxGeometry args={[0.06, H, 0.08]} />
        </mesh>
      ))}
      <mesh material={frame} position={[0, -H / 2 + 0.3, 0]}>
        <boxGeometry args={[4, 0.06, 0.08]} />
      </mesh>
    </group>
  );
}

function Plant() {
  const pot = useMat(() => new THREE.MeshStandardMaterial({ color: "#1c1c1e", roughness: 0.5 }), []);
  const leafMat = useMat(() => new THREE.MeshStandardMaterial({ color: "#2f5a2c", roughness: 0.6, side: THREE.DoubleSide }), []);
  const leaves = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.09, 0.35, 0, 0.7);
    shape.quadraticCurveTo(-0.09, 0.35, 0, 0);
    const g = new THREE.ShapeGeometry(shape, 10);
    const m = new THREE.InstancedMesh(g, leafMat, 26);
    const o = new THREE.Object3D();
    for (let i = 0; i < 26; i++) {
      o.position.set(0, 0.45, 0);
      o.rotation.set(0.3 + (i % 5) * 0.12, (i / 26) * Math.PI * 2 * 2.3, 0);
      o.scale.setScalar(0.8 + (i % 3) * 0.2);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.castShadow = true;
    return m;
  }, [leafMat]);
  return (
    <group position={[1.0, CORRIDOR.floorY, -1.2]}>
      <mesh material={pot} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.22, 0.18, 0.5, 32]} />
      </mesh>
      <primitive object={leaves} />
    </group>
  );
}

export function Corridor() {
  const look = useMemo<CityLook>(() => ({ night: 0.05, sunGlow: 0.35 }), []);
  const lights = useRef<THREE.Group>(null);
  if (!rectInit && typeof window !== "undefined") {
    RectAreaLightUniformsLib.init();
    rectInit = true;
  }
  const offices = useMemo(() => {
    const out: { side: -1 | 1; z: number; seed: number }[] = [];
    let seed = 40;
    for (let z = -1.5; z > -CORRIDOR.length + 3; z -= CORRIDOR.officeLen) {
      out.push({ side: -1, z, seed: seed++ });
      out.push({ side: 1, z: z - 0.8, seed: seed++ });
    }
    return out;
  }, []);
  useFrame(() => undefined);
  return (
    <group>
      <SceneEnvironment name="apartment" intensity={0.6} />
      {/* Le couloir est au centre d'une clairière de 150 m : pas de tour collée aux vitres. */}
      <City look={look} seed={21} inner={150} center={[0, 0, -CORRIDOR.length]} groundY={-190} vista={VISTA} />
      <Shell />
      <GlassPartitions />
      {offices.map((o) => (
        <Office key={o.seed} {...o} />
      ))}
      <EndWindow />
      <Plant />
      <group ref={lights}>
        {[-2, -9, -16, -23].map((z) => (
          <rectAreaLight key={z} position={[0, CORRIDOR.ceilY - 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} width={1.2} height={4} intensity={3.2} color="#fff4e6" />
        ))}
      </group>
      {/* Lumière du jour qui entre par les baies des bureaux, de part et d'autre */}
      {[-1, 1].map((side) => (
        <rectAreaLight
          key={side}
          position={[side * (CORRIDOR.halfW + CORRIDOR.officeDepth - 0.05), (CORRIDOR.floorY + CORRIDOR.ceilY) / 2 + 0.3, -CORRIDOR.length / 2 + 1]}
          rotation={[0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          width={CORRIDOR.length}
          height={2}
          intensity={2.4}
          color="#fff1dc"
        />
      ))}
      <directionalLight position={[0.5, 8, -CORRIDOR.length - 40]} intensity={2.2} color="#ffe2c0" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-camera-far={80} />
      <hemisphereLight args={["#f2f0ea", "#3a3028", 0.35]} />
    </group>
  );
}
