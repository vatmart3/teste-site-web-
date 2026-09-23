"use client";
/**
 * Tableau d'enquête en 3D sur le liège du bureau : pièces punaisées (cartes peintes), et le fil rouge que
 * l'on tire à la souris / au doigt d'une punaise à une autre. Le fil est une corde de Verlet : il pend, se
 * balance, se tend quand la connexion est juste (fiche bristol épinglée au milieu), tombe si elle est fausse.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { audio } from "../audio/AudioEngine";
import { makeRope, stepRope, tighten, TAUT_ITERATIONS, type Rope } from "./logic";
import { BOARD_CORK, boardBus, boardFx, pieceWorld, useBoard } from "./state";
import type { BoardLink, BoardPiece } from "./types";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";

function cardSize(p: BoardPiece): [number, number] {
  return p.kind === "photo" ? [0.14, 0.15] : p.kind === "quote" ? [0.19, 0.12] : p.kind === "note" ? [0.15, 0.13] : [0.18, 0.125];
}

function cardTexture(p: BoardPiece): THREE.CanvasTexture {
  const [w, h] = cardSize(p);
  const W = 640;
  const H = Math.round((W * h) / w);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  const bg = p.kind === "note" ? "#f3e27a" : p.kind === "quote" ? "#eef2f6" : "#f4efe2";
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  // grain du papier
  for (let i = 0; i < 2500; i++) {
    x.fillStyle = `rgba(80,60,30,${Math.random() * 0.04})`;
    x.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  const pad = 34;
  let y = pad + 8;
  if (p.kind === "photo") {
    const ph = H * 0.52;
    const g = x.createLinearGradient(0, pad, 0, pad + ph);
    g.addColorStop(0, "#6d7278");
    g.addColorStop(1, "#2c2f33");
    x.fillStyle = g;
    x.fillRect(pad, pad, W - pad * 2, ph);
    // entrepôt : portes de quai
    x.fillStyle = "#1c1e21";
    for (let k = 0; k < 5; k++) x.fillRect(pad + 30 + k * 110, pad + ph * 0.45, 80, ph * 0.5);
    x.fillStyle = "rgba(255,255,255,0.06)";
    x.fillRect(pad, pad, W - pad * 2, ph * 0.3);
    y = pad + ph + 44;
  }
  x.fillStyle = p.kind === "quote" ? "#1c3a66" : "#8a2a1e";
  x.font = `bold 34px ${SANS}`;
  x.textBaseline = "alphabetic";
  const title = p.title.toUpperCase();
  x.fillText(title.length > 30 ? title.slice(0, 29) + "…" : title, pad, y);
  y += 16;
  x.fillStyle = "#b8a888";
  x.fillRect(pad, y, W - pad * 2, 3);
  y += 48;
  x.fillStyle = "#231d16";
  x.font = `${p.kind === "quote" ? "italic " : ""}38px ${SERIF}`;
  for (const l of p.lines) {
    x.fillText(l, pad, y);
    y += 48;
  }
  x.fillStyle = "#7a6c58";
  x.font = `26px ${SANS}`;
  x.fillText(p.source, pad, H - pad + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function linkCardTexture(l: BoardLink): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 560;
  c.height = 200;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fbfaf4";
  x.fillRect(0, 0, 560, 200);
  x.strokeStyle = "#c33";
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(0, 62);
  x.lineTo(560, 62);
  x.stroke();
  x.fillStyle = "#b01818";
  x.font = `bold 40px 'Caveat', 'Comic Sans MS', cursive`;
  x.fillText(l.title, 22, 48);
  x.fillStyle = "#2a2a2a";
  x.font = `30px 'Caveat', 'Comic Sans MS', cursive`;
  const words = l.insight.split(" ");
  let line = "";
  let y = 104;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (x.measureText(test).width > 520) {
      x.fillText(line, 22, y);
      y += 34;
      line = w;
      if (y > 190) break;
    } else line = test;
  }
  if (y <= 190) x.fillText(line, 22, y);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Position de la punaise (haut de la carte, légèrement devant le liège). */
