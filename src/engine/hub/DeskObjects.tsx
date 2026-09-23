"use client";
/** Objets 3D posés sur le bureau (procéduraux, remplaçables par des glTF dans public/models). */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CASES } from "@/content/cases";
import { newYorkTime } from "@/lib/time";
import { useProfile } from "../state/profile";
import { unreadCount } from "@/content/messages";
import { rig } from "../camera/rig";
import { drawPhoneLcd } from "./textures";
import { useHub } from "./state";
import { useOptionalModel } from "./useOptionalModel";
import { roomState } from "../room/roomState";

const std = (color: string, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const brass = () => new THREE.MeshStandardMaterial({ color: "#c9a24a", roughness: 0.3, metalness: 0.9 });

// ------------------------------------------------------------------ Pile de chemises
export function FolderStack() {
  const tabs = useMemo(() => CASES.map((c) => std(c.tab, 0.8)), []);
  const kraftA = useMemo(() => std("#cfae72", 0.85), []);
  const kraftB = useMemo(() => std("#c29f62", 0.85), []);
  return (
    <group>
      {CASES.map((c, i) => {
        const y = 0.004 + i * 0.0065;
        const jitter = Math.sin(i * 12.9) * 0.012;
        return (
          <group key={c.id} position={[jitter, y, Math.cos(i * 7.3) * 0.008]} rotation={[0, Math.sin(i * 3.1) * 0.06, 0]}>
            <mesh material={i % 2 ? kraftA : kraftB}>
              <boxGeometry args={[0.23, 0.006, 0.31]} />
            </mesh>
            {/* Onglet coloré qui dépasse sur le côté */}
            <mesh position={[0.118, 0, -0.1 + (i % 3) * 0.08]} material={tabs[i]}>
              <boxGeometry args={[0.02, 0.005, 0.06]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ------------------------------------------------------------------ Téléphone de bureau
export function DeskPhone() {
  const model = useOptionalModel("desk-phone");
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const lcd = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 96;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const profile = useProfile();
  const unread = unreadCount({ flags: profile.flags, arrivalSeen: profile.arrivalSeen }, profile.readMessages);

  useEffect(() => {
    const draw = () => {
      drawPhoneLcd(lcd.image as HTMLCanvasElement, unread, newYorkTime().digital);
      lcd.needsUpdate = true;
    };
    draw();
    const id = window.setInterval(draw, 15000);
    return () => window.clearInterval(id);
  }, [lcd, unread]);

  useFrame(({ clock }) => {
    // Voyant rouge qui clignote tant qu'il y a des messages non lus.
    if (led.current) led.current.emissiveIntensity = unread > 0 ? (Math.sin(clock.elapsedTime * 4) > 0 ? 4 : 0.2) : 0.05;
  });

  const geo = useMemo(
    () => ({
      base: new RoundedBoxGeometry(0.2, 0.05, 0.17, 3, 0.012),
      handset: new RoundedBoxGeometry(0.19, 0.035, 0.05, 3, 0.015),
      key: new RoundedBoxGeometry(0.018, 0.008, 0.014, 2, 0.003),
    }),
    [],
  );
  const mats = useMemo(() => ({ body: std("#16171b", 0.45), key: std("#2a2c31", 0.6), lcd: new THREE.MeshBasicMaterial({ map: lcd, toneMapped: false }) }), [lcd]);

  if (model) return <primitive object={model} />;
  return (
    <group rotation={[0, -0.35, 0]}>
      <mesh geometry={geo.base} material={mats.body} position={[0, 0.025, 0]} rotation={[0.12, 0, 0]} />
      <mesh geometry={geo.handset} material={mats.body} position={[0, 0.062, -0.045]} rotation={[0.1, 0, 0]} />
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} geometry={geo.key} material={mats.key} position={[-0.04 + (i % 3) * 0.024, 0.056, 0.0 + Math.floor(i / 3) * 0.019]} rotation={[0.12, 0, 0]} />
      ))}
      <mesh material={mats.lcd} position={[0.05, 0.058, 0.02]} rotation={[-Math.PI / 2 + 0.12, 0, 0]}>
        <planeGeometry args={[0.06, 0.024]} />
      </mesh>
      <mesh position={[0.075, 0.056, 0.065]}>
        <sphereGeometry args={[0.005, 12, 12]} />
        <meshStandardMaterial ref={led} color="#400" emissive="#ff2a1a" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ Mallette (atouts)
export const briefcaseState = { open: 0 };

export function Briefcase() {
  const model = useOptionalModel("briefcase");
  const lid = useRef<THREE.Group>(null);
  const geo = useMemo(
    () => ({
      shell: new RoundedBoxGeometry(0.44, 0.05, 0.32, 4, 0.012),
      handle: new THREE.TorusGeometry(0.035, 0.008, 10, 24, Math.PI),
      clasp: new THREE.BoxGeometry(0.03, 0.012, 0.008),
    }),
    [],
  );
  const mats = useMemo(() => ({ leather: std("#3a2214", 0.55), felt: std("#5a1418", 0.95), brass: brass() }), []);
  useFrame(() => {
    if (lid.current) lid.current.rotation.x = -briefcaseState.open * 1.85;
  });
  if (model) return <primitive object={model} />;
  return (
    <group>
      <mesh geometry={geo.shell} material={mats.leather} position={[0, 0.025, 0]} />
      <mesh material={mats.felt} position={[0, 0.0505, 0]}>
        <boxGeometry args={[0.41, 0.001, 0.29]} />
      </mesh>
      {/* Couvercle articulé sur l'arête arrière */}
      <group ref={lid} position={[0, 0.05, -0.16]}>
        <mesh geometry={geo.shell} material={mats.leather} position={[0, 0.025, 0.16]} />
        <mesh geometry={geo.handle} material={mats.brass} position={[0, 0.05, 0.325]} rotation={[0, 0, 0]} />
        <mesh geometry={geo.clasp} material={mats.brass} position={[-0.12, 0.03, 0.322]} />
        <mesh geometry={geo.clasp} material={mats.brass} position={[0.12, 0.03, 0.322]} />
      </group>
    </group>
  );
}

// ------------------------------------------------------------------ Gobelet de café + vapeur
const steamVertex = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime;
varying float vA;
void main() {
  float t = fract(uTime * (0.18 + aSeed.x * 0.12) + aSeed.y);
  vec3 p = position;
  p.y += t * 0.16;
  p.x += sin(t * 6.0 + aSeed.z * 6.28) * 0.012 * t + (aSeed.x - 0.5) * 0.01;
  p.z += cos(t * 5.0 + aSeed.y * 6.28) * 0.01 * t;
  vA = (1.0 - t) * smoothstep(0.0, 0.15, t);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (18.0 + t * 60.0) / -mv.z;
}
`;
const steamFragment = /* glsl */ `
uniform float uAmount;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA * 0.09 * uAmount;
  gl_FragColor = vec4(vec3(0.9), a);
}
`;

export function CoffeeCup() {
  const model = useOptionalModel("coffee-cup");
  const mats = useMemo(() => ({ cup: std("#f1ebe0", 0.8), band: std("#16223a", 0.6), lid: std("#1a1a1a", 0.4) }), []);
  const steam = useMemo(() => {
    const n = 60;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos.set([(Math.random() - 0.5) * 0.02, 0.125, (Math.random() - 0.5) * 0.02], i * 3);
      seed.set([Math.random(), Math.random(), Math.random()], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 3));
    const m = new THREE.ShaderMaterial({ vertexShader: steamVertex, fragmentShader: steamFragment, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uAmount: { value: 1 } } });
    return { g, m };
  }, []);
  useFrame(({ clock }) => {
    steam.m.uniforms.uTime!.value = rig.reducedMotion ? 0 : clock.elapsedTime;
    steam.m.uniforms.uAmount!.value = (useHub.getState().view ? 0.4 : 1) * roomState.coffeeHeat;
  });
  return (
    <group>
      {model ? (
        <primitive object={model} />
      ) : (
        <>
          <mesh material={mats.cup} position={[0, 0.055, 0]}>
            <cylinderGeometry args={[0.042, 0.032, 0.11, 32]} />
          </mesh>
          <mesh material={mats.band} position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.0405, 0.0355, 0.03, 32, 1, true]} />
          </mesh>
          <mesh material={mats.lid} position={[0, 0.114, 0]}>
            <cylinderGeometry args={[0.044, 0.044, 0.01, 32]} />
          </mesh>
        </>
      )}
      <points geometry={steam.g} material={steam.m} frustumCulled={false} />
    </group>
  );
}
