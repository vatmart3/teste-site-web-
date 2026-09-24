"use client";
/**
 * Mobilier procédural de l'étage (et du catalogue de décoration) : bureaux, fauteuils, canapés,
 * bibliothèques, plantes, lampes, tapis, tableaux, platine vinyle, bar, globe, aquarium...
 * Chaque objet est centré sur son emprise au sol, face vers +z (lacet 0).
 */
import { memo, useMemo } from "react";
import * as THREE from "three";
import type { FurnitureType, Placed } from "./layout";
import { MAT } from "./mats";

type V3 = [number, number, number];

function Bx({ p, s, m, r, shadow = true }: { p: V3; s: V3; m: THREE.Material; r?: V3; shadow?: boolean }) {
  return (
    <mesh position={p} rotation={r} castShadow={shadow} receiveShadow material={m}>
      <boxGeometry args={s} />
    </mesh>
  );
}

function Cyl({ p, r, h, m, seg = 20, rt, rot }: { p: V3; r: number; h: number; m: THREE.Material; seg?: number; rt?: number; rot?: V3 }) {
  return (
    <mesh position={p} rotation={rot} castShadow receiveShadow material={m}>
      <cylinderGeometry args={[rt ?? r, r, h, seg]} />
    </mesh>
  );
}

function Monitor({ p, rot = 0, on = true }: { p: V3; rot?: number; on?: boolean }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Bx p={[0, 0.3, 0]} s={[0.62, 0.37, 0.025]} m={MAT.blackMetal()} />
      <mesh position={[0, 0.3, 0.014]} material={on ? MAT.screen() : MAT.screenOff()}>
        <planeGeometry args={[0.58, 0.33]} />
      </mesh>
      <Bx p={[0, 0.07, -0.02]} s={[0.05, 0.14, 0.03]} m={MAT.blackMetal()} />
      <Bx p={[0, 0.005, -0.02]} s={[0.22, 0.01, 0.16]} m={MAT.blackMetal()} />
      <Bx p={[0, 0.006, 0.25]} s={[0.42, 0.015, 0.13]} m={MAT.plastic("#2a2b2e")} />
    </group>
  );
}

function Papers({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Bx p={[0, 0.01, 0]} s={[0.22, 0.02, 0.3]} m={MAT.paper()} r={[0, 0.2, 0]} />
      <Bx p={[0.05, 0.03, 0.02]} s={[0.22, 0.015, 0.3]} m={MAT.paper()} r={[0, -0.15, 0]} />
    </group>
  );
}

function DeskLamp({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Cyl p={[0, 0.01, 0]} r={0.07} h={0.02} m={MAT.brass()} />
      <Cyl p={[0, 0.2, 0]} r={0.008} h={0.38} m={MAT.brass()} />
      <Cyl p={[0, 0.4, 0.05]} r={0.09} rt={0.06} h={0.1} m={MAT.fabric("#1d3a2a")} rot={[0.3, 0, 0]} />
      <mesh position={[0, 0.355, 0.06]} material={MAT.lightPanel()}>
        <sphereGeometry args={[0.03, 10, 8]} />
      </mesh>
    </group>
  );
}

function OfficeChair({ exec = false, leather = "#161210" }: { exec?: boolean; leather?: string }) {
  const seat = exec ? MAT.leather(leather) : MAT.fabric("#2a2c30");
  return (
    <group>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return <Bx key={i} p={[Math.sin(a) * 0.17, 0.05, Math.cos(a) * 0.17]} s={[0.04, 0.03, 0.34]} r={[0, a, 0]} m={MAT.chrome()} />;
      })}
      <Cyl p={[0, 0.26, 0]} r={0.025} h={0.38} m={MAT.chrome()} />
      <Bx p={[0, 0.47, 0]} s={[0.52, 0.08, 0.5]} m={seat} />
      <Bx p={[0, exec ? 0.86 : 0.76, -0.24]} s={[0.5, exec ? 0.72 : 0.5, 0.07]} m={seat} r={[-0.08, 0, 0]} />
      {exec && <Bx p={[0, 1.24, -0.27]} s={[0.36, 0.14, 0.08]} m={seat} r={[-0.1, 0, 0]} />}
      {[-1, 1].map((s) => (
        <Bx key={s} p={[s * 0.27, 0.62, -0.02]} s={[0.05, 0.03, 0.3]} m={MAT.plastic()} />
      ))}
    </group>
  );
}