function pinOf(p: BoardPiece): [number, number, number] {
  const [x, y, z] = pieceWorld(p.at);
  const [, h] = cardSize(p);
  return [x + Math.sin(-p.rot) * (h / 2 - 0.018), y + Math.cos(p.rot) * (h / 2 - 0.018), z + 0.012];
}

const ROPE_POINTS = 18;

/** Un fil rouge simulé, reconstruit en tube à chaque frame. */
function RopeMesh({ from, to, taut, falling, onGone }: { from: () => [number, number, number]; to: () => [number, number, number]; taut: boolean; falling?: boolean; onGone?: () => void }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a3121a", roughness: 0.65, emissive: "#ff2a2a", emissiveIntensity: 0 }), []);
  const rope = useRef<Rope | null>(null);
  const fall = useRef({ y: 0, v: 0, t: 0 });
  const curve = useMemo(() => new THREE.CatmullRomCurve3(Array.from({ length: ROPE_POINTS }, () => new THREE.Vector3())), []);
  const empty = useMemo(() => new THREE.BufferGeometry(), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((_, dt) => {
    const a = from();
    let b = to();
    if (!rope.current) rope.current = makeRope(ROPE_POINTS, a, b, 1.18);
    const r = rope.current;
    if (falling) {
      const f = fall.current;
      f.v += 9.8 * Math.min(dt, 0.05) * 0.35;
      f.y -= f.v * Math.min(dt, 0.05);
      f.t += dt;
      b = [b[0], b[1] + f.y, b[2] + 0.04];
      mat.opacity = Math.max(0, 1 - f.t / 1.2);
      mat.transparent = true;
      if (f.t > 1.2) onGone?.();
    }
    if (taut) tighten(r, a, b);
    stepRope(r, Math.min(dt, 1 / 30), a, b, { iterations: taut ? TAUT_ITERATIONS : 10, zMin: BOARD_CORK.z + 0.004, gravity: -4 });
    for (let i = 0; i < ROPE_POINTS; i++) curve.points[i]!.set(r.p[i * 3]!, r.p[i * 3 + 1]!, r.p[i * 3 + 2]!);
    const m = mesh.current;
    if (!m) return;
    m.geometry.dispose();
    m.geometry = new THREE.TubeGeometry(curve, 48, 0.0016, 6, false);
    mat.emissiveIntensity = taut ? boardFx.flash * 3 : 0;
  });
  return <mesh ref={mesh} material={mat} castShadow geometry={empty} />;
}

export function Board3D() {
  const def = useBoard((s) => s.def);
  const found = useBoard((s) => s.found);
  const selected = useBoard((s) => s.selected);
  const { camera, gl, raycaster } = useThree();
  const cards = useRef(new Map<string, THREE.Mesh>());
  const textures = useMemo(() => new Map(def?.pieces.map((p) => [p.id, cardTexture(p)]) ?? []), [def]);
  const linkTextures = useMemo(() => new Map(def?.links.map((l) => [l.id, linkCardTexture(l)]) ?? []), [def]);
  const pinMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#c0201a", roughness: 0.25, clearcoat: 1 }), []);
  const [drag, setDrag] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [falling, setFalling] = useState<{ a: string; b: [number, number, number]; id: number }[]>([]);
  const cursor = useRef<[number, number, number]>([0, 0, BOARD_CORK.z + 0.05]);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -(BOARD_CORK.z + 0.04)), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    if (!drag) return;
    const el = gl.domElement;
    const toNdc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
    };
    const move = (e: PointerEvent) => {
      toNdc(e);
      if (raycaster.ray.intersectPlane(plane, hit)) cursor.current = [hit.x, hit.y, hit.z + 0.02];
    };
    const up = (e: PointerEvent) => {
      toNdc(e);
      const hits = raycaster.intersectObjects([...cards.current.values()], false);
      const target = hits[0]?.object.userData.piece as string | undefined;
      const from = drag;
      setDrag(null);
      el.style.cursor = "";
      if (target && target !== from) boardBus.emit({ type: "connect", a: from, b: target });
      else if (from) {
        // fil lâché dans le vide : il retombe
        setFalling((f) => [...f, { a: from, b: cursor.current, id: Date.now() }]);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, gl, camera, raycaster, plane, hit, ndc]);

  // Connexion fausse : le fil tombe depuis la pièce de départ (effet déclenché par la séquence).
  const lastWrongT = useRef(0);
  useFrame(() => {
    boardFx.flash = Math.max(0, boardFx.flash - 0.02);
    if (boardFx.lastWrong.t !== lastWrongT.current && def) {
      lastWrongT.current = boardFx.lastWrong.t;
      const pb = def.pieces.find((p) => p.id === boardFx.lastWrong.b);
      if (pb) setFalling((f) => [...f, { a: boardFx.lastWrong.a, b: pinOf(pb), id: Date.now() }]);
    }
  });

  if (!def) return null;
  const byId = new Map(def.pieces.map((p) => [p.id, p]));
  const down = (id: string) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const p = byId.get(id);
    if (!p) return;
    cursor.current = pinOf(p);
    setDrag(id);
    gl.domElement.style.cursor = "grabbing";
    void audio.sfx("sfx-pin", { volume: 0.5, rate: 1.2 });
  };

  return (
    <group>
      {def.pieces.map((p) => {
        const [x, y, z] = pieceWorld(p.at);
        const [w, h] = cardSize(p);
        const lift = hover === p.id || drag === p.id || selected === p.id ? 0.006 : 0;
        return (
          <group key={p.id} position={[x, y, z + lift]} rotation={[0, 0, p.rot]}>
            <mesh
              ref={(m) => {
                if (m) {
                  m.userData.piece = p.id;
                  cards.current.set(p.id, m);
                } else cards.current.delete(p.id);
              }}
              onPointerDown={down(p.id)}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHover(p.id);
                if (!drag) gl.domElement.style.cursor = "grab";
              }}
              onPointerOut={() => {
                setHover((h2) => (h2 === p.id ? null : h2));
                if (!drag) gl.domElement.style.cursor = "";
              }}
              castShadow
              receiveShadow
            >
              <planeGeometry args={[w, h]} />
              <meshStandardMaterial map={textures.get(p.id)} roughness={0.85} emissive={selected === p.id ? "#402a08" : "#000"} />
            </mesh>
            <mesh material={pinMat} position={[0, h / 2 - 0.018, 0.009]} castShadow>
              <sphereGeometry args={[0.0085, 16, 12]} />
            </mesh>
            <mesh position={[0, h / 2 - 0.018, 0.004]}>
              <cylinderGeometry args={[0.0012, 0.0012, 0.012, 6]} />
              <meshStandardMaterial color="#bbb" metalness={1} roughness={0.3} />
            </mesh>
          </group>
        );
      })}
      {/* Connexions établies : fil tendu + fiche bristol au milieu */}
      {def.links
        .filter((l) => found.includes(l.id))
        .map((l) => {
          const a = byId.get(l.a)!;
          const b = byId.get(l.b)!;
          const pa = pinOf(a);
          const pb = pinOf(b);
          const mid: [number, number, number] = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 - 0.035, BOARD_CORK.z + 0.018];
          return (
            <group key={l.id}>
              <RopeMesh from={() => pa} to={() => pb} taut />
              <mesh position={mid} rotation={[0, 0, (l.id.length % 3) * 0.03 - 0.03]} castShadow>
                <planeGeometry args={[0.14, 0.05]} />
                <meshStandardMaterial map={linkTextures.get(l.id)} roughness={0.9} />
              </mesh>
            </group>
          );
        })}
      {/* Fil en cours de tirage */}
      {drag && byId.get(drag) && <RopeMesh key={`drag-${drag}`} from={() => pinOf(byId.get(drag)!)} to={() => cursor.current} taut={false} />}
      {falling.map((f) => (
        <RopeMesh key={f.id} from={() => pinOf(byId.get(f.a)!)} to={() => f.b} taut={false} falling onGone={() => setFalling((xs) => xs.filter((x) => x.id !== f.id))} />
      ))}
    </group>
  );
}
