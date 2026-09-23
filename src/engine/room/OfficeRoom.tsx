"use client";
/**
 * Le bureau modélisé en 3D (PBR), du stagiaire à l'associé. Utilisé tant que la vraie plate photo
 * « 08-desk-* » n'est pas fournie : même disposition (étagère, liège, horloge, écran, porte vitrée).
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { RoomKind } from "@/content/types";
import { clockHands, newYorkTime, clock } from "@/lib/time";
import { rig } from "../camera/rig";
import { PBR, useMat } from "../three/pbr";
import { SceneEnvironment } from "../three/environment";
import { bookSpine, cityView, clockFace, diploma, monitorScreen, noteTexture, painting, silhouette } from "./roomTextures";
import { ROOM, roomClock, roomState } from "./roomState";
import { useAudit } from "../audit/state";

let rectInit = false;

type Variant = "day" | "dusk" | "night";
const RANK: Record<RoomKind, number> = { "office-intern": 0, "office-associate": 1, "office-senior": 2, "office-partner": 3 };

/** Active ombres portées / reçues sur tous les maillages d'un groupe. */
function useShadowFlags(ref: React.RefObject<THREE.Object3D | null>, cast = true, receive = true) {
  useEffect(() => {
    ref.current?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !o.userData.noShadow) {
        o.castShadow = cast;
        o.receiveShadow = receive;
      }
    });
  });
}

// ------------------------------------------------------------------ Coque : sol, murs, plafond, plinthes
function Shell({ rank }: { rank: number }) {
  const W = ROOM.sideX * 2;
  const H = ROOM.ceilingY - ROOM.floorY;
  const D = 4.2;
  const wallColor = ["#b9bcb8", "#cfc6b6", "#b8a58a", "#8f8272"][rank]!;
  const wall = useMat(() => PBR.plaster({ color: wallColor, repeat: [3, 2] }), [wallColor]);
  const floor = useMat(() => (rank >= 2 ? PBR.wood(rank === 3 ? "walnut" : "oak", { repeat: [3, 3] }) : PBR.carpet({ color: rank === 0 ? "#3a3d42" : "#2a3040" })), [rank]);
  const ceiling = useMat(() => PBR.plaster({ color: "#d8d6d0", repeat: [3, 3] }), []);
  const base = useMat(() => (rank >= 2 ? PBR.wood("walnut", { repeat: [4, 0.2] }) : new THREE.MeshStandardMaterial({ color: "#2a2a2c", roughness: 0.6 })), [rank]);
  const midY = (ROOM.floorY + ROOM.ceilingY) / 2;
  return (
    <group>
      <mesh position={[0, ROOM.floorY, ROOM.backZ + D / 2]} rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh position={[0, ROOM.ceilingY, ROOM.backZ + D / 2]} rotation={[Math.PI / 2, 0, 0]} material={ceiling}>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh position={[0, midY, ROOM.backZ]} material={wall} receiveShadow>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh position={[-ROOM.sideX, midY, ROOM.backZ + D / 2]} rotation={[0, Math.PI / 2, 0]} material={wall} receiveShadow>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh position={[ROOM.sideX, midY, ROOM.backZ + D / 2]} rotation={[0, -Math.PI / 2, 0]} material={wall} receiveShadow>
        <planeGeometry args={[D, H]} />
      </mesh>
      {/* Plinthe */}
      <mesh position={[0, ROOM.floorY + 0.06, ROOM.backZ + 0.01]} material={base}>
        <boxGeometry args={[W, 0.12, 0.02]} />
      </mesh>
      {rank >= 2 && <Wainscot />}
    </group>
  );
}

