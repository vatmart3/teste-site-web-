"use client";
/**
 * Personnages 3D expressifs (acteurs) : visage sculpté (sphère déformée : mâchoire, pommettes, orbites,
 * arcade), yeux qui clignent et suivent une cible, sourcils et commissures expressifs, bouche animée par la
 * voix, coiffures, barbe, lunettes, robe de juge. Le corps prend des poses (debout, assis à la barre, au
 * banc) et des gestes superposés : parler avec la main, desserrer sa cravate, tapoter un stylo, croiser les
 * bras, se prendre la tête dans les mains.
 *
 * L'état de jeu (idle, talk, pleased, tense, break) vient de `cast` ; les micro-signes (déglutir, regard qui
 * fuit, sueur, cravate) de `actorTells` : ce sont des indices de gameplay (pression sur le témoin).
 * Quand les vraies vidéos de personnages (annexe B) sont fournies, les plans en gros plan les utilisent.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CharacterId, CharacterState } from "@/content/characters";
import { rig } from "../camera/rig";
import { cast, stateOf } from "../characters/performance";

export type HairStyle = "swept" | "receding" | "bob" | "short" | "bun" | "crew" | "styled";

export interface ActorLook {
  gender: "m" | "f";
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  iris: string;
  suit: string;
  shirt: string;
  tie: string | null;
  lips?: string;
  height: number;
  build: number;
  /** Mâchoire (1 = moyenne, 1,25 = lourde). */
  jaw?: number;
  beard?: boolean;
  glasses?: "reading" | "round" | null;
  robe?: boolean;
}

export const LOOKS: Record<CharacterId, ActorLook> = {
  harlow: { gender: "m", skin: "#caa08a", hair: "#c9c6c0", hairStyle: "swept", iris: "#5b7a8c", suit: "#1a2236", shirt: "#e8ebf0", tie: "#4a1016", height: 1.84, build: 1.05, beard: true },
  nora: { gender: "f", skin: "#8d5a3d", hair: "#1c120c", hairStyle: "bun", iris: "#3b2414", suit: "#e6dcc8", shirt: "#e6dcc8", tie: null, lips: "#7a3a30", height: 1.68, build: 0.86 },
  mercer: { gender: "m", skin: "#dcb293", hair: "#b39058", hairStyle: "styled", iris: "#4a6a8a", suit: "#2c2e33", shirt: "#dfe4ea", tie: null, height: 1.83, build: 0.98 },
  theo: { gender: "m", skin: "#d8b08c", hair: "#16110d", hairStyle: "short", iris: "#2b1c12", suit: "#dfe4ea", shirt: "#dfe4ea", tie: "#2a3450", height: 1.76, build: 0.92, glasses: "round" },
  rourke: { gender: "m", skin: "#d49f86", hair: "#2a211b", hairStyle: "receding", iris: "#3a2a1c", suit: "#5a5d63", shirt: "#e9ecef", tie: "#1f3b5a", height: 1.8, build: 1.16, jaw: 1.25 },
  brandt: { gender: "f", skin: "#e2bba0", hair: "#0d0c0c", hairStyle: "bob", iris: "#2e2a26", suit: "#111114", shirt: "#f1f1ef", tie: null, lips: "#9a1522", height: 1.72, build: 0.88 },
  whitford: { gender: "f", skin: "#dcb8a0", hair: "#ecebe8", hairStyle: "short", iris: "#5a6a70", suit: "#0c0c0f", shirt: "#e8e8e8", tie: null, lips: "#a0605a", height: 1.66, build: 0.9, glasses: "reading", robe: true },
  guard: { gender: "m", skin: "#a8785a", hair: "#8a8a8a", hairStyle: "crew", iris: "#3a2a1c", suit: "#18223a", shirt: "#c9ccd6", tie: "#0c1020", height: 1.82, build: 1.14, jaw: 1.15 },
};

export type ActorPose = "stand" | "sit" | "witness" | "bench";

/** Micro-signes pilotés par le jeu (0..1), par personnage. */
export interface Tells {
  sweat: number;
  gazeAway: number;
  swallow: number;
  loosenTie: number;
  penTap: number;
  armsCrossed: number;
  headInHands: number;
  surprise: number;
}

export const actorTells: Partial<Record<CharacterId, Tells>> = {};
const NO_TELLS: Tells = { sweat: 0, gazeAway: 0, swallow: 0, loosenTie: 0, penTap: 0, armsCrossed: 0, headInHands: 0, surprise: 0 };

export function tellsOf(id: CharacterId): Tells {
  return (actorTells[id] ??= { sweat: 0, gazeAway: 0, swallow: 0, loosenTie: 0, penTap: 0, armsCrossed: 0, headInHands: 0, surprise: 0 });
}

// ---------------------------------------------------------------------------------------------- visage
const R = 0.1;
const HEAD_SCALE = new THREE.Vector3(0.8, 1.16, 0.98);

