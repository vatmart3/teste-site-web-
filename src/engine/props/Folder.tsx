"use client";
import { useMemo, useRef } from "react";
import { audio } from "../audio/AudioEngine";
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

  const stampRef = useRef<THREE.Group>(null);
  const stamped = useRef("");
  const coverTex = useMemo(() => tex(drawFolderCover()), []);
  const mats = useMemo(() => {
    const kraft = new THREE.MeshStandardMaterial({ color: "#c9a466", roughness: 0.85 });
    return {
      kraft,
      cover: new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.8 }),
      wood: new THREE.MeshStandardMaterial({ color: "#6b3f1f", roughness: 0.5 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.9 }),
      tab: new THREE.MeshStandardMaterial({ color: "#d4b173", roughness: 0.85 }),
      sheets: Array.from({ length: SHEET_COUNT }, (_, i) => new THREE.MeshStandardMaterial({ map: tex(drawSheet(i)), roughness: 0.9, side: THREE.DoubleSide })),
    };
  }, [coverTex]);

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
    // Tampon de note : descend, frappe (l'encre apparaît sur la couverture), remonte.
    const st = stampRef.current;
    if (st) {
      const p = folder.stamp;
      st.visible = p > 0.001 && p < 0.999;
      const down = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5;
      st.position.set(FW * 0.12, -FH * 0.18, 0.006 + (1 - Math.pow(down, 2.2)) * 0.16);
      if (p >= 0.5 && folder.grade && stamped.current !== folder.grade) {
        stamped.current = folder.grade;
        const c = coverTex.image as HTMLCanvasElement;
        const x = c.getContext("2d")!;
        x.save();
        x.translate(c.width * 0.62, c.height * 0.68);
        x.rotate(-0.16);
        x.globalAlpha = 0.88;
        x.strokeStyle = x.fillStyle = folder.grade === "S" ? "#a8781a" : folder.grade === "C" ? "#9a1a1a" : "#1e5a2e";
        x.lineWidth = 12;
        x.beginPath();
        x.arc(0, 0, 150, 0, Math.PI * 2);
        x.stroke();
        x.font = "800 190px Georgia, serif";
        x.textAlign = "center";
        x.fillText(folder.grade, 0, 66);
        x.restore();
        coverTex.needsUpdate = true;
        void audio.sfx("sfx-stamp", { volume: 1 });
      }
    }
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
      <group ref={stampRef} visible={false}>
        <mesh material={mats.rubber} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.07, 0.014, 0.05]} />
        </mesh>
        <mesh material={mats.wood} position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.02, 0.05, 20]} />
        </mesh>
        <mesh material={mats.wood} position={[0, 0, 0.065]}>
          <sphereGeometry args={[0.024, 20, 14]} />
        </mesh>
      </group>
      {/* Couverture, articulée sur le bord gauche */}
      <group ref={coverPivot} position={[-FW / 2, 0, 0.004]}>
        <mesh position={[FW / 2, 0, 0]} material={[mats.kraft, mats.kraft, mats.kraft, mats.kraft, mats.cover, mats.kraft]}>
          <boxGeometry args={[FW, FH, 0.0015]} />
        </mesh>
      </group>
    </group>
  );
}