/** Lambris en noyer (senior et associé) sur le bas du mur du fond. */
function Wainscot() {
  const wood = useMat(() => PBR.wood("walnut", { repeat: [2, 0.5] }), []);
  const panels = 7;
  const W = ROOM.sideX * 2;
  const h = 0.95;
  return (
    <group position={[0, ROOM.floorY + h / 2, ROOM.backZ + 0.012]}>
      <mesh material={wood} receiveShadow>
        <boxGeometry args={[W, h, 0.02]} />
      </mesh>
      {Array.from({ length: panels }, (_, i) => (
        <mesh key={i} material={wood} position={[-W / 2 + (i + 0.5) * (W / panels), 0.02, 0.014]}>
          <boxGeometry args={[W / panels - 0.08, h - 0.18, 0.012]} />
        </mesh>
      ))}
      <mesh material={wood} position={[0, h / 2, 0.02]}>
        <boxGeometry args={[W, 0.04, 0.04]} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ Bureau
function Desk({ rank }: { rank: number }) {
  const d = ROOM.desk;
  const w = d.x1 - d.x0;
  const depth = d.z0 - d.z1;
  const top = useMat(() => PBR.wood(rank === 0 ? "laminate" : rank === 1 ? "oak" : "walnut", { repeat: [1, 1] }), [rank]);
  const geo = useMemo(() => new RoundedBoxGeometry(w, d.thickness, depth, 4, 0.012), [w, depth, d.thickness]);
  const blotter = useMat(() => PBR.leather({ color: "#1e2a24", repeat: [3, 2] }), []);
  return (
    <group>
      <mesh geometry={geo} material={top} position={[(d.x0 + d.x1) / 2, d.y - d.thickness / 2, (d.z0 + d.z1) / 2]} receiveShadow castShadow />
      {rank >= 1 && (
        <mesh material={blotter} position={[-0.02, d.y + 0.002, -0.72]} receiveShadow>
          <boxGeometry args={[0.62, 0.004, 0.42]} />
        </mesh>
      )}
    </group>
  );
}

// ------------------------------------------------------------------ Bibliothèque
const x0 = -1.78;
const x1 = -1.02;
const shelves = [ROOM.floorY + 0.35, ROOM.floorY + 0.75, ROOM.floorY + 1.15, ROOM.floorY + 1.55, ROOM.floorY + 1.95];

function Bookshelf({ rank }: { rank: number }) {
  const ref = useRef<THREE.Group>(null);
  const wood = useMat(() => PBR.wood(rank === 0 ? "laminate" : "walnut", { repeat: [0.5, 2] }), [rank]);
  const z = ROOM.backZ + 0.17;
  const books = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number; d: number; color: THREE.Color; tilt: number }[] = [];
    let seed = 17;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const palette = ["#5a1e1e", "#1e3a5a", "#23402a", "#4a3a1e", "#3a1e3a", "#6b5a3a", "#2a2a2e", "#7a2a22"];
    for (const sy of shelves.slice(0, 4)) {
      let x = x0 + 0.03;
      while (x < x1 - 0.06) {
        const w = 0.025 + rnd() * 0.035;
        const h = 0.22 + rnd() * 0.1;
        const tilt = rnd() < 0.06 ? 0.25 : 0;
        out.push({ x: x + w / 2, y: sy + 0.02 + h / 2, w, h, d: 0.2 + rnd() * 0.05, color: new THREE.Color(palette[Math.floor(rnd() * palette.length)]!).multiplyScalar(0.8 + rnd() * 0.4), tilt });
        x += w + 0.002 + (tilt ? 0.05 : 0);
        if (rnd() < 0.05) x += 0.08; // un trou sur l'étagère
      }
    }
    return out;
  }, []);
  const bookMesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ map: bookSpine(), roughness: 0.65 });
    const g = new THREE.BoxGeometry(1, 1, 1);
    // Le dos (face +z) porte la texture ; les autres faces restent unies.
    const m = new THREE.InstancedMesh(g, mat, books.length);
    const o = new THREE.Object3D();
    books.forEach((b, i) => {
      o.position.set(b.x, b.y, z + 0.13 - b.d / 2);
      o.rotation.set(0, 0, b.tilt);
      o.scale.set(b.w, b.h, b.d);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, b.color);
    });
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }, [books, z]);
  useShadowFlags(ref);
  return (
    <group ref={ref}>
      {/* Montants, dos, tablettes */}
      <mesh material={wood} position={[x0, ROOM.floorY + 1.05, z]}>
        <boxGeometry args={[0.03, 2.1, 0.32]} />
      </mesh>
      <mesh material={wood} position={[x1, ROOM.floorY + 1.05, z]}>
        <boxGeometry args={[0.03, 2.1, 0.32]} />
      </mesh>
      <mesh material={wood} position={[(x0 + x1) / 2, ROOM.floorY + 1.05, z - 0.15]}>
        <boxGeometry args={[x1 - x0, 2.1, 0.015]} />
      </mesh>
      {shelves.map((y) => (
        <mesh key={y} material={wood} position={[(x0 + x1) / 2, y, z]}>
          <boxGeometry args={[x1 - x0, 0.025, 0.31]} />
        </mesh>
      ))}
      <primitive object={bookMesh} />
      {rank === 3 && <Decanter position={[x1 - 0.12, shelves[3]! + 0.0125, z]} />}
    </group>
  );
}