/** Déforme une sphère unité en tête : mâchoire, menton, pommettes, orbites, arcade, occiput. */
function deformHead(geo: THREE.BufferGeometry, jaw: number, inflate = 1): THREE.BufferGeometry {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const g = (x: number, y: number, sx: number, sy: number) => Math.exp(-((x / sx) ** 2 + (y / sy) ** 2));
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const nx = v.x;
    const ny = v.y;
    const nz = v.z;
    const front = Math.max(nz, 0);
    let x = nx * HEAD_SCALE.x;
    let y = ny * HEAD_SCALE.y;
    let z = nz * HEAD_SCALE.z;
    if (ny < 0) {
      const k = -ny;
      x *= 1 - 0.3 * k * k * (2 - jaw);
      z *= 1 - 0.12 * k;
    }
    z += 0.12 * g(nx, ny + 0.86, 0.35, 0.22) * front * jaw; // menton
    for (const s of [-1, 1]) {
      const c = g(nx - s * 0.55, ny + 0.05, 0.25, 0.2) * front;
      x += s * 0.04 * c;
      z += 0.035 * c;
      z -= 0.09 * g(nx - s * 0.33, ny - 0.12, 0.16, 0.11) * front * front; // orbites
    }
    z += 0.045 * g(nx, ny - 0.27, 0.62, 0.08) * front; // arcade sourcilière
    if (nz < 0) z *= 1.07; // occiput
    y -= 0.04 * g(nx, ny - 1, 0.6, 0.3); // sommet un peu aplati
    pos.setXYZ(i, x * R * inflate, y * R * inflate, z * R * inflate);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Coque qui épouse la tête (cheveux, barbe). `tilt` bascule la calotte vers l'arrière : ligne frontale des
 * cheveux plus haute, nuque couverte. phi = π/2 est l'avant du visage.
 */
function shell(jaw: number, inflate: number, thetaStart: number, thetaLength: number, tilt = 0, phiStart = 0, phiLength = Math.PI * 2): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 64, 40, phiStart, phiLength, thetaStart, thetaLength);
  g.rotateX(-tilt);
  return deformHead(g, jaw, inflate);
}

/** Tout sauf l'avant du visage, sur ±`half` radians autour de la face. */
const aroundBack = (half: number): [number, number] => [Math.PI / 2 + half, Math.PI * 2 - 2 * half];

/** Point de surface du visage (repère tête), pour placer yeux, nez, bouche. */
function facePoint(nx: number, ny: number, jaw: number): THREE.Vector3 {
  const g = new THREE.BufferGeometry();
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  g.setAttribute("position", new THREE.Float32BufferAttribute([nx, ny, nz], 3));
  deformHead(g, jaw);
  const p = new THREE.Vector3().fromBufferAttribute(g.attributes.position as THREE.BufferAttribute, 0);
  g.dispose();
  return p;
}

function useMaterials(look: ActorLook) {
  return useMemo(() => {
    const skin = new THREE.MeshPhysicalMaterial({ color: look.skin, roughness: 0.52, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color("#ffb49a"), clearcoat: 0, clearcoatRoughness: 0.35 });
    const skinDark = new THREE.MeshStandardMaterial({ color: new THREE.Color(look.skin).multiplyScalar(0.72), roughness: 0.6 });
    return {
      skin,
      skinDark,
      lips: new THREE.MeshPhysicalMaterial({ color: look.lips ?? new THREE.Color(look.skin).offsetHSL(0.0, 0.08, -0.14).getStyle(), roughness: look.lips ? 0.32 : 0.45, clearcoat: look.lips ? 0.5 : 0.1 }),
      mouth: new THREE.MeshStandardMaterial({ color: "#2a0e0c", roughness: 0.8 }),
      teeth: new THREE.MeshStandardMaterial({ color: "#e8e2d4", roughness: 0.4 }),
      sclera: new THREE.MeshPhysicalMaterial({ color: "#ece7e0", roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
      iris: new THREE.MeshStandardMaterial({ color: look.iris, roughness: 0.4 }),
      pupil: new THREE.MeshStandardMaterial({ color: "#050505", roughness: 0.1 }),
      hair: new THREE.MeshPhysicalMaterial({ color: look.hair, roughness: 0.6, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(look.hair).offsetHSL(0, 0, 0.25) }),
      brow: new THREE.MeshStandardMaterial({ color: new THREE.Color(look.hair).multiplyScalar(look.hair === "#ecebe8" || look.hair === "#c9c6c0" ? 0.8 : 0.85), roughness: 0.8 }),
      suit: new THREE.MeshPhysicalMaterial({ color: look.suit, roughness: 0.78, sheen: 0.7, sheenRoughness: 0.6, sheenColor: new THREE.Color(look.suit).offsetHSL(0, 0, 0.22) }),
      lapel: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(look.suit).offsetHSL(0, 0, -0.03), roughness: 0.55, sheen: 0.8, sheenColor: new THREE.Color(look.suit).offsetHSL(0, 0, 0.28) }),
      shirt: new THREE.MeshStandardMaterial({ color: look.shirt, roughness: 0.62 }),
      tie: new THREE.MeshPhysicalMaterial({ color: look.tie ?? look.suit, roughness: 0.4, sheen: 0.5 }),
      shoe: new THREE.MeshStandardMaterial({ color: "#0b0b0d", roughness: 0.25, metalness: 0.3 }),
      metal: new THREE.MeshStandardMaterial({ color: "#c9a45a", roughness: 0.25, metalness: 1 }),
      glass: new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.02, transparent: true, opacity: 0.18, depthWrite: false }),
      pen: new THREE.MeshStandardMaterial({ color: "#101012", roughness: 0.2, metalness: 0.6 }),
    };
  }, [look]);
}