function VisitorChair({ c = "#3a2418" }: { c?: string }) {
  const l = MAT.leather(c);
  return (
    <group>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} p={[sx * 0.24, 0.22, sz * 0.22]} r={0.013} h={0.44} m={MAT.chrome()} />),
      )}
      <Bx p={[0, 0.46, 0]} s={[0.54, 0.07, 0.52]} m={l} />
      <Bx p={[0, 0.72, -0.25]} s={[0.54, 0.45, 0.06]} m={l} r={[-0.1, 0, 0]} />
      {[-1, 1].map((s) => (
        <Bx key={s} p={[s * 0.28, 0.6, -0.02]} s={[0.04, 0.03, 0.46]} m={MAT.chrome()} />
      ))}
    </group>
  );
}

function Sofa({ c = "#1f1a17", leather = true, w = 2.2 }: { c?: string; leather?: boolean; w?: number }) {
  const m = leather ? MAT.leather(c) : MAT.fabric(c);
  return (
    <group>
      <Bx p={[0, 0.22, 0]} s={[w, 0.3, 0.9]} m={m} />
      <Bx p={[0, 0.62, -0.36]} s={[w, 0.55, 0.18]} m={m} />
      {[-1, 1].map((s) => (
        <Bx key={s} p={[s * (w / 2 - 0.1), 0.48, 0]} s={[0.2, 0.36, 0.9]} m={m} />
      ))}
      {[-1, 0, 1].map((i) => (
        <Bx key={i} p={[i * ((w - 0.4) / 3), 0.44, 0.06]} s={[(w - 0.46) / 3, 0.14, 0.7]} m={m} />
      ))}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} p={[sx * (w / 2 - 0.08), 0.035, sz * 0.36]} r={0.025} h={0.07} m={MAT.walnut()} />))}
    </group>
  );
}

