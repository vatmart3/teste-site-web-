"use client";
/**
 * L'enveloppe de l'étage : sols par pièce (parquet, moquette, marbre), plafond à dalles lumineuses, murs
 * habillés de noyer, cloisons vitrées à bande dépolie et portes coulissantes automatiques, baies vitrées
 * sur Manhattan, noyau d'ascenseurs, mur du logo en laiton, éclairage (soleil couchant + plafonniers).
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { City, type CityLook } from "../room/City";
import { useTextGeometry } from "../room/useBrassText";
import { SceneEnvironment } from "../three/environment";
import { DOORS, FLOOR, ROOMS, WALLS, type Wall } from "./layout";
import { MAT } from "./mats";
import { worldRuntime } from "./runtime";
import { Merged } from "./Merged";

const H = FLOOR.ceiling;

function floorMat(kind: (typeof ROOMS)[number]["floor"], id: string): THREE.Material {
  switch (kind) {
    case "wood":
      return id === "break" ? MAT.oakFloor() : MAT.walnutFloor();
    case "marble":
      return MAT.marble();
    case "tile":
      return MAT.tile();
    default:
      return MAT.carpet(id === "conference" ? "#2a2f3a" : id === "lounge" ? "#3a3530" : "#30353f");
  }
}

function Floors() {
  // Les pièces se recouvrent parfois (open space / accueil) : ordre = priorité, léger décalage vertical.
  return (
    <group>
      {ROOMS.map((r, i) => (
        <mesh key={r.id} rotation={[-Math.PI / 2, 0, 0]} position={[(r.x0 + r.x1) / 2, 0.0005 * (ROOMS.length - i), (r.z0 + r.z1) / 2]} receiveShadow material={floorMat(r.floor, r.id)}>
          <planeGeometry args={[r.x1 - r.x0, r.z1 - r.z0]} />
        </mesh>
      ))}
    </group>
  );
}

function Ceiling() {
  const panels = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = -18; x <= 18; x += 3) for (let z = -10.5; z <= 10.5; z += 3) out.push([x, z]);
    return out;
  }, []);
  const inst = useRef<THREE.InstancedMesh>(null);
  useMemo(() => undefined, []);
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]} material={MAT.ceiling()}>
        <planeGeometry args={[FLOOR.x1 - FLOOR.x0, FLOOR.z1 - FLOOR.z0]} />
      </mesh>
      <instancedMesh
        ref={(m) => {
          if (!m) return;
          (inst as React.MutableRefObject<THREE.InstancedMesh | null>).current = m;
          const o = new THREE.Object3D();
          panels.forEach(([x, z], i) => {
            o.position.set(x, H - 0.01, z);
            o.rotation.set(Math.PI / 2, 0, 0);
            o.updateMatrix();
            m.setMatrixAt(i, o.matrix);
          });
          m.instanceMatrix.needsUpdate = true;
        }}
        args={[undefined, MAT.lightPanel(), panels.length]}
      >
        <planeGeometry args={[1.2, 0.6]} />
      </instancedMesh>
    </group>
  );
}

function WallPiece({ w }: { w: Wall }) {
  const dx = w.b[0] - w.a[0];
  const dz = w.b[1] - w.a[1];
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(-dz, dx);
  const cx = (w.a[0] + w.b[0]) / 2;
  const cz = (w.a[1] + w.b[1]) / 2;
  const h = w.h ?? H;
  if (len < 0.01) return null;
  if (w.kind === "glass" || w.kind === "window") {
    const posts = Math.max(1, Math.round(len / (w.kind === "window" ? 1.6 : 1.5)));
    return (
      <group position={[cx, 0, cz]} rotation={[0, ang, 0]}>
        <mesh position={[0, h / 2, 0]} material={w.kind === "window" ? MAT.windowGlass() : MAT.glass()}>
          <boxGeometry args={[len, h, 0.02]} />
        </mesh>
        {w.kind === "glass" && (
          <mesh position={[0, 1.2, 0]} material={MAT.frosted()}>
            <boxGeometry args={[len, 0.18, 0.024]} />
          </mesh>
        )}
        {Array.from({ length: posts + 1 }, (_, i) => (
          <mesh key={i} position={[-len / 2 + (i * len) / posts, h / 2, 0]} material={MAT.mullion()}>
            <boxGeometry args={[0.05, h, w.kind === "window" ? 0.12 : 0.05]} />
          </mesh>
        ))}
        <mesh position={[0, 0.03, 0]} material={MAT.mullion()}>
          <boxGeometry args={[len, 0.06, w.kind === "window" ? 0.2 : 0.06]} />
        </mesh>
        {w.kind === "window" && (
          <mesh position={[0, 0.25, 0.25]} material={MAT.mullion()}>
            <boxGeometry args={[len, 0.5, 0.3]} />
          </mesh>
        )}
      </group>
    );
  }
  const m = w.kind === "panel" ? MAT.panel() : MAT.plaster();
  return (
    <mesh position={[cx, h / 2, cz]} rotation={[0, ang, 0]} castShadow receiveShadow material={m}>
      <boxGeometry args={[len, h, 0.12]} />
    </mesh>
  );
}

/** Portes vitrées coulissantes : s'ouvrent quand quelqu'un approche. */
function Doors() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const open = useRef(DOORS.map(() => 0));
  useFrame((_, dt) => {
    DOORS.forEach((d, i) => {
      const cx = (d.x0 + d.x1) / 2;
      let near = false;
      for (const a of worldRuntime.agents.values()) {
        if (Math.abs(a.x - cx) < 1.2 && Math.abs(a.z - d.z) < 1.5) {
          near = true;
          break;
        }
      }
      const cur = open.current[i]!;
      const nxt = cur + ((near ? 1 : 0) - cur) * Math.min(1, dt * 5);
      open.current[i] = nxt;
      worldRuntime.doors[d.room] = nxt;
      const g = refs.current[i];
      if (g) g.position.x = -(d.x1 - d.x0) * 0.95 * nxt;
    });
  });
  return (
    <group>
      {DOORS.map((d, i) => {
        const w = d.x1 - d.x0;
        const glassy = d.z === -7.5;
        return (
          <group key={d.room} position={[(d.x0 + d.x1) / 2, 0, d.z]}>
            <group ref={(g) => void (refs.current[i] = g)}>
              <mesh position={[0, H * 0.42, glassy ? 0.05 : 0]} material={glassy ? MAT.glass() : MAT.panel()}>
                <boxGeometry args={[w, H * 0.84, 0.03]} />
              </mesh>
              {glassy && (
                <mesh position={[w * 0.38, 1.05, 0.08]} material={MAT.chrome()}>
                  <boxGeometry args={[0.02, 0.5, 0.03]} />
                </mesh>
              )}
            </group>
            <mesh position={[0, H * 0.92, 0]} material={MAT.mullion()}>
              <boxGeometry args={[w + 0.1, H * 0.16, 0.08]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Logo() {
  const g1 = useTextGeometry("HARLOW & VANCE", 0.28, 0.04);
  const g2 = useTextGeometry("ATTORNEYS AT LAW", 0.08, 0.015);
  return (
    <group position={[0, 1.95, 5.57]}>
      {g1 && <mesh geometry={g1} material={MAT.brass()} castShadow />}
      {g2 && <mesh geometry={g2} material={MAT.brass()} position={[0, -0.34, 0]} />}
      <spotLight position={[0, 1.1, 1.2]} angle={0.7} penumbra={0.6} intensity={6} distance={4} color="#ffe2b0" target-position={[0, 1.95, 5.5]} />
    </group>
  );
}

function Elevators() {
  const n = useTextGeometry("48", 0.1, 0.01);
  return (
    <group>
      {[-2.5, 2.5].map((x) => (
        <group key={x} position={[x, 0, FLOOR.z1 - 0.07]}>
          <mesh position={[0, 1.15, 0]} material={MAT.steel()}>
            <boxGeometry args={[1.6, 2.3, 0.04]} />
          </mesh>
          <mesh position={[0, 1.15, -0.005]} material={MAT.blackMetal()}>
            <boxGeometry args={[0.012, 2.3, 0.045]} />
          </mesh>
          <mesh position={[0, 2.4, 0]} material={MAT.brass()}>
            <boxGeometry args={[1.8, 0.1, 0.05]} />
          </mesh>
          <mesh position={[1.05, 1.1, -0.01]} material={MAT.brass()}>
            <boxGeometry args={[0.1, 0.22, 0.02]} />
          </mesh>
          {n && <mesh geometry={n} position={[0, 2.62, -0.03]} rotation={[0, Math.PI, 0]} material={MAT.lightPanel()} />}
        </group>
      ))}
    </group>
  );
}

/** Lumière du soir : soleil bas à l'ouest, ombres qui suivent le joueur. */
function Lights() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const tgt = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const p = worldRuntime.player;
    const s = sun.current;
    if (!s) return;
    tgt.position.set(p.x, 0, p.z);
    s.position.set(p.x - 14, 12, p.z - 6);
    s.target = tgt;
    tgt.updateMatrixWorld();
  });
  return (
    <>
      <primitive object={tgt} />
      <SceneEnvironment name="lobby" intensity={0.55} />
      <hemisphereLight args={["#fff3e0", "#3a3228", 0.45]} />
      <directionalLight ref={sun} intensity={2.4} color="#ffd2a0" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}>
        <orthographicCamera attach="shadow-camera" args={[-11, 11, 11, -11, 1, 50]} />
      </directionalLight>
      {[
        [-16, -9.6],
        [6.5, -9.6],
        [0, 1],
        [0, 8.5],
      ].map(([x, z], i) => (
        <pointLight key={i} position={[x!, H - 0.4, z!]} intensity={4} distance={12} decay={1.4} color="#ffeedd" />
      ))}
    </>
  );
}

export function Building() {
  const look = useMemo<CityLook>(() => ({ night: 0.35, sunGlow: 1 }), []);
  return (
    <group>
      <City look={look} seed={48} inner={80} groundY={-180} sunDir={[-0.9, 0.08, -0.3]} />
      <Lights />
      <Merged>
        <Floors />
        {WALLS.map((w, i) => (
          <WallPiece key={i} w={w} />
        ))}
      </Merged>
      <Ceiling />
      <Doors />
      <Logo />
      <Elevators />
    </group>
  );
}