// ---------------------------------------------------------------------------------------------- poses
interface ArmPose {
  /** Épaule : balancement avant (−) / arrière (+), écartement (+ vers l'extérieur), rotation interne. */
  sx: number;
  sz: number;
  sy: number;
  /** Coude (flexion, −) et rotation de l'avant-bras vers l'intérieur. */
  ex: number;
  ey: number;
}
const A = (sx: number, sz: number, sy: number, ex: number, ey: number): ArmPose => ({ sx, sz, sy, ex, ey });
const BASE_ARMS: Record<ActorPose, ArmPose> = {
  stand: A(0.04, 0.09, 0, -0.18, 0),
  sit: A(-0.35, 0.12, 0, -1.1, 0.35),
  witness: A(-0.42, 0.14, 0.1, -1.18, 0.55),
  bench: A(-0.5, 0.2, 0.1, -1.05, 0.5),
};
const GESTURE = A(-0.45, 0.32, -0.15, -1.15, -0.45);
const TIE = A(-0.2, -0.12, 0.3, -2.05, 0.55);
const CROSSED = A(-0.28, -0.12, 0.2, -1.95, 1.05);
const FACE = A(-0.85, -0.05, 0.25, -2.35, 0.2);
const PEN = A(-0.45, 0.1, 0.05, -1.35, 0.45);

function mixArm(out: ArmPose, a: ArmPose, b: ArmPose, k: number): ArmPose {
  out.sx = a.sx + (b.sx - a.sx) * k;
  out.sz = a.sz + (b.sz - a.sz) * k;
  out.sy = a.sy + (b.sy - a.sy) * k;
  out.ex = a.ex + (b.ex - a.ex) * k;
  out.ey = a.ey + (b.ey - a.ey) * k;
  return out;
}

const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpM = new THREE.Matrix4();

export interface ActorProps {
  id: CharacterId;
  pose?: ActorPose;
  position?: [number, number, number];
  rotationY?: number;
  /** Cible du regard (monde) : « camera » par défaut. */
  lookAt?: [number, number, number] | "camera";
  /** Rotation animée ajoutée (Harlow qui se retourne). */
  turn?: { value: number };
  /** Cache les jambes (derrière un bureau, un banc). */
  legs?: boolean;
  /** Apparence d'un figurant (jurés…) à la place de la fiche du personnage. */
  look?: ActorLook;
  /** Figurant : pas de gestes de parole, regard plus lent. */
  extra?: boolean;
}

/** Figurant au hasard (jurés, public) : apparence reproductible à partir d'une graine. */
export function randomLook(seed: number): ActorLook {
  let a = seed * 9301 + 49297;
  const r = () => {
    a = (a * 9301 + 49297) % 233280;
    return a / 233280;
  };
  const f = r() < 0.5;
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]!;
  const hairs = ["#2a2018", "#8a6a3a", "#111", "#c9a76a", "#9a9a9a", "#5a3a20", "#d8d6d0"];
  return {
    gender: f ? "f" : "m",
    skin: pick(["#f0c8a8", "#e0b48f", "#c89c7e", "#a8785a", "#8d5a3d", "#6b4630"]),
    hair: pick(hairs),
    hairStyle: f ? pick<HairStyle>(["bob", "bun", "short"]) : pick<HairStyle>(["short", "crew", "receding", "swept", "styled"]),
    iris: pick(["#3a2a1c", "#4a6a8a", "#2b1c12", "#5b7a8c"]),
    suit: pick(["#3a3f4a", "#5a4a3a", "#2c2f36", "#6b5a4a", "#7a2c2c", "#2a3a4a", "#4a4a4a", "#3d4a3a", "#8a7a64"]),
    shirt: pick(["#e9ecef", "#dfe3ea", "#f1ece0", "#cfd8e4"]),
    tie: !f && r() < 0.4 ? pick(["#3a1418", "#1f3b5a", "#2a3a2a"]) : null,
    lips: f && r() < 0.5 ? pick(["#9a3a3a", "#a0605a", "#7a3a30"]) : undefined,
    height: f ? 1.6 + r() * 0.12 : 1.7 + r() * 0.15,
    build: f ? 0.84 + r() * 0.1 : 0.95 + r() * 0.22,
    jaw: 0.9 + r() * 0.3,
    glasses: r() < 0.2 ? "round" : null,
  };
}

