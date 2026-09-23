"use client";
/**
 * Salle d'audience fédérale (affaire 2) : boiseries de noyer à panneaux, hautes fenêtres à gauche d'où tombe
 * une lumière grise du matin (poussière dans les rais), banc de la juge surélevé et sceau de bronze, barre
 * des témoins, box du jury (douze jurés), tables des avocats, pupitre, balustrade et public.
 *
 * Acteurs : Daniel Rourke à la barre, la juge Whitford au banc, Celia Brandt au pupitre (interrogatoire
 * principal) puis assise à sa table (contre-interrogatoire).
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PBR, useMat } from "../three/pbr";
import { SceneEnvironment } from "../three/environment";
import { useCourt } from "../court/state";
import { Actor, randomLook } from "./Actor";
import { Mannequin } from "./Mannequin";
import { useTextGeometry } from "./useBrassText";

export const COURT = { floorY: -1.2, ceilY: 5.6, leftX: -7.5, rightX: 7.5, backZ: -13, frontZ: 7 } as const;
const F = COURT.floorY;

export const WITNESS = { x: -3.3, z: -8.6, platform: 0.3, rot: 0.52 } as const;
export const JUDGE = { x: 0, z: -11.35, y: F + 1.45 } as const;
export const LECTERN = { x: 0, z: -3.6 } as const;
export const DEFENSE_SEAT = { x: 2.05, z: -0.85 } as const;

/** Tête de Rourke (monde), pour la caméra et le regard des autres. */
export const ROURKE_HEAD: [number, number, number] = [WITNESS.x, F + WITNESS.platform + 0.12 + 1.18, WITNESS.z];
export const JUDGE_HEAD: [number, number, number] = [JUDGE.x, JUDGE.y + 1.09, JUDGE.z];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panneau de boiserie : cadre en relief + panneau central (moulures simplifiées). */
function Paneling({ width, height, position, rotationY = 0, cols, rows = 2 }: { width: number; height: number; position: [number, number, number]; rotationY?: number; cols: number; rows?: number }) {
  const walnut = useMat(() => PBR.wood("walnut", { repeat: [width / 2.5, height / 2] }), [width, height]);
  const trim = useMat(() => PBR.wood("walnut", { repeat: [0.3, 2] }), []);
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    const cw = width / cols;
    const ch = height / rows;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) out.push([-width / 2 + cw * (c + 0.5), ch * (r + 0.5)]);
    return { out, cw, ch };
  }, [width, height, cols, rows]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh material={walnut} position={[0, height / 2, 0]} receiveShadow>
        <boxGeometry args={[width, height, 0.04]} />
      </mesh>
      {cells.out.map(([x, y], i) => (
        <mesh key={i} material={trim} position={[x, y, 0.03]} castShadow receiveShadow>
          <boxGeometry args={[cells.cw * 0.78, cells.ch * 0.76, 0.025]} />
        </mesh>
      ))}
      <mesh material={trim} position={[0, height + 0.05, 0.04]}>
        <boxGeometry args={[width, 0.1, 0.1]} />
      </mesh>
      <mesh material={trim} position={[0, 0.07, 0.04]}>
        <boxGeometry args={[width, 0.14, 0.08]} />
      </mesh>
    </group>
  );
}

function sealTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(512, 440, 60, 512, 512, 512);
  g.addColorStop(0, "#c8a45c");
  g.addColorStop(1, "#6e5424");
  x.fillStyle = g;
  x.beginPath();
  x.arc(512, 512, 500, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "#3b2c10";
  x.lineWidth = 10;
  for (const r of [490, 420, 300]) {
    x.beginPath();
    x.arc(512, 512, r, 0, Math.PI * 2);
    x.stroke();
  }
  x.fillStyle = "#3b2c10";
  x.font = "bold 58px Georgia, serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  const text = "UNITED STATES DISTRICT COURT · SOUTHERN DISTRICT OF NEW YORK · ";
  for (let i = 0; i < text.length; i++) {
    const a = (i / text.length) * Math.PI * 2 - Math.PI / 2;
    x.save();
    x.translate(512 + Math.cos(a) * 455, 512 + Math.sin(a) * 455);
    x.rotate(a + Math.PI / 2);
    x.fillText(text[i]!, 0, 0);
    x.restore();
  }
  // Balance de la justice stylisée
  x.lineWidth = 14;
  x.beginPath();
  x.moveTo(512, 300);
  x.lineTo(512, 700);
  x.moveTo(330, 390);
  x.lineTo(694, 390);
  x.moveTo(420, 720);
  x.lineTo(604, 720);
  x.stroke();
  for (const sx of [330, 694]) {
    x.beginPath();
    x.moveTo(sx, 390);
    x.lineTo(sx - 70, 540);
    x.moveTo(sx, 390);
    x.lineTo(sx + 70, 540);
    x.stroke();
    x.beginPath();
    x.arc(sx, 540, 72, 0, Math.PI);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function Shell() {
  const floor = useMat(() => PBR.wood("oak", { repeat: [6, 8] }), []);
  const carpet = useMat(() => PBR.carpet({ color: "#4a1c1e", repeat: [3, 6] }), []);
  const plaster = useMat(() => PBR.plaster({ color: "#d8cfbd", repeat: [4, 2] }), []);
  const ceiling = useMat(() => PBR.plaster({ color: "#e4ddcf", repeat: [4, 4] }), []);
  const beam = useMat(() => PBR.wood("walnut", { repeat: [4, 0.3] }), []);
  const W = COURT.rightX - COURT.leftX;
  const D = COURT.frontZ - COURT.backZ;
  const cz = (COURT.frontZ + COURT.backZ) / 2;
  const H = COURT.ceilY - F;
  return (
    <group>
      <mesh material={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, F, cz]} receiveShadow>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh material={carpet} rotation={[-Math.PI / 2, 0, 0]} position={[0, F + 0.004, 3.6]} receiveShadow>
        <planeGeometry args={[1.8, 6.6]} />
      </mesh>
      <mesh material={ceiling} rotation={[Math.PI / 2, 0, 0]} position={[0, COURT.ceilY, cz]}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* Caissons du plafond */}
      {[-4.5, -1.5, 1.5, 4.5].map((x) => (
        <mesh key={`bx${x}`} material={beam} position={[x, COURT.ceilY - 0.14, cz]}>
          <boxGeometry args={[0.22, 0.28, D]} />
        </mesh>
      ))}
      {[-10, -6, -2, 2, 6].map((z) => (
        <mesh key={`bz${z}`} material={beam} position={[0, COURT.ceilY - 0.14, z]}>
          <boxGeometry args={[W, 0.28, 0.22]} />
        </mesh>
      ))}
      {/* Murs : boiseries jusqu'à 3,4 m, plâtre au-dessus */}
      <mesh material={plaster} position={[0, F + H / 2, COURT.backZ]}>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh material={plaster} position={[COURT.rightX, F + H / 2, cz]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh material={plaster} position={[0, F + H / 2, COURT.frontZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[W, H]} />
      </mesh>
      <Paneling width={W} height={4.2} position={[0, F, COURT.backZ + 0.03]} cols={10} rows={3} />
      <Paneling width={D} height={3.4} position={[COURT.rightX - 0.03, F, cz]} rotationY={-Math.PI / 2} cols={12} />
      <Paneling width={W} height={3.4} position={[0, F, COURT.frontZ - 0.03]} rotationY={Math.PI} cols={10} />
    </group>
  );
}

/** Mur gauche : trois hautes fenêtres à petits bois, la lumière grise du matin. */
function Windows() {
  const plaster = useMat(() => PBR.plaster({ color: "#d8cfbd", repeat: [4, 2] }), []);
  const frame = useMat(() => new THREE.MeshStandardMaterial({ color: "#e9e4d8", roughness: 0.6 }), []);
  const sky = useMat(() => new THREE.MeshStandardMaterial({ color: "#000", emissive: "#dfe7ef", emissiveIntensity: 1.6 }), []);
  const x = COURT.leftX;
  const zs = [-9.2, -4.6, 0];
  const winW = 1.9;
  const winH = 3.8;
  const sill = F + 1.3;
  const D = COURT.frontZ - COURT.backZ;
  const cz = (COURT.frontZ + COURT.backZ) / 2;
  const H = COURT.ceilY - F;
  // Mur percé : bandes de plâtre entre les fenêtres.
  const pieces = useMemo(() => {
    const out: { z: number; w: number }[] = [];
    let z0 = COURT.backZ;
    for (const z of zs) {
      out.push({ z: (z0 + z - winW / 2) / 2, w: z - winW / 2 - z0 });
      z0 = z + winW / 2;
    }
    out.push({ z: (z0 + COURT.frontZ) / 2, w: COURT.frontZ - z0 });
    return out;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group>
      {pieces.map((p, i) => (
        <mesh key={i} material={plaster} position={[x, F + H / 2, p.z]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <planeGeometry args={[p.w, H]} />
        </mesh>
      ))}
      {zs.map((z) => (
        <group key={z}>
          <mesh material={plaster} position={[x, (sill + F) / 2, z]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <planeGeometry args={[winW, sill - F]} />
          </mesh>
          <mesh material={plaster} position={[x, (sill + winH + COURT.ceilY) / 2, z]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <planeGeometry args={[winW, COURT.ceilY - sill - winH]} />
          </mesh>
          <mesh material={sky} position={[x - 0.05, sill + winH / 2, z]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[winW, winH]} />
          </mesh>
          {[-0.63, 0, 0.63].map((dz) => (
            <mesh key={dz} material={frame} position={[x + 0.02, sill + winH / 2, z + dz]} castShadow>
              <boxGeometry args={[0.06, winH, 0.05]} />
            </mesh>
          ))}
          {[0.95, 1.9, 2.85].map((dy) => (
            <mesh key={dy} material={frame} position={[x + 0.02, sill + dy, z]} castShadow>
              <boxGeometry args={[0.06, 0.05, winW]} />
            </mesh>
          ))}
          <mesh material={frame} position={[x + 0.12, sill - 0.03, z]}>
            <boxGeometry args={[0.28, 0.06, winW + 0.2]} />
          </mesh>
        </group>
      ))}
      <Paneling width={D} height={1.3} position={[x + 0.03, F, cz]} rotationY={Math.PI / 2} cols={12} rows={1} />
    </group>
  );
}

/** Rais de lumière et poussière dans le faisceau des fenêtres. */
function Beams() {
  const mat = useMat(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `varying vec2 vUv; uniform float uTime;
          void main(){ float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
            float fall = smoothstep(0.0, 0.2, vUv.y) * (1.0 - vUv.y * 0.6);
            float a = edge * fall * 0.05 * (0.92 + 0.08 * sin(uTime * 0.5 + vUv.x * 3.0));
            gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, 1.0); }`,
      }),
    [],
  );
  const dust = useMemo(() => {
    const n = 700;
    const pos = new Float32Array(n * 3);
    const r = rng(77);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = COURT.leftX + 0.8 + r() * 3.2;
      pos[i * 3 + 1] = F + 0.3 + r() * 4.2;
      pos[i * 3 + 2] = -11 + r() * 13;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const dustMat = useMat(() => new THREE.PointsMaterial({ color: "#fff6e8", size: 0.006, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }), []);
  const pts = useRef<THREE.Points>(null);
  useFrame(({ clock }, dt) => {
    mat.uniforms.uTime!.value = clock.elapsedTime;
    const p = pts.current;
    if (!p) return;
    const a = p.geometry.attributes.position as THREE.BufferAttribute;
    const arr = a.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] = arr[i + 1]! + Math.sin(t * 0.3 + i) * dt * 0.02 - dt * 0.004;
      arr[i] = arr[i]! + Math.cos(t * 0.21 + i * 0.7) * dt * 0.015;
      if (arr[i + 1]! < F + 0.2) arr[i + 1] = F + 4.4;
    }
    a.needsUpdate = true;
  });
  return (
    <group>
      {[-9.2, -4.6, 0].map((z) => (
        <mesh key={z} material={mat} position={[COURT.leftX + 2.6, F + 2.6, z + 0.6]} rotation={[0, 0, -0.62]}>
          <planeGeometry args={[1.8, 6.2]} />
        </mesh>
      ))}
      <points ref={pts} geometry={dust} material={dustMat} />
    </group>
  );
}

function Bench() {
  const brass = useMat(() => PBR.brass(), []);
  const leather = useMat(() => PBR.leather({ color: "#1c2a22", repeat: [1, 1] }), []);
  const seal = useMemo(() => sealTexture(), []);
  const sealMat = useMat(() => new THREE.MeshStandardMaterial({ map: seal, metalness: 0.7, roughness: 0.35 }), [seal]);
  const name = useTextGeometry("HON. ALMA WHITFORD", 0.055, 0.006);
  const dais = useMat(() => PBR.wood("walnut", { repeat: [3, 0.4] }), []);
  return (
    <group>
      {/* Estrade */}
      <mesh material={dais} position={[0, F + 0.3, -11.4]} receiveShadow castShadow>
        <boxGeometry args={[7, 0.6, 3.2]} />
      </mesh>
      {/* Façade du banc à panneaux */}
      <Paneling width={5.6} height={1.3} position={[0, F + 0.6, -10.05]} cols={6} rows={1} />
      <mesh material={dais} position={[0, F + 1.95, -10.5]} castShadow receiveShadow>
        <boxGeometry args={[5.9, 0.08, 1.1]} />
      </mesh>
      {[-2.95, 2.95].map((x) => (
        <mesh key={x} material={dais} position={[x, F + 1.25, -10.5]} castShadow>
          <boxGeometry args={[0.1, 1.3, 1.0]} />
        </mesh>
      ))}
      {name && <mesh geometry={name} material={brass} position={[0, F + 1.72, -9.98]} />}
      {/* Fauteuil de la juge */}
      <mesh material={leather} position={[0, JUDGE.y + 0.95, JUDGE.z - 0.42]} castShadow>
        <boxGeometry args={[0.8, 1.5, 0.16]} />
      </mesh>
      {/* Marteau et socle */}
      <mesh material={dais} position={[0.7, F + 2.01, -10.35]}>
        <cylinderGeometry args={[0.09, 0.1, 0.035, 24]} />
      </mesh>
      <group position={[0.72, F + 2.06, -10.3]} rotation={[0, 0.4, Math.PI / 2]}>
        <mesh material={dais}>
          <cylinderGeometry args={[0.035, 0.035, 0.13, 16]} />
        </mesh>
        <mesh material={dais} position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.22, 8]} />
        </mesh>
      </group>
      {/* Lampe de banc */}
      <group position={[-1.6, F + 2.0, -10.6]}>
        <mesh material={brass} position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.012, 0.03, 0.4, 12]} />
        </mesh>
        <mesh position={[0, 0.42, 0.05]} rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.14, 0.12, 20, 1, true]} />
          <meshStandardMaterial color="#1f4a2c" side={THREE.DoubleSide} roughness={0.4} />
        </mesh>
      </group>
      {/* Sceau de bronze */}
      <mesh material={sealMat} position={[0, F + 5.0, COURT.backZ + 0.08]}>
        <circleGeometry args={[0.95, 64]} />
      </mesh>
      <mesh material={brass} position={[0, F + 5.0, COURT.backZ + 0.06]}>
        <torusGeometry args={[0.97, 0.04, 12, 64]} />
      </mesh>
    </group>
  );
}