function Decanter({ position }: { position: [number, number, number] }) {
  const glass = useMat(() => new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.02, transmission: 1, thickness: 0.02, ior: 1.5 }), []);
  const whisky = useMat(() => new THREE.MeshPhysicalMaterial({ color: "#b8651e", roughness: 0.1, transmission: 0.6, thickness: 0.05 }), []);
  return (
    <group position={position}>
      <mesh material={glass} position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.18, 32]} />
      </mesh>
      <mesh material={whisky} position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.046, 0.051, 0.1, 32]} />
      </mesh>
      <mesh material={glass} position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.022, 16, 12]} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ Tableau de liège
const NOTES: { at: [number, number]; size: [number, number]; rot: number; note: Parameters<typeof noteTexture>[0] }[] = [
  { at: [-0.62, 0.3], size: [0.2, 0.2], rot: 0.04, note: { title: "Client", lines: ["Fonds de pension", "des chauffeurs", "−60 M$ / 18 mois"], kind: "paper" } },
  { at: [-0.3, 0.26], size: [0.18, 0.18], rot: -0.06, note: { title: "Meridian HQ", lines: [], kind: "photo" } },
  { at: [-0.16, 0.05], size: [0.15, 0.15], rot: 0.08, note: { title: "Rendu", lines: ["Demain", "8 h 00"], kind: "yellow" } },
  { at: [-0.55, 0.02], size: [0.19, 0.16], rot: -0.03, note: { title: "Cible", lines: ["Meridian Logistics", "4 000 camions", "Nasdaq"], kind: "paper" } },
];

function Corkboard() {
  const ref = useRef<THREE.Group>(null);
  const cork = useMat(() => PBR.cork({ repeat: [1.6, 1] }), []);
  const frame = useMat(() => PBR.wood("oak", { repeat: [1, 0.1] }), []);
  const paper = useMemo(() => NOTES.map((n, i) => new THREE.MeshStandardMaterial({ map: noteTexture(n.note, String(i)), roughness: 0.9 })), []);
  const pin = useMat(() => new THREE.MeshPhysicalMaterial({ color: "#c0201a", roughness: 0.25, clearcoat: 1 }), []);
  const string = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.62, 0.39, 0.012), new THREE.Vector3(-0.45, 0.3, 0.018), new THREE.Vector3(-0.3, 0.34, 0.012)]);
    const curve2 = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.3, 0.34, 0.012), new THREE.Vector3(-0.22, 0.2, 0.018), new THREE.Vector3(-0.16, 0.12, 0.012)]);
    return [new THREE.TubeGeometry(curve, 24, 0.0015, 6), new THREE.TubeGeometry(curve2, 24, 0.0015, 6)];
  }, []);
  const red = useMat(() => new THREE.MeshStandardMaterial({ color: "#a01414", roughness: 0.7 }), []);
  useShadowFlags(ref);
  return (
    <group ref={ref} position={[0, 0, ROOM.backZ + 0.02]}>
      <mesh material={frame} position={[-0.42, 0.18, 0]}>
        <boxGeometry args={[0.86, 0.54, 0.03]} />
      </mesh>
      <mesh material={cork} position={[-0.42, 0.18, 0.017]}>
        <boxGeometry args={[0.8, 0.48, 0.01]} />
      </mesh>
      {NOTES.map((n, i) => (
        <group key={i} position={[n.at[0], n.at[1] - 0.08, 0.024]} rotation={[0, 0, n.rot]}>
          <mesh material={paper[i]}>
            <planeGeometry args={n.size} />
          </mesh>
          <mesh material={pin} position={[0, n.size[1] / 2 - 0.02, 0.008]}>
            <sphereGeometry args={[0.008, 16, 12]} />
          </mesh>
        </group>
      ))}
      {string.map((g, i) => (
        <mesh key={i} geometry={g} material={red} position={[0, -0.08, 0]} />
      ))}
    </group>
  );
}

