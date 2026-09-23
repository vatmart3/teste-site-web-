"use client";
/** Déménagement : cartons sur le bureau et plaque de porte gravée qu'on visse. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { displayName, useProfile } from "../state/profile";
import { RANKS } from "../career/ranks";
import { drawBoxSide, drawNameplate } from "./textures";
import { DESK_Y } from "./space";

export const moveState = { boxes: 0, plate: 0, screws: 0 };

function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function MovingBoxes() {
  const g = useRef<THREE.Group>(null);
  const mats = useMemo(() => {
    const plain = new THREE.MeshStandardMaterial({ color: "#b88a55", roughness: 0.95 });
    const labels = ["DOSSIERS", "BUREAU", "LIVRES"].map((l) => new THREE.MeshStandardMaterial({ map: tex(drawBoxSide(l)), roughness: 0.95 }));
    return { plain, labels };
  }, []);
  useFrame(() => {
    if (!g.current) return;
    g.current.visible = moveState.boxes > 0.01;
    g.current.children.forEach((c, i) => {
      const e = THREE.MathUtils.clamp(moveState.boxes * 1.5 - i * 0.25, 0, 1);
      c.position.y = DESK_Y + 0.08 + (1 - e) * 0.6 + (i === 2 ? 0.16 : 0);
    });
  });
  const boxes: [number, number, number, number][] = [
    [-0.3, -0.85, 0.3, 0],
    [0.12, -0.9, -0.2, 1],
    [-0.12, -0.88, 0.1, 2],
  ];
  return (
    <group ref={g}>
      {boxes.map(([x, z, ry, li]) => (
        <mesh key={li} position={[x, DESK_Y + 0.08, z]} rotation={[0, ry, 0]} material={[mats.plain, mats.plain, mats.plain, mats.plain, mats.labels[li]!, mats.plain]}>
          <boxGeometry args={[0.26, 0.16, 0.2]} />
        </mesh>
      ))}
    </group>
  );
}

/** Plaque en laiton (repère « vue » : devant la caméra). */
export function Nameplate({ rank }: { rank: number }) {
  const g = useRef<THREE.Group>(null);
  const screws = useRef<(THREE.Mesh | null)[]>([]);
  const profile = useProfile();
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: tex(drawNameplate(displayName(profile) || "—", RANKS[rank]?.plaque ?? "")), color: "#b8a078", metalness: 0.7, roughness: 0.45 }),
    [profile, rank],
  );
  const screwMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a88a40", metalness: 0.9, roughness: 0.3 }), []);
  useFrame(() => {
    if (!g.current) return;
    const t = moveState.plate;
    g.current.visible = t > 0.01;
    g.current.position.set(0, 0.02 + (1 - Math.min(1, t)) * -0.25, -0.5);
    g.current.rotation.set(-0.05, 0, (1 - Math.min(1, t)) * 0.2);
    screws.current.forEach((s, i) => {
      if (!s) return;
      const e = THREE.MathUtils.clamp(moveState.screws * 4 - i, 0, 1);
      s.rotation.z = e * Math.PI * 6;
      s.position.z = 0.004 + (1 - e) * 0.012;
    });
  });
  const corners: [number, number][] = [
    [-0.13, 0.024],
    [0.13, 0.024],
    [-0.13, -0.024],
    [0.13, -0.024],
  ];
  return (
    <group ref={g}>
      <mesh material={mat}>
        <boxGeometry args={[0.3, 0.075, 0.004]} />
      </mesh>
      {corners.map(([x, y], i) => (
        <mesh
          key={i}
          ref={(n) => {
            screws.current[i] = n;
          }}
          position={[x, y, 0.004]}
          rotation={[Math.PI / 2, 0, 0]}
          material={screwMat}
        >
          <cylinderGeometry args={[0.004, 0.004, 0.003, 16]} />
        </mesh>
      ))}
    </group>
  );
}