function Plant({ tall = false, seed = 1 }: { tall?: boolean; seed?: number }) {
  const leaves = useMemo(() => {
    let a = seed * 997;
    const r = () => ((a = (a * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: tall ? 34 : 18 }, () => {
      const h = tall ? 0.9 + r() * 1.0 : 0.35 + r() * 0.4;
      const ang = r() * Math.PI * 2;
      const rad = (tall ? 0.18 : 0.12) + r() * (tall ? 0.22 : 0.15);
      return { p: [Math.sin(ang) * rad, h, Math.cos(ang) * rad] as V3, r: [r() - 0.5, ang, (r() - 0.5) * 0.8] as V3, s: tall ? 0.22 + r() * 0.1 : 0.16 + r() * 0.08 };
    });
  }, [tall, seed]);
  return (
    <group>
      <Cyl p={[0, tall ? 0.25 : 0.16, 0]} r={tall ? 0.2 : 0.16} rt={tall ? 0.24 : 0.19} h={tall ? 0.5 : 0.32} m={MAT.ceramic(tall ? "#2a2a2c" : "#e9e6df")} />
      <Cyl p={[0, tall ? 0.49 : 0.31, 0]} r={tall ? 0.22 : 0.17} h={0.02} m={MAT.soil()} />
      {tall && <Cyl p={[0, 1.0, 0]} r={0.02} h={1.0} m={MAT.walnut()} />}
      {leaves.map((l, i) => (
        <mesh key={i} position={l.p} rotation={l.r} castShadow material={MAT.leaf(i % 3 ? "#2f5a2c" : "#3d6e35")}>
          <circleGeometry args={[l.s, 7, 0, Math.PI]} />
        </mesh>
      ))}
    </group>
  );
}

function Bookshelf() {
  return (
    <group>
      <Bx p={[0, 1.05, -0.18]} s={[1.2, 2.1, 0.03]} m={MAT.walnut()} />
      {[-1, 1].map((s) => (
        <Bx key={s} p={[s * 0.585, 1.05, 0]} s={[0.03, 2.1, 0.4]} m={MAT.walnut()} />
      ))}
      {[0.02, 0.5, 0.95, 1.4, 1.85, 2.09].map((y, i) => (
        <Bx key={i} p={[0, y, 0]} s={[1.17, 0.03, 0.38]} m={MAT.walnut()} />
      ))}
      {[0.27, 0.72, 1.17, 1.62].map((y, i) => (
        <mesh key={i} position={[0, y, 0.02]} material={MAT.books()}>
          <boxGeometry args={[1.12, 0.4, 0.3]} />
        </mesh>
      ))}
    </group>
  );
}

function ExecDesk({ glass = false, light = false }: { glass?: boolean; light?: boolean }) {
  const top = glass ? MAT.glass() : MAT.walnut();
  return (
    <group>
      <Bx p={[0, 0.74, 0]} s={[1.95, 0.05, 0.92]} m={top} />
      {glass ? (
        [-1, 1].map((s) => <Bx key={s} p={[s * 0.9, 0.37, 0]} s={[0.04, 0.72, 0.8]} m={MAT.chrome()} />)
      ) : (
        <>
          <Bx p={[-0.72, 0.36, 0]} s={[0.46, 0.72, 0.84]} m={MAT.walnut()} />
          <Bx p={[0.9, 0.36, 0]} s={[0.06, 0.72, 0.84]} m={MAT.walnut()} />
          <Bx p={[0.1, 0.42, 0.38]} s={[1.1, 0.6, 0.03]} m={MAT.walnut()} />
          {[0.18, 0.4, 0.6].map((y) => (
            <Bx key={y} p={[-0.72, y, -0.43]} s={[0.4, 0.004, 0.01]} m={MAT.brass()} shadow={false} />
          ))}
        </>
      )}
      <Monitor p={[0.35, 0.765, 0.08]} rot={Math.PI} />
      <Papers p={[-0.45, 0.765, -0.1]} />
      {light && <DeskLamp p={[-0.8, 0.765, 0.25]} />}
    </group>
  );
}

function Pod() {
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * 0.42]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <Bx p={[0, 0.73, 0]} s={[1.6, 0.04, 0.8]} m={MAT.whiteTop()} />
          <Bx p={[-0.78, 0.36, 0]} s={[0.04, 0.72, 0.76]} m={MAT.steel()} />
          <Bx p={[0.78, 0.36, 0]} s={[0.04, 0.72, 0.76]} m={MAT.steel()} />
          <Monitor p={[s * 0.45 * 0, 0.75, 0.22]} rot={Math.PI} />
          <Papers p={[0.5, 0.75, -0.05]} />
        </group>
      ))}
      <Bx p={[0, 0.95, 0]} s={[1.6, 0.42, 0.03]} m={MAT.frosted()} />
    </group>
  );
}

function AssistantDesk() {
  return (
    <group>
      <Bx p={[0, 0.73, 0]} s={[1.6, 0.04, 0.72]} m={MAT.whiteTop()} />
      <Bx p={[0, 0.55, 0.36]} s={[1.6, 1.1, 0.04]} m={MAT.walnut()} />
      <Bx p={[0, 1.1, 0.33]} s={[1.6, 0.03, 0.12]} m={MAT.walnut()} />
      {[-1, 1].map((s) => (
        <Bx key={s} p={[s * 0.78, 0.36, 0]} s={[0.04, 0.72, 0.68]} m={MAT.walnut()} />
      ))}
      <Monitor p={[0.1, 0.75, 0.12]} rot={Math.PI} />
      <Papers p={[-0.5, 0.75, -0.05]} />
      <Bx p={[0.62, 0.77, -0.05]} s={[0.16, 0.05, 0.2]} m={MAT.plastic()} />
    </group>
  );
}

function Lamp() {
  return (
    <group>
      <Cyl p={[0, 0.02, 0]} r={0.16} h={0.04} m={MAT.marble()} />
      <Cyl p={[0, 0.9, 0]} r={0.012} h={1.8} m={MAT.brass()} />
      <Cyl p={[0, 1.72, 0]} r={0.22} rt={0.16} h={0.28} m={MAT.lampShade()} />
    </group>
  );
}

