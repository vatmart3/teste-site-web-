"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { drawFolderCover, drawSheet, SHEET_COUNT } from "./canvasTextures";
import { folder } from "./model";
import { useAnchor } from "./useAnchor";
import { hotspotBus } from "../director/events";

const FW = 0.23;
const FH = 0.31;

function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Chemise cartonnée « MERIDIAN » : glisse sur le bureau, se saisit, s'ouvre, les feuilles se déploient. */
export function Folder() {
  const group = useRef<THREE.Group>(null);
  const coverPivot = useRef<THREE.Group>(null);
  const sheets = useRef<(THREE.Mesh | null)[]>([]);

  const mats = useMemo(() => {
    const kraft = new THREE.MeshStandardMaterial({ color: "#c9a466", roughness: 0.85 });
    return {
      kraft,
      cover: new THREE.MeshStandardMaterial({ map: tex(drawFolderCover()), roughness: 0.8 }),
      tab: new THREE.MeshStandardMaterial({ color: "#d4b173", roughness: 0.85 }),
      sheets: Array.from({ length: SHEET_COUNT }, (_, i) => new THREE.MeshStandardMaterial({ map: tex(drawSheet(i)), roughness: 0.9, side: THREE.DoubleSide })),
    };
  }, []);

  useAnchor("folder", group);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const f = folder.float;
    g.position.set(folder.x, folder.y + Math.sin(t * 1.2) * 0.003 * f, folder.z);
    g.rotation.set(folder.rx, folder.ry, folder.rz + Math.sin(t * 0.8) * 0.02 * f);
    g.scale.setScalar(folder.scale);
    g.visible = folder.opacity > 0.01;
    if (coverPivot.current) coverPivot.current.rotation.y = -folder.cover * Math.PI * 0.93;
    const fan = folder.fan;
    sheets.current.forEach((m, i) => {
      if (!m) return;
      const k = i - (SHEET_COUNT - 1) / 2;
      const e = Math.max(0, Math.min(1, fan * 1.6 - i * 0.18));
      m.position.set(k * 0.045 * e, 0.012 * i * e, 0.0015 + i * 0.0006 + e * (0.03 + i * 0.045));
      m.rotation.set(-0.15 * e, 0, -k * 0.13 * e);
    });
  });

  return (
    <group ref={group} onClick={(e) => (e.stopPropagation(), hotspotBus.emit("prop:folder"))}>
      {/* Dos de la chemise */}
      <mesh position={[0, 0, -0.0012]} material={mats.kraft}>
        <boxGeometry args={[FW, FH, 0.0015]} />
      </mesh>
      {/* Onglet */}
      <mesh position={[FW * 0.28, FH / 2 + 0.012, -0.0012]} material={mats.tab}>
        <boxGeometry args={[FW * 0.36, 0.024, 0.0015]} />
      </mesh>
      {/* Feuilles */}
      {mats.sheets.map((m, i) => (
        <mesh
          key={i}
          ref={(n) => {
            sheets.current[i] = n;
          }}
          material={m}
        >
          <planeGeometry args={[FW * 0.94, FH * 0.95]} />
        </mesh>
      ))}
      {/* Couverture, articulée sur le bord gauche */}
      <group ref={coverPivot} position={[-FW / 2, 0, 0.004]}>
        <mesh position={[FW / 2, 0, 0]} material={[mats.kraft, mats.kraft, mats.kraft, mats.kraft, mats.cover, mats.kraft]}>
          <boxGeometry args={[FW, FH, 0.0015]} />
        </mesh>
      </group>
    </group>
  );
}