// ------------------------------------------------------------------ Horloge murale
function WallClock() {
  const hour = useRef<THREE.Mesh>(null);
  const minute = useRef<THREE.Mesh>(null);
  const second = useRef<THREE.Mesh>(null);
  const face = useMat(() => new THREE.MeshStandardMaterial({ map: clockFace(), roughness: 0.6 }), []);
  const rim = useMat(() => new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.35, metalness: 0.2 }), []);
  const glass = useMat(() => new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.03, transmission: 1, thickness: 0.002 }), []);
  const hand = useMat(() => new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.4 }), []);
  const redHand = useMat(() => new THREE.MeshStandardMaterial({ color: "#b01818", roughness: 0.4 }), []);
  useFrame(() => {
    const t = roomClock.mode === "ny" ? newYorkTime() : clock(Math.floor(roomClock.minutes / 60) % 24, Math.floor(roomClock.minutes % 60), Math.floor((roomClock.minutes % 1) * 60));
    const h = clockHands(t);
    if (hour.current) hour.current.rotation.z = (-h.hour * Math.PI) / 180;
    if (minute.current) minute.current.rotation.z = (-h.minute * Math.PI) / 180;
    if (second.current) second.current.rotation.z = (-h.second * Math.PI) / 180;
  });
  const R = 0.14;
  return (
    <group position={[0.16, 0.34, ROOM.backZ + 0.03]}>
      <mesh material={rim} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R + 0.012, R + 0.012, 0.045, 48, 1, true]} />
      </mesh>
      <mesh material={rim} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.02]}>
        <cylinderGeometry args={[R + 0.012, R + 0.012, 0.005, 48]} />
      </mesh>
      <mesh material={face} position={[0, 0, 0]}>
        <circleGeometry args={[R, 64]} />
      </mesh>
      <mesh ref={hour} material={hand} position={[0, 0, 0.004]}>
        <boxGeometry args={[0.012, 0.075, 0.003]} onUpdate={(g) => g.translate(0, 0.03, 0)} />
      </mesh>
      <mesh ref={minute} material={hand} position={[0, 0, 0.007]}>
        <boxGeometry args={[0.007, 0.115, 0.003]} onUpdate={(g) => g.translate(0, 0.05, 0)} />
      </mesh>
      <mesh ref={second} material={redHand} position={[0, 0, 0.01]}>
        <boxGeometry args={[0.003, 0.13, 0.002]} onUpdate={(g) => g.translate(0, 0.045, 0)} />
      </mesh>
      <mesh material={glass} position={[0, 0, 0.022]} userData={{ noShadow: true }}>
        <circleGeometry args={[R + 0.004, 64]} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ Écran d'ordinateur (+ clavier)
export const MONITOR_POS: [number, number, number] = [0.2, ROOM.desk.y, -1.0];