function RecordPlayer() {
  return (
    <group>
      <Bx p={[0, 0.32, 0]} s={[0.9, 0.64, 0.45]} m={MAT.walnut()} />
      {[-0.22, 0.22].map((x) => (
        <group key={x}>
          {Array.from({ length: 10 }, (_, i) => (
            <Bx key={i} p={[x + (i - 4.5) * 0.02, 0.33, 0.05]} s={[0.012, 0.31, 0.31]} m={MAT.plastic(["#1b1b1b", "#6a1c1c", "#1c3a6a", "#caa24a", "#2a2a2a"][i % 5]!)} shadow={false} />
          ))}
        </group>
      ))}
      <Bx p={[0, 0.68, 0]} s={[0.45, 0.07, 0.36]} m={MAT.walnut()} />
      <Cyl p={[-0.04, 0.725, 0]} r={0.15} h={0.01} m={MAT.plastic("#0c0c0c")} seg={32} />
      <Cyl p={[-0.04, 0.732, 0]} r={0.045} h={0.01} m={MAT.plastic("#8a1c1c")} />
      <Bx p={[0.15, 0.74, 0.08]} s={[0.012, 0.012, 0.2]} m={MAT.chrome()} r={[0, 0.5, 0]} />
    </group>
  );
}

function BarCart() {
  const bottleMats = useMemo(() => ["#6a3a14", "#c9d8d4", "#3a1a0a", "#8a5a20"].map((c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.05, transparent: true, opacity: 0.75, clearcoat: 1 })), []);
  return (
    <group>
      {[0.12, 0.62].map((y) => (
        <Bx key={y} p={[0, y, 0]} s={[0.78, 0.02, 0.46]} m={MAT.glass()} />
      ))}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} p={[sx * 0.37, 0.4, sz * 0.21]} r={0.012} h={0.8} m={MAT.brass()} />))}
      {bottleMats.map((m, i) => (
        <group key={i} position={[-0.27 + i * 0.17, 0.63, (i % 2) * 0.1 - 0.05]}>
          <Cyl p={[0, 0.12, 0]} r={0.04} h={0.24} m={m} />
          <Cyl p={[0, 0.28, 0]} r={0.012} h={0.08} m={m} />
        </group>
      ))}
    </group>
  );
}

