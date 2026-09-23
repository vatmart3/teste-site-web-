"use client";
/**
 * Les marches du tribunal fédéral (Lower Manhattan, matin gris) : grand escalier de pierre, portique à huit
 * colonnes, fronton gravé, portes de bronze ; en bas, les photographes de presse et leurs flashs.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PBR, useMat } from "../three/pbr";
import { SceneEnvironment } from "../three/environment";
import { City, type CityLook } from "./City";
import { Mannequin } from "./Mannequin";
import { useTextGeometry } from "./useBrassText";

export const STEPS = { plazaY: -1.65, count: 14, rise: 0.17, tread: 0.42, frontZ: 2, width: 26 } as const;
export const STEPS_TOP = STEPS.plazaY + STEPS.count * STEPS.rise;
const TOP_Z = STEPS.frontZ - STEPS.count * STEPS.tread;

function Stairs() {
  const stone = useMat(() => PBR.plaster({ color: "#b9b6ae", repeat: [8, 1], normalScale: 1.2 }), []);
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(STEPS.width, STEPS.rise, STEPS.tread + 0.02);
    return g;
  }, []);
  return (
    <group>
      {Array.from({ length: STEPS.count }, (_, i) => (
        <mesh key={i} geometry={geo} material={stone} position={[0, STEPS.plazaY + STEPS.rise * (i + 0.5), STEPS.frontZ - STEPS.tread * (i + 0.5)]} receiveShadow castShadow />
      ))}
      {/* Plateau devant les portes */}
      <mesh material={stone} position={[0, STEPS_TOP - 0.1, TOP_Z - 4]} receiveShadow>
        <boxGeometry args={[STEPS.width, 0.2, 8]} />
      </mesh>
      {/* Parvis */}
      <mesh material={stone} rotation={[-Math.PI / 2, 0, 0]} position={[0, STEPS.plazaY, 20]} receiveShadow>
        <planeGeometry args={[80, 36]} />
      </mesh>
    </group>
  );
}

function Portico() {
  const stone = useMat(() => PBR.plaster({ color: "#c7c3ba", repeat: [1, 3], normalScale: 1.0 }), []);
  const dark = useMat(() => PBR.plaster({ color: "#8f8c85", repeat: [4, 2] }), []);
  const bronze = useMat(() => PBR.brass({ color: "#6a5230", roughness: 0.55 }), []);
  const letters = useTextGeometry("UNITED STATES COURTHOUSE", 0.62, 0.08);
  const colH = 11;
  const baseY = STEPS_TOP;
  const zCol = TOP_Z - 1.6;
  const xs = [-10.5, -7.5, -4.5, -1.5, 1.5, 4.5, 7.5, 10.5];
  const pediment = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-13, 0);
    sh.lineTo(13, 0);
    sh.lineTo(0, 3.4);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 5.2, bevelEnabled: false });
    g.translate(0, 0, -5.2);
    return g;
  }, []);
  const flutes = useMemo(() => {
    // Colonne cannelée : cylindre dont les sommets sont creusés en 20 cannelures.
    const g = new THREE.CylinderGeometry(0.62, 0.7, colH, 80, 1, true);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const k = 1 - 0.035 * Math.max(0, Math.cos(a * 20));
      p.setX(i, x * k);
      p.setZ(i, z * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      {/* Mur de fond et portes de bronze */}
      <mesh material={dark} position={[0, baseY + colH / 2, zCol - 4.5]} receiveShadow>
        <boxGeometry args={[26, colH + 1, 0.6]} />
      </mesh>
      {[-3.2, 0, 3.2].map((x) => (
        <group key={x} position={[x, baseY, zCol - 4.15]}>
          <mesh material={bronze} position={[0, 2.6, 0]}>
            <boxGeometry args={[2.1, 5.2, 0.12]} />
          </mesh>
          <mesh material={stone} position={[0, 5.5, 0.1]}>
            <boxGeometry args={[2.6, 0.5, 0.3]} />
          </mesh>
        </group>
      ))}
      {xs.map((x) => (
        <group key={x} position={[x, baseY, zCol]}>
          <mesh geometry={flutes} material={stone} position={[0, colH / 2 + 0.4, 0]} castShadow receiveShadow />
          <mesh material={stone} position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[1.7, 0.4, 1.7]} />
          </mesh>
          <mesh material={stone} position={[0, colH + 0.55, 0]} castShadow>
            <boxGeometry args={[1.6, 0.3, 1.6]} />
          </mesh>
        </group>
      ))}
      {/* Entablement, frise gravée, fronton */}
      <mesh material={stone} position={[0, baseY + colH + 1.3, zCol - 1.2]} castShadow>
        <boxGeometry args={[25, 1.4, 5]} />
      </mesh>
      {letters && <mesh geometry={letters} material={dark} position={[0, baseY + colH + 1.3, zCol + 1.33]} />}
      <mesh material={stone} position={[0, baseY + colH + 2.3, zCol - 1.2]} castShadow>
        <boxGeometry args={[26, 0.6, 5.4]} />
      </mesh>
      <mesh geometry={pediment} material={stone} position={[0, baseY + colH + 2.6, zCol + 1.4]} castShadow />
    </group>
  );
}