export function Actor({ id, pose = "stand", position = [0, 0, 0], rotationY = 0, lookAt = "camera", turn, legs = true, look: override, extra = false }: ActorProps) {
  const look = override ?? LOOKS[id];
  const jaw = look.jaw ?? 1;
  const m = useMaterials(look);
  const s = look.height / 1.8;
  const b = look.build;
  const f = look.gender === "f";

  const geo = useMemo(() => {
    const head = deformHead(new THREE.SphereGeometry(1, 72, 54), jaw);
    const torsoPts = [
      [0.0, 0.0],
      [0.16, 0.0],
      [0.17, 0.1],
      [f ? 0.15 : 0.18, 0.24],
      [f ? 0.19 : 0.215, 0.4],
      [0.225, 0.49],
      [0.19, 0.545],
      [0.08, 0.58],
      [0.0, 0.585],
    ].map(([x, y]) => new THREE.Vector2(x! * b, y!));
    const torso = new THREE.LatheGeometry(torsoPts, 40);
    torso.scale(1, 1, 0.56);
    const robe = new THREE.LatheGeometry(
      [
        [0, -0.5],
        [0.36, -0.5],
        [0.3, 0.1],
        [0.26, 0.35],
        [0.25, 0.5],
        [0.2, 0.555],
        [0.08, 0.59],
        [0, 0.595],
      ].map(([x, y]) => new THREE.Vector2(x! * b, y!)),
      40,
    );
    robe.scale(1, 1, 0.62);
    // Cheveux : coques qui suivent exactement la forme de la tête (même déformation, gonflée).
    const hair: THREE.BufferGeometry[] = [];
    switch (look.hairStyle) {
      case "swept":
        hair.push(shell(jaw, 1.07, 0, Math.PI * 0.5, 0.5));
        break;
      case "receding":
        hair.push(shell(jaw, 1.04, 0, Math.PI * 0.5, 0.78));
        break;
      case "bob":
        hair.push(shell(jaw, 1.08, 0, Math.PI * 0.5, 0.36));
        hair.push(shell(jaw, 1.1, Math.PI * 0.42, Math.PI * 0.36, 0, ...aroundBack(Math.PI * 0.3)));
        break;
      case "short":
        hair.push(shell(jaw, 1.05, 0, Math.PI * 0.5, 0.42));
        break;
      case "bun":
        hair.push(shell(jaw, 1.04, 0, Math.PI * 0.5, 0.45));
        break;
      case "crew":
        hair.push(shell(jaw, 1.022, 0, Math.PI * 0.5, 0.48));
        break;
      case "styled":
        hair.push(shell(jaw, 1.065, 0, Math.PI * 0.5, 0.4));
        break;
    }
    const beard = look.beard ? shell(jaw, 1.035, Math.PI * 0.58, Math.PI * 0.32, 0, Math.PI * 0.05, Math.PI * 0.9) : null;
    const moustache = look.beard ? new THREE.CapsuleGeometry(0.004, 0.03, 4, 8) : null;
    return { head, torso, robe, hair, beard, moustache };
  }, [jaw, b, f, look.hairStyle, look.beard]);

  // Repères du visage (calculés sur la tête déformée).
  const face = useMemo(() => {
    const eyeL = facePoint(-0.33, 0.12, jaw);
    const nose = facePoint(0, -0.08, jaw);
    const mouth = facePoint(0, -0.37, jaw);
    const brow = facePoint(-0.3, 0.27, jaw);
    return { eyeX: Math.abs(eyeL.x), eyeY: eyeL.y, eyeZ: eyeL.z - 0.0105, nose, mouth, brow };
  }, [jaw]);

  const root = useRef<THREE.Group>(null);
  const spine = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const lids = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const brows = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const corners = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const lowerLip = useRef<THREE.Group>(null);
  const mouthIn = useRef<THREE.Mesh>(null);
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const fore = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const pen = useRef<THREE.Mesh>(null);
  const tieRef = useRef<THREE.Group>(null);

  const anim = useRef({ blinkAt: 2, blink: 0, saccade: new THREE.Vector2(), saccadeAt: 1, swallowAt: 4, swallow: 0, gesture: 0, tie: 0, crossed: 0, face: 0, pen: 0, slump: 0, smile: 0, worry: 0, anger: 0, gaze: new THREE.Vector2(), open: 0 });
  const arm = useMemo(() => [A(0, 0, 0, 0, 0), A(0, 0, 0, 0, 0)], []);
  const phase = useMemo(() => (id.charCodeAt(0) * 7.3 + id.length * 3.1) % 10, [id]);

  useFrame(({ camera, clock }, dt) => {
    const t = clock.elapsedTime + phase;
    const a = anim.current;
    const st: CharacterState = extra ? "idle" : stateOf(id);
    const speaking = !extra && cast.speaker === id;
    const tl = extra ? NO_TELLS : tellsOf(id);
    const k = Math.min(1, dt * 4);
    const approach = (cur: number, target: number, rate = k) => cur + (target - cur) * rate;

    // --- expressions
    a.smile = approach(a.smile, st === "pleased" ? 1 : st === "tense" ? -0.4 : st === "break" ? -0.6 : 0);
    a.worry = approach(a.worry, st === "tense" ? 1 : st === "break" && id === "rourke" ? 1 : tl.surprise);
    a.anger = approach(a.anger, st === "break" && id !== "rourke" ? 1 : 0);
    a.slump = approach(a.slump, st === "break" && id === "rourke" ? 1 : 0, dt * 1.5);
    a.gesture = approach(a.gesture, speaking && !tl.loosenTie && !tl.armsCrossed && pose !== "bench" ? 0.35 + 0.4 * Math.max(0, Math.sin(t * 1.3)) : 0, dt * 2.5);
    a.tie = approach(a.tie, tl.loosenTie > 0 && Math.sin(t * 0.4) > 0.75 ? 1 : 0, dt * 2.5);
    a.crossed = approach(a.crossed, Math.max(tl.armsCrossed, st === "break" && id === "brandt" ? 1 : 0), dt * 2.5);
    a.face = approach(a.face, Math.max(tl.headInHands, a.slump > 0.5 ? 1 : 0), dt * 1.5);
    a.pen = approach(a.pen, tl.penTap, dt * 3);

    // --- clignements (plus fréquents sous pression)
    if (t > a.blinkAt) {
      a.blink = 1;
      a.blinkAt = t + (st === "tense" ? 0.7 + Math.random() * 1.4 : 2 + Math.random() * 3.5);
    }
    a.blink = Math.max(0, a.blink - dt * 8);
    const lidClose = Math.sin(Math.min(1, a.blink) * Math.PI);

    // --- regard : cible + saccades ; le regard fuit vers le bas quand la pression monte
    if (t > a.saccadeAt) {
      a.saccade.set((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.06);
      a.saccadeAt = t + 0.4 + Math.random() * 1.4;
    }
    const g = root.current;
    const h = head.current;
    if (!g || !h) return;
    const target = lookAt === "camera" ? camera.position : tmpV.set(lookAt[0], lookAt[1], lookAt[2]);
    h.updateWorldMatrix(true, false);
    tmpM.copy(h.matrixWorld).invert();
    const local = tmpV.copy(target).applyMatrix4(tmpM);
    let yaw = Math.atan2(local.x, local.z);
    let pitch = Math.atan2(local.y, Math.hypot(local.x, local.z));
    const away = Math.max(tl.gazeAway * (Math.sin(t * 0.8) > -0.2 ? 1 : 0), a.slump);
    yaw = yaw * (1 - away) + -0.45 * away;
    pitch = pitch * (1 - away) + -0.35 * away;
    a.gaze.x = approach(a.gaze.x, Math.max(-0.5, Math.min(0.5, yaw)) + a.saccade.x, Math.min(1, dt * 14));
    a.gaze.y = approach(a.gaze.y, Math.max(-0.35, Math.min(0.3, pitch)) + a.saccade.y, Math.min(1, dt * 14));
    for (const e of eyes) e.current?.rotation.set(-a.gaze.y, a.gaze.x, 0);
    const open = 0.55 - 0.9 * lidClose - (st === "tense" ? 0.05 : 0) - a.slump * 0.25 + a.worry * 0.08 + tl.surprise * 0.2;
    for (const l of lids) if (l.current) l.current.rotation.x = -Math.max(-0.35, Math.min(0.8, open)) - a.gaze.y * 0.5;

    // --- sourcils
    brows.forEach((r, i) => {
      const side = i === 0 ? -1 : 1;
      if (!r.current) return;
      r.current.position.y = face.brow.y - face.eyeY + 0.004 * a.worry + 0.005 * tl.surprise - 0.004 * a.anger;
      r.current.rotation.z = side * (0.12 * a.worry - 0.2 * a.anger) + side * 0.04;
    });

    // --- bouche : ouverture pilotée par la voix, commissures par l'expression
    const talk = speaking ? cast.level : 0;
    a.open = approach(a.open, talk * (0.8 + 0.2 * Math.sin(t * 21)), Math.min(1, dt * 20));
    if (lowerLip.current) lowerLip.current.position.y = face.mouth.y - 0.004 - a.open * 0.011;
    if (mouthIn.current) mouthIn.current.scale.y = 0.0012 + a.open * 0.009;
    corners.forEach((c, i) => {
      if (c.current) c.current.rotation.z = (i === 0 ? -1 : 1) * a.smile * 0.35;
    });

    // --- tête : suit la cible à moitié, hoche en parlant, déglutit sous pression
    if (t > a.swallowAt) {
      if (tl.swallow > 0) a.swallow = 1;
      a.swallowAt = t + 2.5 + Math.random() * 4 * (1.2 - tl.swallow);
    }
    a.swallow = Math.max(0, a.swallow - dt * 2.2);
    const gulp = Math.sin(a.swallow * Math.PI);
    const reduced = rig.reducedMotion ? 0.3 : 1;
    const nod = talk * Math.sin(t * 6.3) * 0.05 + (speaking ? Math.sin(t * 1.3) * 0.03 : 0);
    h.rotation.set(
      (-pitch * 0.35 - a.gaze.y * 0.2 + Math.sin(t * 0.47) * 0.03 * reduced + nod + gulp * 0.06 + a.slump * 0.45 + a.face * 0.25) * 1,
      Math.max(-0.6, Math.min(0.6, yaw * 0.45)) + Math.sin(t * 0.31) * 0.05 * reduced,
      Math.sin(t * 0.23) * 0.02 * reduced + (st === "tense" ? Math.sin(t * 7) * 0.006 : 0),
    );
    if (neck.current) neck.current.scale.y = 1 - gulp * 0.06;

    // --- respiration, affaissement
    const breathRate = st === "tense" ? 2.4 : 1.35;
    if (chest.current) chest.current.scale.set(1 + Math.sin(t * breathRate) * 0.008, 1 + Math.sin(t * breathRate) * 0.012, 1 + Math.sin(t * breathRate) * 0.012);
    if (spine.current) spine.current.rotation.x = a.slump * 0.32 + a.face * 0.12 + (st === "tense" ? 0.03 : 0);

    // --- bras : pose de base + gestes superposés
    const base = BASE_ARMS[pose];
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const out = mixArm(arm[i]!, base, base, 0);
      if (side === 1) {
        mixArm(out, out, GESTURE, a.gesture);
        mixArm(out, out, TIE, a.tie);
        mixArm(out, out, PEN, a.pen * (1 - a.crossed));
        if (a.pen > 0.01) out.ex += Math.max(0, Math.sin(t * 9)) * 0.18 * a.pen;
      }
      mixArm(out, out, CROSSED, a.crossed);
      mixArm(out, out, FACE, a.face);
      const u = arms[i]!.current;
      const fo = fore[i]!.current;
      if (u) u.rotation.set(out.sx, side * out.sy, side * out.sz, "YXZ");
      if (fo) fo.rotation.set(out.ex, -side * out.ey, 0);
    }
    if (pen.current) pen.current.visible = a.pen > 0.05;
    if (tieRef.current) tieRef.current.rotation.z = a.tie * 0.12;

    // --- sueur : la peau brille
    m.skin.clearcoat = tl.sweat * 0.6;
    m.skin.roughness = 0.52 - tl.sweat * 0.2;

    if (turn) g.rotation.y = rotationY + turn.value;
  });

  const hipY = pose === "stand" ? 0.95 : 0.47;
  const shoulderY = 0.5;
  const eyeR = 0.0118;
  const legOffset = pose === "stand" ? 0 : 1;
  const mouth = face.mouth;

  const upperLen = 0.29;
  const foreLen = 0.26;
  return (
    <group ref={root} position={position} rotation={[0, rotationY, 0]} scale={s}>
      {/* Jambes (cachées derrière un bureau quand `legs` est faux) */}
      {legs &&
        !look.robe &&
        [-0.095, 0.095].map((x) =>
          legOffset ? (
            <group key={x}>
              <mesh material={m.suit} position={[x * b, hipY - 0.02, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.078, 0.34, 6, 16]} />
              </mesh>
              <mesh material={m.suit} position={[x * b, 0.24, 0.44]}>
                <capsuleGeometry args={[0.068, 0.36, 6, 16]} />
              </mesh>
              <mesh material={m.shoe} position={[x * b, 0.04, 0.5]}>
                <boxGeometry args={[0.1, 0.07, 0.27]} />
              </mesh>
            </group>
          ) : (
            <group key={x}>
              <mesh material={m.suit} position={[x * b, 0.5, 0]}>
                <capsuleGeometry args={[0.08, 0.78, 6, 16]} />
              </mesh>
              <mesh material={m.shoe} position={[x * b, 0.04, 0.05]}>
                <boxGeometry args={[0.1, 0.07, 0.27]} />
              </mesh>
            </group>
          ),
        )}
      <group ref={spine} position={[0, hipY, 0]}>
        <group ref={chest}>
          {look.robe ? <mesh geometry={geo.robe} material={m.suit} /> : <mesh geometry={geo.torso} material={m.suit} />}
          {/* Col de chemise (V) */}
          <mesh material={m.shirt} position={[0, 0.49, 0.1 * b]} rotation={[0.28, 0, 0]} scale={[1, 1, 0.5]}>
            <coneGeometry args={[0.05, 0.15, 3, 1, true]} />
          </mesh>
          {look.tie && (
            <group ref={tieRef} position={[0, 0.535, 0.118 * b]}>
              <mesh material={m.tie} position={[0, 0, 0.004]}>
                <boxGeometry args={[0.028, 0.022, 0.014]} />
              </mesh>
              <mesh material={m.tie} position={[0, -0.14, 0]} rotation={[0.1, 0, 0]}>
                <boxGeometry args={[0.036, 0.26, 0.008]} />
              </mesh>
            </group>
          )}
          {!look.robe &&
            [-1, 1].map((side) => (
              <mesh key={side} material={m.lapel} position={[side * 0.058, 0.42, 0.122 * b]} rotation={[0.18, 0, side * 0.34]}>
                <boxGeometry args={[0.052, 0.24, 0.012]} />
              </mesh>
            ))}
          {/* Épaules arrondies */}
          {[-1, 1].map((side) => (
            <mesh key={side} material={m.suit} position={[side * 0.195 * b, shoulderY - 0.005, 0]} scale={[1.1, 0.55, 0.85]}>
              <sphereGeometry args={[0.065, 20, 14]} />
            </mesh>
          ))}
          {/* Bras */}
          {[0, 1].map((i) => {
            const side = i === 0 ? -1 : 1;
            return (
              <group key={i} ref={arms[i]} position={[side * 0.215 * b, shoulderY, 0]}>
                <mesh material={m.suit} position={[0, -upperLen / 2, 0]}>
                  <capsuleGeometry args={[look.robe ? 0.075 : 0.054, upperLen - 0.06, 6, 14]} />
                </mesh>
                <group ref={fore[i]} position={[0, -upperLen, 0]}>
                  <mesh material={m.suit} position={[0, -foreLen / 2, 0]}>
                    <capsuleGeometry args={[look.robe ? 0.07 : 0.047, foreLen - 0.05, 6, 14]} />
                  </mesh>
                  <mesh material={m.shirt} position={[0, -foreLen + 0.01, 0]}>
                    <cylinderGeometry args={[0.045, 0.045, 0.03, 14]} />
                  </mesh>
                  {/* Main : paume + pouce */}
                  <group position={[0, -foreLen - 0.045, 0]}>
                    <mesh material={m.skin} scale={[0.85, 1, 0.42]}>
                      <sphereGeometry args={[0.048, 16, 12]} />
                    </mesh>
                    <mesh material={m.skin} position={[-side * 0.034, 0.012, 0.012]} rotation={[0.3, 0, side * 0.6]}>
                      <capsuleGeometry args={[0.012, 0.03, 4, 8]} />
                    </mesh>
                    {side === 1 && (
                      <mesh ref={pen} material={m.pen} position={[0, -0.04, 0.02]} rotation={[1.2, 0, 0]} visible={false}>
                        <cylinderGeometry args={[0.005, 0.005, 0.14, 8]} />
                      </mesh>
                    )}
                  </group>
                </group>
              </group>
            );
          })}
          {/* Cou et tête */}
          <group ref={neck} position={[0, 0.555, 0]}>
            <mesh material={m.skin} position={[0, 0.04, 0.005]}>
              <cylinderGeometry args={[0.047, 0.055, 0.1, 18]} />
            </mesh>
          </group>
          <group ref={head} position={[0, 0.71, 0.012]}>
            <mesh geometry={geo.head} material={m.skin} />
            {geo.hair.map((hg, i) => (
              <mesh key={i} geometry={hg} material={m.hair} />
            ))}
            {look.hairStyle === "bun" && (
              <mesh material={m.hair} position={[0, 0.01, -0.108]}>
                <sphereGeometry args={[0.034, 20, 16]} />
              </mesh>
            )}
            {look.hairStyle === "styled" && (
              <mesh material={m.hair} position={[0, 0.1, 0.045]} scale={[1.4, 0.55, 1]}>
                <sphereGeometry args={[0.04, 20, 14]} />
              </mesh>
            )}
            {geo.beard && <mesh geometry={geo.beard} material={m.hair} />}
            {geo.moustache && <mesh geometry={geo.moustache} material={m.hair} position={[0, mouth.y + 0.012, mouth.z + 0.004]} rotation={[0, 0, Math.PI / 2]} />}
            {/* Oreilles */}
            {[-1, 1].map((side) => (
              <mesh key={side} material={m.skin} position={[side * 0.079, 0.004, -0.004]} scale={[0.35, 0.75, 0.55]} rotation={[0, side * 0.3, 0]}>
                <sphereGeometry args={[0.04, 14, 10]} />
              </mesh>
            ))}
            {/* Yeux, paupières, sourcils */}
            {[0, 1].map((i) => {
              const side = i === 0 ? -1 : 1;
              return (
                <group key={i} position={[side * face.eyeX, face.eyeY, face.eyeZ]}>
                  <group ref={eyes[i]}>
                    <mesh material={m.sclera}>
                      <sphereGeometry args={[eyeR, 20, 16]} />
                    </mesh>
                    <mesh material={m.iris} rotation={[Math.PI / 2, 0, 0]}>
                      <sphereGeometry args={[eyeR * 1.006, 24, 8, 0, Math.PI * 2, 0, 0.5]} />
                    </mesh>
                    <mesh material={m.pupil} rotation={[Math.PI / 2, 0, 0]}>
                      <sphereGeometry args={[eyeR * 1.012, 16, 4, 0, Math.PI * 2, 0, 0.2]} />
                    </mesh>
                  </group>
                  <mesh ref={lids[i]} material={m.skin}>
                    <sphereGeometry args={[eyeR * 1.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  </mesh>
                  <mesh material={m.skin} rotation={[-2.84, 0, 0]}>
                    <sphereGeometry args={[eyeR * 1.08, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  </mesh>
                  <mesh ref={brows[i]} material={m.brow} position={[side * 0.002, face.brow.y - face.eyeY, face.brow.z - face.eyeZ + 0.004]}>
                    <boxGeometry args={[0.03, f ? 0.0035 : 0.0055, 0.006]} />
                  </mesh>
                </group>
              );
            })}
            {/* Nez */}
            <mesh material={m.skin} position={[0, face.nose.y + 0.006, face.nose.z + 0.003]} rotation={[-0.28, 0, 0]} scale={[0.013, 0.027, 0.016]}>
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
            <mesh material={m.skin} position={[0, face.nose.y - 0.012, face.nose.z + 0.008]} scale={[0.011, 0.009, 0.01]}>
              <sphereGeometry args={[1, 14, 10]} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} material={m.skinDark} position={[side * 0.009, face.nose.y - 0.015, face.nose.z + 0.001]} scale={[0.006, 0.006, 0.006]}>
                <sphereGeometry args={[1, 10, 8]} />
              </mesh>
            ))}
            {/* Bouche : lèvres (centre + commissures articulées), intérieur sombre, dents */}
            <group position={[0, mouth.y, mouth.z - 0.002]}>
              <mesh ref={mouthIn} material={m.mouth} position={[0, -0.004, -0.003]} scale={[0.016, 0.0012, 0.004]}>
                <sphereGeometry args={[1, 16, 10]} />
              </mesh>
              <mesh material={m.teeth} position={[0, -0.001, -0.005]} scale={[0.014, 0.003, 0.003]}>
                <sphereGeometry args={[1, 12, 8]} />
              </mesh>
              <mesh material={m.lips} position={[0, 0.002, 0]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[f ? 0.0045 : 0.0038, 0.018, 4, 10]} />
              </mesh>
              {[0, 1].map((i) => {
                const side = i === 0 ? -1 : 1;
                return (
                  <group key={i} ref={corners[i]} position={[side * 0.009, 0.0, -0.002]}>
                    <mesh material={m.lips} position={[side * 0.006, 0, -0.001]} rotation={[0, side * 0.5, Math.PI / 2]}>
                      <capsuleGeometry args={[0.0032, 0.008, 4, 8]} />
                    </mesh>
                  </group>
                );
              })}
            </group>
            <group ref={lowerLip} position={[0, mouth.y - 0.004, mouth.z - 0.003]}>
              <mesh material={m.lips} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[f ? 0.0052 : 0.0045, 0.016, 4, 10]} />
              </mesh>
            </group>
            {/* Lunettes */}
            {look.glasses && (
              <group position={[0, face.eyeY - (look.glasses === "reading" ? 0.012 : 0), face.eyeZ + 0.02]}>
                {[-1, 1].map((side) => (
                  <group key={side} position={[side * face.eyeX, 0, 0]}>
                    <mesh material={m.metal}>
                      <torusGeometry args={[look.glasses === "round" ? 0.015 : 0.013, 0.0012, 6, 24]} />
                    </mesh>
                    <mesh material={m.glass} scale={look.glasses === "reading" ? [1, 0.6, 1] : [1, 1, 1]}>
                      <circleGeometry args={[0.014, 20]} />
                    </mesh>
                  </group>
                ))}
                <mesh material={m.metal} position={[0, 0.003, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.001, 0.001, face.eyeX * 2 - 0.028, 6]} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

/** Pour les tests : la tête déformée reste fermée, symétrique et dans ses proportions. */
export function headBounds(jaw = 1): THREE.Box3 {
  const g = deformHead(new THREE.SphereGeometry(1, 32, 24), jaw);
  g.computeBoundingBox();
  const b = g.boundingBox!.clone();
  g.dispose();
  tmpQ.identity();
  return b;
}
