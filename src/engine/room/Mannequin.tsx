"use client";
/**
 * Silhouette humaine stylisée (tissu, peau, cheveux PBR) pour les personnages vus de loin, flous ou à
 * contre-jour : collègues derrière les vitres, vigile au comptoir, Harlow devant la baie vitrée.
 * Les gros plans restent des plates / vidéos générées (annexe B).
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rig } from "../camera/rig";

export type MannequinPose = "stand" | "sit" | "phone";

export interface MannequinProps {
  pose?: MannequinPose;
  suit?: string;
  shirt?: string;
  tie?: string | null;
  skin?: string;
  hair?: string;
  /** Taille en mètres. */
  height?: number;
  /** Carrure (1 = moyenne). */
  build?: number;
  position?: [number, number, number];
  rotationY?: number;
  /** Rotation animée de tout le corps (Harlow qui se retourne) : objet mutable {value}. */
  turn?: { value: number };
  seed?: number;
}

export function Mannequin({ pose = "stand", suit = "#1d2433", shirt = "#dfe3ea", tie = "#3a1418", skin = "#c89c7e", hair = "#2a2018", height = 1.8, build = 1, position = [0, 0, 0], rotationY = 0, turn, seed = 1 }: MannequinProps) {
  const root = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const mats = useMemo(
    () => ({
      suit: new THREE.MeshPhysicalMaterial({ color: suit, roughness: 0.78, sheen: 0.6, sheenRoughness: 0.7, sheenColor: new THREE.Color(suit).offsetHSL(0, 0, 0.25) }),
      shirt: new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.7 }),
      tie: new THREE.MeshStandardMaterial({ color: tie ?? suit, roughness: 0.5 }),
      skin: new THREE.MeshPhysicalMaterial({ color: skin, roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color("#ffb59a") }),
      hair: new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 }),
      shoe: new THREE.MeshStandardMaterial({ color: "#0c0c0e", roughness: 0.3, metalness: 0.2 }),
      lapel: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(suit).offsetHSL(0, 0, -0.03), roughness: 0.6, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color(suit).offsetHSL(0, 0, 0.3) }),
      eye: new THREE.MeshStandardMaterial({ color: "#1e1511", roughness: 0.25 }),
      lip: new THREE.MeshStandardMaterial({ color: new THREE.Color(skin).offsetHSL(0, 0.05, -0.12), roughness: 0.5 }),
    }),
    [suit, shirt, tie, skin, hair],
  );
  // Buste : profil de révolution (épaules → taille), aplati en profondeur.
  const torsoGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.17, 0.0),
      new THREE.Vector2(0.18, 0.12),
      new THREE.Vector2(0.2, 0.3),
      new THREE.Vector2(0.23, 0.46),
      new THREE.Vector2(0.235, 0.55),
      new THREE.Vector2(0.2, 0.6),
      new THREE.Vector2(0.08, 0.64),
      new THREE.Vector2(0.0, 0.645),
    ].map((p) => new THREE.Vector2(p.x * build, p.y));
    const g = new THREE.LatheGeometry(pts, 32);
    g.scale(1, 1, 0.58);
    return g;
  }, [build]);
  const s = height / 1.8;
  const sit = pose === "sit";
  const phase = seed * 1.7;

  useFrame(({ clock }) => {
    const t = rig.reducedMotion ? 0 : clock.elapsedTime + phase;
    if (chest.current) chest.current.scale.setScalar(1 + Math.sin(t * 1.4) * 0.008);
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.3) * 0.12;
      head.current.rotation.x = Math.sin(t * 0.47) * 0.04;
    }
    if (root.current && turn) root.current.rotation.y = rotationY + turn.value;
  });

  const hipY = sit ? 0.46 : 0.95;
  return (
    <group ref={root} position={position} rotation={[0, rotationY, 0]} scale={s}>
      {/* Jambes */}
      {[-0.1, 0.1].map((x) =>
        sit ? (
          <group key={x}>
            <mesh material={mats.suit} position={[x * build, hipY, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.075, 0.36, 6, 16]} />
            </mesh>
            <mesh material={mats.suit} position={[x * build, 0.24, 0.44]}>
              <capsuleGeometry args={[0.065, 0.36, 6, 16]} />
            </mesh>
            <mesh material={mats.shoe} position={[x * build, 0.04, 0.5]}>
              <boxGeometry args={[0.1, 0.07, 0.26]} />
            </mesh>
          </group>
        ) : (
          <group key={x}>
            <mesh material={mats.suit} position={[x * build, 0.5, 0]}>
              <capsuleGeometry args={[0.078, 0.78, 6, 16]} />
            </mesh>
            <mesh material={mats.shoe} position={[x * build, 0.04, 0.05]}>
              <boxGeometry args={[0.1, 0.07, 0.27]} />
            </mesh>
          </group>
        ),
      )}
      <group ref={chest} position={[0, hipY, 0]}>
        <mesh geometry={torsoGeo} material={mats.suit} />
        {/* Col de chemise et cravate */}
        <mesh material={mats.shirt} position={[0, 0.52, 0.11 * build]} rotation={[0.25, 0, 0]}>
          <coneGeometry args={[0.07, 0.2, 3, 1, true]} />
        </mesh>
        {tie && (
          <mesh material={mats.tie} position={[0, 0.4, 0.125 * build]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.035, 0.26, 0.01]} />
          </mesh>
        )}
        {/* Revers de veste */}
        {[-1, 1].map((side) => (
          <mesh key={side} material={mats.lapel} position={[side * 0.06, 0.46, 0.128 * build]} rotation={[0.15, 0, side * 0.36]}>
            <boxGeometry args={[0.05, 0.22, 0.012]} />
          </mesh>
        ))}
        {/* Bras */}
        {[-1, 1].map((side) => {
          const phone = pose === "phone" && side === 1;
          return (
            <group key={side} position={[side * 0.235 * build, 0.55, 0]} rotation={[phone ? -2.2 : sit ? -0.7 : 0.05, 0, side * (phone ? 0.35 : 0.08)]}>
              <mesh material={mats.suit} position={[0, -0.16, 0]}>
                <capsuleGeometry args={[0.055, 0.26, 6, 12]} />
              </mesh>
              <group position={[0, -0.32, 0]} rotation={[phone ? 2.3 : sit ? -0.9 : -0.1, 0, 0]}>
                <mesh material={mats.suit} position={[0, -0.14, 0]}>
                  <capsuleGeometry args={[0.048, 0.24, 6, 12]} />
                </mesh>
                <mesh material={mats.skin} position={[0, -0.3, 0]}>
                  <sphereGeometry args={[0.045, 12, 10]} />
                </mesh>
                {phone && (
                  <mesh material={mats.shoe} position={[0.02, -0.3, 0.03]}>
                    <boxGeometry args={[0.02, 0.14, 0.07]} />
                  </mesh>
                )}
              </group>
            </group>
          );
        })}
        {/* Cou et tête */}
        <mesh material={mats.skin} position={[0, 0.68, 0]}>
          <cylinderGeometry args={[0.048, 0.055, 0.1, 16]} />
        </mesh>
        <group ref={head} position={[0, 0.83, 0]}>
          <mesh material={mats.skin} scale={[0.88, 1.12, 0.98]}>
            <sphereGeometry args={[0.1, 32, 24]} />
          </mesh>
          {/* Mâchoire et menton */}
          <mesh material={mats.skin} position={[0, -0.055, 0.018]} scale={[0.74, 0.62, 0.82]}>
            <sphereGeometry args={[0.1, 24, 16]} />
          </mesh>
          <mesh material={mats.skin} position={[0, -0.02, 0.095]} scale={[0.35, 0.5, 0.4]}>
            <sphereGeometry args={[0.05, 12, 10]} />
          </mesh>
          {/* Yeux, sourcils, bouche */}
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh material={mats.eye} position={[side * 0.032, 0.012, 0.084]} scale={[1, 0.62, 0.5]}>
                <sphereGeometry args={[0.013, 10, 8]} />
              </mesh>
              <mesh material={mats.hair} position={[side * 0.034, 0.034, 0.087]} rotation={[0, 0, side * -0.12]}>
                <boxGeometry args={[0.032, 0.006, 0.008]} />
              </mesh>
            </group>
          ))}
          <mesh material={mats.lip} position={[0, -0.05, 0.086]}>
            <boxGeometry args={[0.032, 0.006, 0.006]} />
          </mesh>
          {/* Cheveux : calotte inclinée vers l'arrière (front dégagé, nuque couverte) */}
          <mesh material={mats.hair} position={[0, 0.022, -0.012]} rotation={[-0.45, 0, 0]} scale={[0.95, 1.04, 1.04]}>
            <sphereGeometry args={[0.1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} material={mats.skin} position={[side * 0.088, -0.01, 0]} scale={[0.4, 0.7, 0.5]}>
              <sphereGeometry args={[0.04, 10, 8]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}