function WitnessBox() {
  const wood = useMat(() => PBR.wood("walnut", { repeat: [1.2, 0.4] }), []);
  const brass = useMat(() => PBR.brass(), []);
  const glass = useMat(() => PBR.glass({ color: "#eef4f7", opacity: 0.25 }), []);
  const water = useMat(() => PBR.glass({ color: "#cfe4ee", opacity: 0.35 }), []);
  const { x, z, platform, rot } = WITNESS;
  return (
    <group position={[x, F, z]} rotation={[0, rot, 0]}>
      <mesh material={wood} position={[0, platform / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.9, platform, 1.7]} />
      </mesh>
      <Paneling width={1.9} height={0.78} position={[0, platform, 0.82]} cols={3} rows={1} />
      <Paneling width={1.6} height={0.78} position={[0.95, platform, 0.02]} rotationY={Math.PI / 2} cols={2} rows={1} />
      <mesh material={wood} position={[0, platform + 0.82, 0.8]}>
        <boxGeometry args={[2.0, 0.07, 0.24]} />
      </mesh>
      {/* Micro sur col de cygne, carafe et verre d'eau */}
      <group position={[0.35, platform + 0.86, 0.75]}>
        <mesh material={brass} position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 0.03, 16]} />
        </mesh>
        <mesh material={brass} position={[-0.04, 0.2, -0.08]} rotation={[0.6, 0, 0.2]}>
          <cylinderGeometry args={[0.006, 0.006, 0.38, 8]} />
        </mesh>
        <mesh position={[-0.1, 0.36, -0.2]} rotation={[1.1, 0, 0.2]}>
          <capsuleGeometry args={[0.018, 0.06, 4, 12]} />
          <meshStandardMaterial color="#111" roughness={0.5} />
        </mesh>
      </group>
      <mesh material={water} position={[-0.55, platform + 0.92, 0.76]}>
        <cylinderGeometry args={[0.035, 0.03, 0.11, 16]} />
      </mesh>
      <mesh material={glass} position={[-0.72, platform + 0.97, 0.76]}>
        <cylinderGeometry args={[0.05, 0.06, 0.22, 16]} />
      </mesh>
    </group>
  );
}

