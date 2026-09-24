"use client";
/**
 * Le bureau d'angle de Robert Harlow au 52e : baies vitrées sur deux côtés au-dessus de Manhattan au
 * lever du soleil, bureau en verre, fauteuils en cuir, crédence en noyer. Harlow se tient devant la
 * vitre, à contre-jour ; il se retourne quand on entre.
 */
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PBR, useMat } from "../three/pbr";
import { SceneEnvironment } from "../three/environment";
import { City, type CityLook } from "./City";
import { Mannequin } from "./Mannequin";
import { harlowTurn } from "./roomState";

export const CORNER = { floorY: -1.62, ceilY: 1.35, backZ: -5.2, rightX: 3.6, leftX: -3.2, frontZ: 1.2 } as const;
export const CORNER_DESK = { x: 0, z: -2.5, topY: CORNER.floorY + 0.74 } as const;


function Windows() {
  const frame = useMat(() => new THREE.MeshStandardMaterial({ color: "#121316", roughness: 0.35, metalness: 0.7 }), []);
  const H = CORNER.ceilY - CORNER.floorY;
  const my = (CORNER.ceilY + CORNER.floorY) / 2;
  const backM = useMemo(() => {
    const out: number[] = [];
    for (let x = CORNER.leftX; x <= CORNER.rightX + 0.01; x += 1.35) out.push(x);
    return out;
  }, []);
  const sideM = useMemo(() => {
    const out: number[] = [];
    for (let z = CORNER.backZ; z <= CORNER.frontZ; z += 1.35) out.push(z);
    return out;
  }, []);
  return (
    <group>
      {backM.map((x) => (
        <mesh key={x} material={frame} position={[x, my, CORNER.backZ]}>
          <boxGeometry args={[0.07, H, 0.1]} />
        </mesh>
      ))}
      {sideM.map((z) => (
        <mesh key={z} material={frame} position={[CORNER.rightX, my, z]}>
          <boxGeometry args={[0.1, H, 0.07]} />
        </mesh>
      ))}
      <mesh material={frame} position={[(CORNER.leftX + CORNER.rightX) / 2, CORNER.floorY + 0.05, CORNER.backZ]}>
        <boxGeometry args={[CORNER.rightX - CORNER.leftX, 0.1, 0.12]} />
      </mesh>
      <mesh material={frame} position={[CORNER.rightX, CORNER.floorY + 0.05, (CORNER.backZ + CORNER.frontZ) / 2]}>
        <boxGeometry args={[0.12, 0.1, CORNER.frontZ - CORNER.backZ]} />
      </mesh>
    </group>
  );
}