function Monitor({ keyboard }: { keyboard: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const bezel = useMat(() => new THREE.MeshStandardMaterial({ color: "#121316", roughness: 0.45, metalness: 0.3 }), []);
  const screen = useMat(() => new THREE.MeshStandardMaterial({ map: monitorScreen(), emissiveMap: monitorScreen(), emissive: "#ffffff", emissiveIntensity: 1.1, roughness: 0.25 }), []);
  const stand = useMat(() => PBR.steel({ color: "#8a8f96" }), []);
  const keys = useMat(() => new THREE.MeshStandardMaterial({ color: "#1b1c20", roughness: 0.55 }), []);
  const geo = useMemo(() => ({ bezel: new RoundedBoxGeometry(0.6, 0.36, 0.025, 3, 0.008), kb: new RoundedBoxGeometry(0.42, 0.018, 0.14, 3, 0.006) }), []);
  useShadowFlags(ref);
  return (
    <group ref={ref}>
      <group position={MONITOR_POS}>
        <mesh material={stand} position={[0, 0.005, 0]}>
          <boxGeometry args={[0.22, 0.01, 0.16]} />
        </mesh>
        <mesh material={stand} position={[0, 0.13, -0.03]}>
          <boxGeometry args={[0.05, 0.24, 0.02]} />
        </mesh>
        <mesh geometry={geo.bezel} material={bezel} position={[0, 0.34, 0]} />
        <mesh material={screen} position={[0, 0.345, 0.0131]} userData={{ noShadow: true }}>
          <planeGeometry args={[0.575, 0.325]} />
        </mesh>
      </group>
      {keyboard && <mesh geometry={geo.kb} material={keys} position={[0.2, ROOM.desk.y + 0.009, -0.85]} rotation={[0, -0.04, 0]} />}
    </group>
  );
}

// ------------------------------------------------------------------ Porte vitrée dépolie (+ silhouette qui passe)
function Door() {
  const ref = useRef<THREE.Group>(null);
  const passer = useRef<THREE.Mesh>(null);
  const frame = useMat(() => new THREE.MeshStandardMaterial({ color: "#16171b", roughness: 0.5, metalness: 0.4 }), []);
  const glass = useMat(() => new THREE.MeshPhysicalMaterial({ color: "#e8eef2", roughness: 0.55, transmission: 1, thickness: 0.01, ior: 1.5 }), []);
  const corridor = useMat(() => new THREE.MeshStandardMaterial({ color: "#000", emissive: "#f2f4ff", emissiveIntensity: 1.2 }), []);
  const who = useMat(() => new THREE.MeshBasicMaterial({ map: silhouette(), transparent: true }), []);
  const handle = useMat(() => PBR.brass(), []);
  const x = 1.35;
  const w = 0.9;
  const h = 2.12;
  const y = ROOM.floorY + h / 2;
  useFrame(() => {
    const p = passer.current;
    if (!p) return;
    p.visible = roomState.passerby.visible;
    p.position.x = x + roomState.passerby.x * (w * 0.8);
  });
  useShadowFlags(ref, false, true);
  return (
    <group ref={ref}>
      {/* Couloir lumineux derrière la porte */}
      <mesh material={corridor} position={[x, y, ROOM.backZ - 0.6]} userData={{ noShadow: true }}>
        <planeGeometry args={[w + 0.6, h + 0.3]} />
      </mesh>
      <mesh ref={passer} material={who} position={[x, y - 0.05, ROOM.backZ - 0.35]} userData={{ noShadow: true }}>
        <planeGeometry args={[0.55, 1.8]} />
      </mesh>
      <group position={[x, y, ROOM.backZ]}>
        {/* Huisserie */}
        <mesh material={frame} position={[-w / 2 - 0.03, 0, 0.02]}>
          <boxGeometry args={[0.06, h + 0.06, 0.06]} />
        </mesh>
        <mesh material={frame} position={[w / 2 + 0.03, 0, 0.02]}>
          <boxGeometry args={[0.06, h + 0.06, 0.06]} />
        </mesh>
        <mesh material={frame} position={[0, h / 2 + 0.03, 0.02]}>
          <boxGeometry args={[w + 0.12, 0.06, 0.06]} />
        </mesh>
        {/* Vantail : cadre + vitre dépolie */}
        <mesh material={frame} position={[0, -h / 2 + 0.12, 0.01]}>
          <boxGeometry args={[w, 0.24, 0.04]} />
        </mesh>
        <mesh material={frame} position={[0, h / 2 - 0.05, 0.01]}>
          <boxGeometry args={[w, 0.1, 0.04]} />
        </mesh>
        <mesh material={frame} position={[-w / 2 + 0.04, 0, 0.01]}>
          <boxGeometry args={[0.08, h, 0.04]} />
        </mesh>
        <mesh material={frame} position={[w / 2 - 0.04, 0, 0.01]}>
          <boxGeometry args={[0.08, h, 0.04]} />
        </mesh>
        <mesh material={glass} position={[0, 0.07, 0.01]} userData={{ noShadow: true }}>
          <boxGeometry args={[w - 0.16, h - 0.34, 0.008]} />
        </mesh>
        <mesh material={handle} position={[-w / 2 + 0.1, -0.08, 0.05]}>
          <boxGeometry args={[0.018, 0.28, 0.018]} />
        </mesh>
      </group>
    </group>
  );
}

// ------------------------------------------------------------------ Fenêtre (collaborateur et plus)
function Window({ rank, variant }: { rank: number; variant: Variant }) {
  const view = useMat(() => new THREE.MeshBasicMaterial({ map: cityView(variant), toneMapped: true }), [variant]);
  const frame = useMat(() => new THREE.MeshStandardMaterial({ color: "#1a1b1f", roughness: 0.4, metalness: 0.5 }), []);
  const w = rank === 1 ? 0.7 : rank === 2 ? 1.0 : 1.3;
  const h = rank === 1 ? 0.55 : 0.9;
  const cx = rank === 1 ? 0.62 : 0.55;
  const cy = rank === 1 ? 0.62 : 0.55;
  const wall = ROOM.backZ;
  return (
    <group>
      {/* Vue : plan lointain, flouté par la profondeur de champ */}
      <mesh material={view} position={[cx, cy - 0.2, wall - 4]} userData={{ noShadow: true }}>
        <planeGeometry args={[w * 4.2, h * 3.4]} />
      </mesh>
      {/* Embrasure : on masque le mur autour de la fenêtre avec 4 bandes (le mur est un plan unique) */}
      <group position={[cx, cy, wall + 0.005]}>
        {[
          [0, h / 2 + 0.025, w + 0.1, 0.05],
          [0, -h / 2 - 0.025, w + 0.1, 0.05],
          [-w / 2 - 0.025, 0, 0.05, h],
          [w / 2 + 0.025, 0, 0.05, h],
          [0, 0, 0.03, h],
        ].map(([x, y, bw, bh], i) => (
          <mesh key={i} material={frame} position={[x!, y!, 0.02]}>
            <boxGeometry args={[bw!, bh!, 0.05]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ------------------------------------------------------------------ Lampe de banquier
export const LAMP_POS: [number, number, number] = [-0.6, ROOM.desk.y, -1.02];

function BankersLamp() {
  const ref = useRef<THREE.Group>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const glow = useRef<THREE.PointLight>(null);
  const inner = useRef<THREE.MeshStandardMaterial>(null);
  const brass = useMat(() => PBR.brass({ color: "#c7a052" }), []);
  const shade = useMat(() => new THREE.MeshPhysicalMaterial({ color: "#0d5a33", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.FrontSide }), []);
  const target = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    if (spot.current) spot.current.target = target;
  }, [target]);
  useFrame(() => {
    const on = roomState.lamp;
    if (spot.current) spot.current.intensity = 7 * on;
    if (glow.current) glow.current.intensity = 0.35 * on;
    if (inner.current) inner.current.emissiveIntensity = 0.3 * on;
  });
  useShadowFlags(ref, true, false);
  return (
    <group ref={ref} position={LAMP_POS}>
      <mesh material={brass} position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.07, 0.085, 0.024, 40]} />
      </mesh>
      <mesh material={brass} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.36, 16]} />
      </mesh>
      <mesh material={brass} position={[0, 0.37, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.08, 12]} />
      </mesh>
      {/* Abat-jour : demi-cylindre vert, intérieur blanc lumineux */}
      <group position={[0, 0.39, 0.06]} rotation={[0, 0, Math.PI / 2]}>
        <mesh material={shade} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.34, 48, 1, true, Math.PI, Math.PI]} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.073, 0.073, 0.335, 48, 1, true, 0, Math.PI]} />
          <meshStandardMaterial ref={inner} color="#d8cdb8" emissive="#ffd9a0" emissiveIntensity={0.3} roughness={0.8} side={THREE.BackSide} />
        </mesh>
      </group>
      <mesh material={brass} position={[0.12, 0.3, 0.08]}>
        <cylinderGeometry args={[0.002, 0.002, 0.14, 6]} />
      </mesh>
      <mesh material={brass} position={[0.12, 0.225, 0.08]}>
        <sphereGeometry args={[0.007, 12, 8]} />
      </mesh>
      <primitive object={target} position={[0.3, -0.42, 0.28]} />
      <spotLight
        ref={spot}
        position={[0, 0.36, 0.07]}
        angle={1.05}
        penumbra={0.85}
        decay={2}
        distance={4}
        color="#ffd6a0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.015}
        shadow-camera-near={0.05}
        shadow-camera-far={3}
      />
      <pointLight ref={glow} position={[0, 0.38, 0.06]} color="#ffcf90" distance={0.9} decay={2} />
    </group>
  );
}