/** Mobilier : tables des avocats, pupitre, greffier, balustrade, bancs du public, box du jury. */
function Furniture() {
  const wood = useMat(() => PBR.wood("walnut", { repeat: [2, 0.6] }), []);
  const leather = useMat(() => PBR.leather({ color: "#2a1a12", repeat: [1, 1] }), []);
  const paper = useMat(() => PBR.paper({ color: "#f3efe4" }), []);
  const brass = useMat(() => PBR.brass(), []);
  const balusters = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.03, 0.035, 0.8, 10);
    const n = 44;
    const mesh = new THREE.InstancedMesh(g, wood, n);
    const o = new THREE.Object3D();
    let i = 0;
    for (const side of [-1, 1]) {
      for (let k = 0; k < 22; k++) {
        o.position.set(side * (0.9 + k * 0.3), F + 0.45, 0.4);
        o.updateMatrix();
        mesh.setMatrixAt(i++, o.matrix);
      }
    }
    mesh.castShadow = true;
    return mesh;
  }, [wood]);
  const tables = [
    { x: -2.05, z: -1.55 },
    { x: 2.05, z: -1.55 },
  ];
  return (
    <group>
      {tables.map((t) => (
        <group key={t.x} position={[t.x, F, t.z]}>
          <mesh material={wood} position={[0, 0.74, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 0.06, 0.95]} />
          </mesh>
          <Paneling width={2.1} height={0.7} position={[0, 0.02, -0.44]} cols={3} rows={1} />
          {[-0.6, 0.55].map((dx, i) => (
            <mesh key={i} material={paper} position={[t.x < 0 ? dx : -dx, 0.775, 0.1]} rotation={[-Math.PI / 2, 0, 0.1 * (i ? 1 : -1)]}>
              <planeGeometry args={[0.22, 0.29]} />
            </mesh>
          ))}
          {[-0.5, 0.5].map((dx) => (
            <group key={dx} position={[dx, 0, 0.75]}>
              <mesh material={leather} position={[0, 0.48, 0]} castShadow>
                <boxGeometry args={[0.58, 0.12, 0.55]} />
              </mesh>
              <mesh material={leather} position={[0, 0.9, 0.27]} castShadow>
                <boxGeometry args={[0.58, 0.7, 0.1]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* Pupitre */}
      <group position={[LECTERN.x, F, LECTERN.z]}>
        <mesh material={wood} position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.62, 1.1, 0.42]} />
        </mesh>
        <mesh material={wood} position={[0, 1.15, 0.02]} rotation={[-0.25, 0, 0]} castShadow>
          <boxGeometry args={[0.7, 0.04, 0.5]} />
        </mesh>
        <mesh material={brass} position={[0.2, 1.3, -0.1]} rotation={[0.8, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.3, 8]} />
        </mesh>
      </group>
      {/* Bureau du greffier et sténotypiste */}
      <group position={[0, F, -9.2]}>
        <mesh material={wood} position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 1.0, 0.6]} />
        </mesh>
        <mesh material={paper} position={[0.5, 1.01, 0]} rotation={[-Math.PI / 2, 0, 0.2]}>
          <planeGeometry args={[0.22, 0.29]} />
        </mesh>
      </group>
      <Mannequin pose="sit" suit="#2b2b30" skin="#8d5a3d" hair="#141010" tie={null} position={[-0.6, F, -9.75]} seed={31} />
      <group position={[1.9, F, -8.3]} rotation={[0, -0.6, 0]}>
        <mesh material={wood} position={[0, 0.35, 0]}>
          <boxGeometry args={[0.5, 0.7, 0.4]} />
        </mesh>
        <mesh material={brass} position={[0, 0.72, 0]}>
          <boxGeometry args={[0.24, 0.05, 0.18]} />
        </mesh>
      </group>
      <Mannequin pose="sit" suit="#3d3a44" skin="#e0b48f" hair="#8a6a3a" tie={null} position={[1.9, F, -7.85]} rotationY={Math.PI - 0.6} seed={32} />
      {/* Huissier près de la porte du jury */}
      <Mannequin pose="stand" suit="#1a2233" shirt="#c9ccd6" tie="#0c1020" skin="#6b4630" hair="#111" build={1.15} position={[6.6, F, -10.5]} rotationY={-2.2} seed={33} />
      {/* Balustrade */}
      <primitive object={balusters} />
      {[-1, 1].map((side) => (
        <mesh key={side} material={wood} position={[side * 4.15, F + 0.9, 0.4]} castShadow>
          <boxGeometry args={[6.7, 0.08, 0.14]} />
        </mesh>
      ))}
    </group>
  );
}

function Gallery() {
  const wood = useMat(() => PBR.wood("walnut", { repeat: [3, 0.3] }), []);
  const people = useMemo(() => {
    const r = rng(9);
    const out: { x: number; z: number; suit: string; skin: string; hair: string; seed: number }[] = [];
    for (const z of [1.6, 2.8, 4.0, 5.2]) {
      for (const side of [-1, 1]) {
        for (let k = 0; k < 7; k++) {
          if (r() < 0.45) continue;
          out.push({
            x: side * (1.5 + k * 0.78 + (r() - 0.5) * 0.15),
            z,
            suit: ["#2a2d34", "#4a4036", "#1d2433", "#5a5048", "#6b2a2a", "#2f3d2f"][Math.floor(r() * 6)]!,
            skin: ["#e0b48f", "#a8785a", "#6b4630", "#c89c7e", "#8d5a3d"][Math.floor(r() * 5)]!,
            hair: ["#2a2018", "#8a6a3a", "#111", "#c9a76a", "#9a9a9a"][Math.floor(r() * 5)]!,
            seed: Math.floor(r() * 1000),
          });
        }
      }
    }
    return out;
  }, []);
  return (
    <group>
      {[1.6, 2.8, 4.0, 5.2].map((z) =>
        [-1, 1].map((side) => (
          <group key={`${z}${side}`} position={[side * 3.9, F, z + 0.2]}>
            <mesh material={wood} position={[0, 0.45, 0]} castShadow receiveShadow>
              <boxGeometry args={[5.4, 0.08, 0.45]} />
            </mesh>
            <mesh material={wood} position={[0, 0.85, 0.25]} castShadow>
              <boxGeometry args={[5.4, 0.7, 0.06]} />
            </mesh>
          </group>
        )),
      )}
      {people.map((p, i) => (
        <Mannequin key={i} pose="sit" suit={p.suit} skin={p.skin} hair={p.hair} tie={i % 3 ? null : "#3a1418"} position={[p.x, F, p.z]} rotationY={Math.PI} seed={p.seed} />
      ))}
    </group>
  );
}

function JuryBox() {
  const wood = useMat(() => PBR.wood("walnut", { repeat: [2, 0.4] }), []);
  const jurors = useMemo(() => {
    const r = rng(21);
    const out: { x: number; y: number; z: number; suit: string; skin: string; hair: string; seed: number; rot: number }[] = [];
    for (let row = 0; row < 2; row++) {
      for (let k = 0; k < 6; k++) {
        out.push({
          x: 5.0 + row * 1.0,
          y: F + 0.2 + row * 0.3,
          z: -8.9 + k * 0.95,
          suit: ["#3a3f4a", "#5a4a3a", "#2c2f36", "#6b5a4a", "#7a2c2c", "#2a3a4a", "#4a4a4a"][Math.floor(r() * 7)]!,
          skin: ["#e0b48f", "#a8785a", "#6b4630", "#c89c7e", "#8d5a3d", "#f0c8a8"][Math.floor(r() * 6)]!,
          hair: ["#2a2018", "#8a6a3a", "#111", "#c9a76a", "#9a9a9a", "#5a3a20"][Math.floor(r() * 6)]!,
          seed: 200 + row * 10 + k,
          rot: -Math.PI / 2 + (r() - 0.5) * 0.4 + 0.25,
        });
      }
    }
    return out;
  }, []);
  return (
    <group>
      <mesh material={wood} position={[5.5, F + 0.1, -6.3]} receiveShadow>
        <boxGeometry args={[2.6, 0.2, 6.4]} />
      </mesh>
      <mesh material={wood} position={[6.1, F + 0.35, -6.3]} receiveShadow>
        <boxGeometry args={[1.2, 0.3, 6.4]} />
      </mesh>
      <Paneling width={6.4} height={0.95} position={[4.2, F, -6.3]} rotationY={Math.PI / 2} cols={6} rows={1} />
      <mesh material={wood} position={[4.2, F + 1.0, -6.3]}>
        <boxGeometry args={[0.18, 0.06, 6.5]} />
      </mesh>
      {jurors.map((j, i) => (
        <Actor key={i} id="guard" extra look={randomLook(j.seed)} pose="sit" position={[j.x, j.y, j.z]} rotationY={j.rot} lookAt={ROURKE_HEAD} legs={false} />
      ))}
    </group>
  );
}

function Lamps() {
  const brass = useMat(() => PBR.brass(), []);
  const globe = useMat(() => new THREE.MeshStandardMaterial({ color: "#fff", emissive: "#ffe6c4", emissiveIntensity: 2.2, roughness: 0.3 }), []);
  const spots: [number, number][] = [
    [-3, -7],
    [3, -7],
    [-3, -1],
    [3, -1],
    [-3, 4],
    [3, 4],
  ];
  return (
    <group>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, COURT.ceilY, z]}>
          <mesh material={brass} position={[0, -0.6, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 1.2, 6]} />
          </mesh>
          <mesh material={globe} position={[0, -1.3, 0]}>
            <sphereGeometry args={[0.2, 24, 16]} />
          </mesh>
          {i < 4 && <pointLight position={[0, -1.5, 0]} intensity={6} distance={9} decay={2} color="#ffdcb0" />}
        </group>
      ))}
    </group>
  );
}