function Shell() {
  const floor = useMat(() => PBR.wood("walnut", { repeat: [3, 3] }), []);
  const rug = useMat(() => PBR.carpet({ color: "#5a4a3a", repeat: [3, 2] }), []);
  const ceiling = useMat(() => PBR.plaster({ color: "#e8e4dc", repeat: [3, 3] }), []);
  const wall = useMat(() => PBR.plaster({ color: "#c9c0b0", repeat: [2, 1] }), []);
  const W = CORNER.rightX - CORNER.leftX;
  const D = CORNER.frontZ - CORNER.backZ;
  const cx = (CORNER.leftX + CORNER.rightX) / 2;
  const cz = (CORNER.backZ + CORNER.frontZ) / 2;
  return (
    <group>
      <mesh material={floor} position={[cx, CORNER.floorY, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh material={rug} position={[0, CORNER.floorY + 0.005, -2.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.4, 2.6]} />
      </mesh>
      <mesh material={ceiling} position={[cx, CORNER.ceilY, cz]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh material={wall} position={[CORNER.leftX, (CORNER.floorY + CORNER.ceilY) / 2, cz]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[D, CORNER.ceilY - CORNER.floorY]} />
      </mesh>
    </group>
  );
}

function Furniture() {
  const glass = useMat(() => PBR.glass({ color: "#cfdde4", opacity: 0.3 }), []);
  const chrome = useMat(() => PBR.steel({ color: "#c7ccd2", roughness: 0.5 }), []);
  const leather = useMat(() => PBR.leather({ color: "#2b1a12", repeat: [2, 2] }), []);
  const walnut = useMat(() => PBR.wood("walnut", { repeat: [2, 0.6] }), []);
  const brass = useMat(() => PBR.brass(), []);
  const top = useMemo(() => new RoundedBoxGeometry(2.2, 0.03, 1.0, 3, 0.01), []);
  const seat = useMemo(() => new RoundedBoxGeometry(0.7, 0.16, 0.66, 4, 0.05), []);
  const back = useMemo(() => new RoundedBoxGeometry(0.7, 0.62, 0.14, 4, 0.05), []);
  const fy = CORNER.floorY;
  return (
    <group>
      {/* Bureau en verre sur piètement chromé */}
      <mesh geometry={top} material={glass} position={[CORNER_DESK.x, CORNER_DESK.topY, CORNER_DESK.z]} />
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} material={chrome} position={[CORNER_DESK.x + sx! * 1.0, fy + 0.36, CORNER_DESK.z + sz! * 0.42]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.72, 12]} />
        </mesh>
      ))}
      {/* Fauteuil de Harlow et fauteuils visiteurs */}
      {[
        // Fauteuil de Harlow repoussé de côté : il s'est levé pour regarder la ville.
        { x: 1.05, z: -3.5, ry: -0.55 },
        { x: -0.6, z: -1.35, ry: 0.15 },
        { x: 0.75, z: -1.35, ry: -0.15 },
      ].map((c, i) => (
        <group key={i} position={[c.x, fy, c.z]} rotation={[0, c.ry, 0]}>
          <mesh geometry={seat} material={leather} position={[0, 0.46, 0]} castShadow receiveShadow />
          <mesh geometry={back} material={leather} position={[0, 0.82, -0.28]} castShadow />
          <mesh material={chrome} position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.4, 12]} />
          </mesh>
          <mesh material={chrome} position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.02, 24]} />
          </mesh>
        </group>
      ))}
      {/* Crédence en noyer (mur de gauche) avec lampe et livres */}
      <mesh material={walnut} position={[CORNER.leftX + 0.3, fy + 0.4, -2.5]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.8, 2.4]} />
      </mesh>
      <mesh material={brass} position={[CORNER.leftX + 0.3, fy + 0.95, -1.6]}>
        <cylinderGeometry args={[0.05, 0.08, 0.3, 24]} />
      </mesh>
    </group>
  );
}

export function CornerOffice() {
  const look = useMemo<CityLook>(() => ({ night: 0.28, sunGlow: 1 }), []);
  useFrame(() => undefined);
  return (
    <group>
      <SceneEnvironment name="sunset" intensity={0.55} />
      <City look={look} seed={33} inner={110} groundY={-200} />
      <Shell />
      <Windows />
      <Furniture />
      <Mannequin pose="stand" model="harlow" who="harlow" position={[0.35, CORNER.floorY, -4.5]} rotationY={Math.PI} turn={harlowTurnProxy} seed={9} />
      {/* Soleil levant : lumière rasante et chaude qui découpe la silhouette */}
      <directionalLight position={[-40, 18, -120]} intensity={3.4} color="#ffb070" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-camera-far={200} shadow-bias={-0.0004} />
      <hemisphereLight args={["#ffd8b0", "#2a2018", 0.35]} />
      <pointLight position={[0, CORNER.ceilY - 0.2, -0.5]} intensity={1.2} distance={6} decay={2} color="#ffe8cc" />
    </group>
  );
}

/** Proxy : la rotation animée part de π (dos à la pièce) et va vers 0 (face à la caméra). */
const harlowTurnProxy = {
  get value() {
    return -harlowTurn.value * Math.PI;
  },
};