// ------------------------------------------------------------------ Plante en plastique (stagiaire)
function PlasticPlant() {
  const ref = useRef<THREE.Group>(null);
  const pot = useMat(() => new THREE.MeshStandardMaterial({ color: "#d9d4ca", roughness: 0.35 }), []);
  const leafMat = useMat(() => new THREE.MeshPhysicalMaterial({ color: "#3f7a3a", roughness: 0.3, clearcoat: 0.6, side: THREE.DoubleSide }), []);
  const leaves = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.03, 0.08, 0, 0.18);
    shape.quadraticCurveTo(-0.03, 0.08, 0, 0);
    const g = new THREE.ShapeGeometry(shape, 8);
    const m = new THREE.InstancedMesh(g, leafMat, 18);
    const o = new THREE.Object3D();
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      o.position.set(0, 0.16, 0);
      o.rotation.set(0.5 + (i % 3) * 0.25, a, 0);
      o.scale.setScalar(0.8 + (i % 4) * 0.12);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.castShadow = true;
    return m;
  }, [leafMat]);
  useShadowFlags(ref);
  return (
    <group ref={ref} position={[0.68, ROOM.desk.y, -1.02]}>
      <mesh material={pot} position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.06, 0.045, 0.14, 32]} />
      </mesh>
      <primitive object={leaves} />
    </group>
  );
}