/** Lumière d'appoint qui suit la caméra (comme une réflexion de plateau) : les visages restent lisibles. */
function CameraFill() {
  const l = useRef<THREE.PointLight>(null);
  useFrame(({ camera }) => {
    if (!l.current) return;
    l.current.position.set(0.6, 0.5, 0.2).applyQuaternion(camera.quaternion).add(camera.position);
  });
  return <pointLight ref={l} intensity={1.6} distance={5} decay={1.6} color="#fff1e0" />;
}

export function Courtroom() {
  const phase = useCourt((s) => s.phase);
  const cross = phase === "cross" || phase === "verdict";
  return (
    <group>
      <SceneEnvironment name="hall" intensity={0.5} />
      <Shell />
      <Windows />
      <Beams />
      <Bench />
      <WitnessBox />
      <Furniture />
      <JuryBox />
      <Gallery />
      <Lamps />
      <CameraFill />
      {/* Acteurs */}
      <Actor id="rourke" pose="witness" position={[WITNESS.x, F + WITNESS.platform + 0.12, WITNESS.z]} rotationY={WITNESS.rot} legs={false} />
      <Actor id="whitford" pose="bench" position={[JUDGE.x, JUDGE.y, JUDGE.z]} rotationY={0} legs={false} lookAt={ROURKE_HEAD} />
      {cross ? (
        <Actor id="brandt" pose="sit" position={[DEFENSE_SEAT.x, F, DEFENSE_SEAT.z]} rotationY={Math.PI} legs={false} lookAt={ROURKE_HEAD} />
      ) : (
        <Actor id="brandt" pose="stand" position={[LECTERN.x + 0.05, F, LECTERN.z - 0.45]} rotationY={-2.55} lookAt={ROURKE_HEAD} />
      )}
      {/* Lumière du matin par les fenêtres (ombres des meneaux), appoint chaud des suspensions */}
      <directionalLight
        position={[-30, 22, -6]}
        intensity={2.6}
        color="#e8eef6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
      />
      <hemisphereLight args={["#e9e4da", "#3a2a1e", 0.45]} />
    </group>
  );
}