/** Photographes au pied des marches : flashs aléatoires. */
function Press() {
  const flashes = useRef<THREE.PointLight[]>([]);
  const cams = useRef<THREE.MeshStandardMaterial[]>([]);
  const people = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        x: -6 + i * 1.15 + ((i * 37) % 10) / 20,
        z: STEPS.frontZ + 3.2 + ((i * 53) % 7) / 5,
        rot: Math.PI + ((i * 29) % 9) / 12 - 0.35,
        suit: ["#2a2d34", "#4a4036", "#1d2433", "#5a5048", "#3a3a3a"][i % 5]!,
        skin: ["#e0b48f", "#a8785a", "#6b4630", "#c89c7e", "#8d5a3d"][(i * 3) % 5]!,
        hair: ["#2a2018", "#8a6a3a", "#111", "#9a9a9a"][(i * 7) % 4]!,
      })),
    [],
  );
  const next = useRef<number[]>(people.map(() => Math.random() * 3));
  const lvl = useRef<number[]>(people.map(() => 0));
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    people.forEach((_, i) => {
      if (t > next.current[i]!) {
        lvl.current[i] = 1;
        next.current[i] = t + 0.8 + Math.random() * 3.5;
      }
      lvl.current[i] = Math.max(0, lvl.current[i]! - dt * 14);
      const l = flashes.current[i];
      if (l) l.intensity = lvl.current[i]! * 40;
      const m = cams.current[i];
      if (m) m.emissiveIntensity = lvl.current[i]! * 30;
    });
  });
  return (
    <group>
      {people.map((p, i) => (
        <group key={i}>
          <Mannequin pose="stand" suit={p.suit} skin={p.skin} hair={p.hair} tie={null} position={[p.x, STEPS.plazaY, p.z]} rotationY={p.rot} seed={40 + i} />
          <group position={[p.x - Math.sin(p.rot) * 0.25, STEPS.plazaY + 1.62, p.z - Math.cos(p.rot) * 0.25]} rotation={[0, p.rot, 0]}>
            <mesh>
              <boxGeometry args={[0.14, 0.1, 0.09]} />
              <meshStandardMaterial color="#111" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.09, 0.02]}>
              <boxGeometry args={[0.07, 0.03, 0.05]} />
              <meshStandardMaterial
                ref={(m) => {
                  if (m) cams.current[i] = m;
                }}
                color="#fff"
                emissive="#eaf2ff"
                emissiveIntensity={0}
              />
            </mesh>
            {i % 3 === 0 && (
              <pointLight
                ref={(l) => {
                  if (l) flashes.current[i] = l;
                }}
                position={[0, 0.12, 0.3]}
                intensity={0}
                distance={8}
                decay={2}
                color="#eef4ff"
              />
            )}
          </group>
        </group>
      ))}
    </group>
  );
}

export function CourthouseSteps() {
  const look = useMemo<CityLook>(() => ({ night: 0, sunGlow: 0, overcast: 1 }), []);
  return (
    <group>
      <SceneEnvironment name="city" intensity={0.55} />
      <City look={look} seed={57} inner={70} groundY={STEPS.plazaY - 0.02} center={[0, 0, -20]} vista={{ dir: [0, 1], angle: 0.6, dist: 160 }} />
      <Stairs />
      <Portico />
      <Press />
      <directionalLight position={[-20, 40, 30]} intensity={1.3} color="#e6ebf0" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-camera-far={120} shadow-bias={-0.0005} />
      <hemisphereLight args={["#d9dde2", "#5a5650", 0.7]} />
    </group>
  );
}