// ------------------------------------------------------------------ Cadres (senior / associé)
function Frames({ rank }: { rank: number }) {
  const frame = useMat(() => new THREE.MeshStandardMaterial({ color: "#15110d", roughness: 0.5 }), []);
  const dip = useMat(() => new THREE.MeshStandardMaterial({ map: diploma(), roughness: 0.8 }), []);
  const art = useMat(() => new THREE.MeshStandardMaterial({ map: painting(), roughness: 0.9 }), []);
  const items: { pos: [number, number]; size: [number, number]; mat: THREE.Material }[] =
    rank === 3 ? [{ pos: [-0.62, 0.72], size: [0.36, 0.48], mat: art }] : [];
  if (rank >= 2) items.push({ pos: [0.95, 0.62], size: [0.26, 0.19], mat: dip });
  return (
    <group position={[0, 0, ROOM.backZ + 0.02]}>
      {items.map((it, i) => (
        <group key={i} position={[it.pos[0], it.pos[1], 0]}>
          <mesh material={frame}>
            <boxGeometry args={[it.size[0] + 0.04, it.size[1] + 0.04, 0.025]} />
          </mesh>
          <mesh material={it.mat} position={[0, 0, 0.0135]}>
            <planeGeometry args={it.size} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ------------------------------------------------------------------ Lumières de la pièce
function RoomLights({ rank, variant }: { rank: number; variant: Variant }) {
  const neon = useRef<THREE.RectAreaLight>(null);
  const tube = useRef<THREE.MeshStandardMaterial>(null);
  if (!rectInit && typeof window !== "undefined") {
    RectAreaLightUniformsLib.init();
    rectInit = true;
  }
  useFrame(({ clock }) => {
    // Néon qui grésille (stagiaire) : coupures brèves et irrégulières.
    const t = clock.elapsedTime;
    const cut = rank === 0 && !rig.reducedMotion && Math.sin(t * 13.7) * Math.sin(t * 3.1) > 0.93 ? 0.35 : 1;
    const k = roomState.neon * cut;
    if (neon.current) neon.current.intensity = (rank === 0 ? 5.5 : 2.2) * k * (variant === "day" ? 0.4 : 1);
    if (tube.current) tube.current.emissiveIntensity = 3 * k;
  });
  const sun = variant === "day" ? 2.4 : variant === "dusk" ? 1.4 : 0;
  return (
    <group>
      <rectAreaLight ref={neon} position={[0, ROOM.ceilingY - 0.02, -1.0]} rotation={[-Math.PI / 2, 0, 0]} width={1.2} height={0.18} color={rank === 0 ? "#dfe9ff" : "#fff1dc"} intensity={4} />
      <mesh position={[0, ROOM.ceilingY - 0.015, -1.0]} rotation={[Math.PI / 2, 0, 0]} userData={{ noShadow: true }}>
        <planeGeometry args={[1.2, 0.18]} />
        <meshStandardMaterial ref={tube} color="#ffffff" emissive={rank === 0 ? "#e8f0ff" : "#fff3e0"} emissiveIntensity={3} />
      </mesh>
      {rank >= 1 && sun > 0 && (
        <directionalLight
          position={[0.6, 1.2, -5]}
          intensity={sun}
          color={variant === "dusk" ? "#ffb070" : "#fff6e8"}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-2}
          shadow-camera-right={2}
          shadow-camera-top={2}
          shadow-camera-bottom={-2}
          shadow-bias={-0.0005}
        />
      )}
      {/* Rebond chaud très doux (remplace l'illumination globale) */}
      <hemisphereLight args={["#fff2e0", "#2a2018", variant === "night" ? 0.12 : 0.35]} />
    </group>
  );
}

// ------------------------------------------------------------------ Pièce complète
export function OfficeRoom({ kind, variant }: { kind: RoomKind; variant: Variant }) {
  const rank = RANK[kind];
  const audit = useAudit((s) => s.active);
  return (
    <group>
      <SceneEnvironment name="apartment" intensity={variant === "night" ? 0.16 : variant === "dusk" ? 0.3 : 0.5} />
      <Shell rank={rank} />
      <Desk rank={rank} />
      <Bookshelf rank={rank} />
      <Corkboard />
      <WallClock />
      <Monitor keyboard={!audit} />
      <Door />
      {rank >= 1 && <Window rank={rank} variant={variant} />}
      {rank >= 2 && <Frames rank={rank} />}
      {rank === 0 && <PlasticPlant />}
      <BankersLamp />
      <RoomLights rank={rank} variant={variant} />
    </group>
  );
}

/** Cible de clic / de survol des éléments du décor 3D (étagère, liège, écran, porte). */
export const ROOM_HOTSPOTS = {
  library: { position: [-1.4, ROOM.floorY + 1.2, ROOM.backZ + 0.2] as [number, number, number], size: [0.8, 1.6, 0.3] as [number, number, number] },
  board: { position: [-0.42, 0.1, ROOM.backZ + 0.04] as [number, number, number], size: [0.86, 0.54, 0.04] as [number, number, number] },
  terminal: { position: [MONITOR_POS[0], MONITOR_POS[1] + 0.34, MONITOR_POS[2]] as [number, number, number], size: [0.6, 0.36, 0.03] as [number, number, number] },
  door: { position: [1.35, ROOM.floorY + 1.06, ROOM.backZ + 0.03] as [number, number, number], size: [0.95, 2.15, 0.06] as [number, number, number] },
} as const;