function Globe() {
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return <Bx key={i} p={[Math.sin(a) * 0.14, 0.3, Math.cos(a) * 0.14]} s={[0.03, 0.6, 0.03]} m={MAT.walnut()} r={[Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2]} />;
      })}
      <mesh position={[0, 0.88, 0]} rotation={[0, 0, 0.4]} castShadow>
        <sphereGeometry args={[0.24, 32, 24]} />
        <meshPhysicalMaterial color="#d8c8a0" roughness={0.4} clearcoat={0.8} />
      </mesh>
      <mesh position={[0, 0.88, 0]} rotation={[Math.PI / 2, 0.4, 0]}>
        <torusGeometry args={[0.26, 0.008, 8, 48]} />
        <meshStandardMaterial color="#c9a24a" metalness={1} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Aquarium() {
  return (
    <group>
      <Bx p={[0, 0.4, 0]} s={[1.4, 0.8, 0.5]} m={MAT.walnut()} />
      <Bx p={[0, 1.12, 0]} s={[1.36, 0.62, 0.46]} m={MAT.water()} shadow={false} />
      <Bx p={[0, 1.45, 0]} s={[1.4, 0.04, 0.5]} m={MAT.blackMetal()} />
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[-0.5 + i * 0.25, 1.0 + (i % 2) * 0.15, 0.05 * (i % 3)]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshStandardMaterial color={["#ff8a2a", "#ffd24a", "#2a8aff"][i % 3]} emissive={["#ff6a00", "#ffaa00", "#0060ff"][i % 3]} emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Statue() {
  return (
    <group>
      <Bx p={[0, 0.45, 0]} s={[0.4, 0.9, 0.4]} m={MAT.marble()} />
      <mesh position={[0, 1.2, 0]} castShadow>
        <torusKnotGeometry args={[0.14, 0.045, 96, 12, 2, 3]} />
        <meshStandardMaterial color="#8a5a2a" metalness={1} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Basketball() {
  return (
    <group>
      <Cyl p={[0, 0.5, 0]} r={0.08} h={1.0} m={MAT.glass()} />
      <Cyl p={[0, 0.02, 0]} r={0.14} h={0.04} m={MAT.blackMetal()} />
      <mesh position={[0, 1.13, 0]} castShadow>
        <sphereGeometry args={[0.12, 24, 18]} />
        <meshStandardMaterial color="#c8561c" roughness={0.8} />
      </mesh>
    </group>
  );
}

function ConfTable() {
  return (
    <group>
      <Bx p={[0, 0.74, 0]} s={[5, 0.06, 1.4]} m={MAT.walnut()} />
      {[-1.6, 1.6].map((x) => (
        <Bx key={x} p={[x, 0.37, 0]} s={[0.12, 0.72, 0.9]} m={MAT.blackMetal()} />
      ))}
      {[-1.8, -0.6, 0.6, 1.8].map((x) => (
        <Papers key={x} p={[x, 0.77, 0.3]} />
      ))}
      <Cyl p={[0, 0.8, 0]} r={0.09} h={0.05} m={MAT.blackMetal()} />
    </group>
  );
}

function Reception() {
  const logo = useMemo(() => MAT.brass(), []);
  return (
    <group>
      <Bx p={[0, 0.55, 0.28]} s={[3.4, 1.1, 0.3]} m={MAT.marble()} />
      <Bx p={[0, 1.12, 0.3]} s={[3.5, 0.04, 0.4]} m={MAT.walnut()} />
      <Bx p={[0, 0.72, -0.12]} s={[3.2, 0.04, 0.7]} m={MAT.whiteTop()} />
      <Bx p={[0, 0.9, 0.44]} s={[3.4, 0.03, 0.01]} m={logo} shadow={false} />
      <Monitor p={[0.5, 0.74, -0.15]} rot={0} />
      <Bx p={[-0.8, 0.77, -0.2]} s={[0.2, 0.05, 0.22]} m={MAT.plastic()} />
    </group>
  );
}

function ArchiveShelf() {
  const boxes = useMemo(() => {
    const out: { x: number; y: number; c: string }[] = [];
    let a = 7;
    const r = () => ((a = (a * 16807) % 2147483647) / 2147483647);
    for (const y of [0.25, 0.75, 1.25, 1.75]) for (let x = -2.6; x < 2.6; x += 0.36) if (r() < 0.85) out.push({ x, y, c: r() < 0.7 ? "#c8b48a" : "#8a6a44" });
    return out;
  }, []);
  return (
    <group>
      {[-2.7, -1.35, 0, 1.35, 2.7].map((x) => (
        <Bx key={x} p={[x, 1.1, 0]} s={[0.04, 2.2, 0.45]} m={MAT.steel()} />
      ))}
      {[0.05, 0.55, 1.05, 1.55, 2.05].map((y) => (
        <Bx key={y} p={[0, y, 0]} s={[5.45, 0.02, 0.45]} m={MAT.steel()} />
      ))}
      {boxes.map((b, i) => (
        <Bx key={i} p={[b.x, b.y - 0.02, 0]} s={[0.32, 0.36, 0.4]} m={MAT.fabric(b.c)} shadow={false} />
      ))}
    </group>
  );
}

function Counter() {
  return (
    <group>
      <Bx p={[0, 0.45, 0]} s={[3, 0.9, 0.62]} m={MAT.walnut()} />
      <Bx p={[0, 0.92, 0]} s={[3.04, 0.04, 0.66]} m={MAT.marble()} />
    </group>
  );
}

function Espresso() {
  return (
    <group position={[0, 0.94, 0]}>
      <Bx p={[0, 0.22, 0]} s={[0.42, 0.44, 0.36]} m={MAT.chrome()} />
      <Bx p={[0, 0.2, 0.19]} s={[0.36, 0.18, 0.02]} m={MAT.blackMetal()} />
      <mesh position={[0.12, 0.34, 0.185]}>
        <circleGeometry args={[0.02, 12]} />
        <meshStandardMaterial color="#1a8a3a" emissive="#20ff60" emissiveIntensity={1.4} />
      </mesh>
      <Cyl p={[0, 0.02, 0.1]} r={0.08} h={0.02} m={MAT.blackMetal()} />
      {[-0.1, 0.1].map((x) => (
        <Cyl key={x} p={[x - 0.3, 0.06, 0.05]} r={0.04} rt={0.045} h={0.08} m={MAT.ceramic("#f4f2ee")} />
      ))}
    </group>
  );
}

function RoundTable() {
  return (
    <group>
      <Cyl p={[0, 0.74, 0]} r={0.45} h={0.04} m={MAT.whiteTop()} seg={40} />
      <Cyl p={[0, 0.37, 0]} r={0.04} h={0.72} m={MAT.chrome()} />
      <Cyl p={[0, 0.01, 0]} r={0.25} h={0.02} m={MAT.chrome()} />
    </group>
  );
}

function Copier() {
  return (
    <group>
      <Bx p={[0, 0.5, 0]} s={[1.0, 1.0, 0.66]} m={MAT.ceramic("#dcdcda")} />
      <Bx p={[0, 1.04, 0]} s={[0.9, 0.08, 0.6]} m={MAT.plastic("#3a3b3e")} />
      <Bx p={[0.3, 0.8, 0.34]} s={[0.25, 0.12, 0.02]} m={MAT.screen()} />
    </group>
  );
}

function MailSlots() {
  return (
    <group>
      <Bx p={[0, 0.9, 0]} s={[2.0, 1.8, 0.4]} m={MAT.walnut()} />
      {Array.from({ length: 24 }, (_, i) => (
        <Bx key={i} p={[-0.84 + (i % 8) * 0.24, 0.35 + Math.floor(i / 8) * 0.5, 0.15]} s={[0.2, 0.4, 0.12]} m={MAT.plastic("#120c08")} shadow={false} />
      ))}
    </group>
  );
}

function Wallthing({ type, v = 0 }: { type: FurnitureType; v?: number }) {
  if (type === "art")
    return (
      <group position={[0, 1.6, 0]}>
        <Bx p={[0, 0, 0]} s={[1.24, 0.94, 0.04]} m={MAT.blackMetal()} />
        <mesh position={[0, 0, 0.022]} material={MAT.art(v)}>
          <planeGeometry args={[1.14, 0.84]} />
        </mesh>
      </group>
    );
  if (type === "diplomas")
    return (
      <group position={[0, 1.55, 0]}>
        {[-0.32, 0, 0.32].map((x, i) => (
          <group key={i} position={[x, i === 1 ? 0.12 : 0, 0]}>
            <Bx p={[0, 0, 0]} s={[0.27, 0.34, 0.03]} m={MAT.walnut()} />
            <mesh position={[0, 0, 0.017]} material={MAT.diploma()}>
              <planeGeometry args={[0.22, 0.28]} />
            </mesh>
          </group>
        ))}
      </group>
    );
  if (type === "whiteboard")
    return (
      <group position={[0, 1.4, 0]}>
        <Bx p={[0, 0, 0]} s={[1.6, 1.0, 0.03]} m={MAT.chrome()} />
        <Bx p={[0, 0, 0.017]} s={[1.54, 0.94, 0.005]} m={MAT.whiteTop()} />
      </group>
    );
  if (type === "tv")
    return (
      <group position={[0, 1.5, 0]}>
        <Bx p={[0, 0, 0]} s={[1.6, 0.92, 0.05]} m={MAT.blackMetal()} />
        <mesh position={[0, 0, 0.027]} material={MAT.screen()}>
          <planeGeometry args={[1.54, 0.86]} />
        </mesh>
      </group>
    );
  if (type === "corkboard")
    return (
      <group position={[0, 1.45, 0]}>
        <Bx p={[0, 0, 0]} s={[1.3, 0.9, 0.04]} m={MAT.walnut()} />
        <Bx p={[0, 0, 0.012]} s={[1.22, 0.82, 0.03]} m={MAT.cork()} />
      </group>
    );
  return null;
}

function Piece({ type, v = 0, seed = 1 }: { type: FurnitureType; v?: number; seed?: number }) {
  switch (type) {
    case "desk-exec":
      return <ExecDesk light />;
    case "desk-glass":
      return <ExecDesk glass />;
    case "desk-walnut":
      return <ExecDesk light={v === 1} />;
    case "desk-assistant":
      return <AssistantDesk />;
    case "desk-pod":
      return <Pod />;
    case "chair-office":
      return <OfficeChair />;
    case "chair-exec":
      return <OfficeChair exec leather={v === 1 ? "#5a2a14" : "#161210"} />;
    case "chair-visitor":
      return <VisitorChair c={v === 1 ? "#1a1a1a" : "#3a2418"} />;
    case "sofa":
      return <Sofa c={v === 1 ? "#6a5a4a" : v === 2 ? "#23344a" : "#1f1a17"} leather={v !== 1} />;
    case "armchair":
      return <Sofa w={0.95} c={v === 1 ? "#5a2a14" : "#2a2420"} />;
    case "coffee-table":
      return (
        <group>
          <Bx p={[0, 0.4, 0]} s={[1.2, 0.04, 0.6]} m={MAT.marble()} />
          {[-1, 1].map((s) => (
            <Bx key={s} p={[s * 0.5, 0.2, 0]} s={[0.04, 0.38, 0.5]} m={MAT.brass()} />
          ))}
        </group>
      );
    case "bookshelf":
      return <Bookshelf />;
    case "plant":
      return <Plant seed={seed} />;
    case "plant-tall":
      return <Plant tall seed={seed} />;
    case "lamp-floor":
      return <Lamp />;
    case "rug":
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow material={MAT.rug(v)}>
          <planeGeometry args={[2.6, 1.8]} />
        </mesh>
      );
    case "art":
    case "diplomas":
    case "whiteboard":
    case "tv":
    case "corkboard":
      return <Wallthing type={type} v={v} />;
    case "record-player":
      return <RecordPlayer />;
    case "bar-cart":
      return <BarCart />;
    case "globe":
      return <Globe />;
    case "aquarium":
      return <Aquarium />;
    case "basketball":
      return <Basketball />;
    case "cabinet":
      return (
        <group>
          <Bx p={[0, 0.55, 0]} s={[0.9, 1.1, 0.5]} m={MAT.steel()} />
          {[0.25, 0.6, 0.95].map((y) => (
            <Bx key={y} p={[0, y, 0.255]} s={[0.2, 0.03, 0.02]} m={MAT.chrome()} shadow={false} />
          ))}
        </group>
      );
    case "credenza":
      return (
        <group>
          <Bx p={[0, 0.35, 0]} s={[1.6, 0.7, 0.45]} m={MAT.walnut()} />
          <Papers p={[0.4, 0.71, 0]} />
        </group>
      );
    case "statue":
      return <Statue />;
    case "conf-table":
      return <ConfTable />;
    case "reception-desk":
      return <Reception />;
    case "archive-shelf":
      return <ArchiveShelf />;
    case "counter":
      return <Counter />;
    case "espresso":
      return <Espresso />;
    case "table-round":
      return <RoundTable />;
    case "copier":
      return <Copier />;
    case "mail-slots":
      return <MailSlots />;
    default:
      return null;
  }
}

export const FurnitureItem = memo(function FurnitureItem({ item, ghost }: { item: Placed; ghost?: "ok" | "bad" }) {
  const seed = useMemo(() => item.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0), [item.id]);
  return (
    <group position={[item.x, 0, item.z]} rotation={[0, item.rot, 0]}>
      <Piece type={item.type} v={item.v} seed={seed} />
      {ghost && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={ghost === "ok" ? "#4ad07a" : "#e0503a"} transparent opacity={0.35} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
});
