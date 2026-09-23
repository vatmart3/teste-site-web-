"use client";
/**
 * Le hall de la tour en 3D : sol en marbre noir veiné d'or (reflets), lambris de noyer, lettres de laiton
 * extrudées « HARLOW & VANCE », comptoir d'accueil avec le vigile, portiques en laiton et verre avec
 * lecteurs de badge, colonnes, plafond à caissons et rais de lumière.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { anchorState } from "../ui/Anchors";
import { PBR, tex, useMat } from "../three/pbr";
import { SceneEnvironment, useEnvMap } from "../three/environment";
import { Mannequin } from "./Mannequin";
import { useTextGeometry } from "./useBrassText";

export const LOBBY = { floorY: -1.62, ceilY: 3.2, backZ: -12, halfW: 5.5 } as const;
/** Portiques à droite du comptoir ; le lecteur du portique n° 2 est celui du joueur. */
const GATES = { xs: [0.9, 2.3, 3.7], z: -6.0 } as const;
export const LOBBY_READER: [number, number, number] = [GATES.xs[1] + 0.24, LOBBY.floorY + 1.02, GATES.z + 0.2];
export const LOBBY_DESK_SPOT: [number, number, number] = [-1.6, LOBBY.floorY + 0.01, -5.0];

/**
 * Sol en marbre noir poli : reflets plans réels du hall (qualité haute). Les reflets de l'HDRI y sont
 * atténués : dans un hall fermé, ses fenêtres lumineuses feraient des nappes blanches au sol.
 */
function Floor({ quality }: { quality: "high" | "medium" }) {
  const albedo = tex("marble_albedo", { srgb: true, repeat: [6, 8] });
  const env = useEnvMap("hall");
  const W = LOBBY.halfW * 2;
  const D = 14;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LOBBY.floorY, LOBBY.backZ + D / 2 - 1]} receiveShadow>
      <planeGeometry args={[W, D]} />
      {quality === "high" ? (
        <MeshReflectorMaterial key={env ? 1 : 0} map={albedo} envMap={env} envMapIntensity={0.06} roughness={0.28} metalness={0} blur={[0, 0]} resolution={1024} mixBlur={0} mixStrength={1.6} mixContrast={1} depthScale={0} mirror={0.85} />
      ) : (
        <meshPhysicalMaterial key={env ? 1 : 0} map={albedo} envMap={env} envMapIntensity={0.06} roughness={0.28} clearcoat={0.6} clearcoatRoughness={0.12} />
      )}
    </mesh>
  );
}

function Walls() {
  const walnut = useMat(() => PBR.wood("walnut", { repeat: [3, 1.2] }), []);
  // Murs latéraux : parement de pierre calcaire claire (joints creux), qui éclaire le hall par réflexion.
  const stone = useMat(() => PBR.plaster({ color: "#cdbfa6", repeat: [5, 2], normalScale: 0.8 }), []);
  const joint = useMat(() => new THREE.MeshStandardMaterial({ color: "#3a332a", roughness: 0.9 }), []);
  const ceiling = useMat(() => new THREE.MeshStandardMaterial({ color: "#1a1612", roughness: 0.8 }), []);
  const brass = useMat(() => PBR.brass(), []);
  const H = LOBBY.ceilY - LOBBY.floorY;
  const midY = (LOBBY.ceilY + LOBBY.floorY) / 2;
  const coffers = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = -4; x <= 4; x += 2) for (let z = -1; z >= -11; z -= 2) out.push([x, z]);
    return out;
  }, []);
  return (
    <group>
      {/* Mur du fond en noyer, filets de laiton */}
      <mesh material={walnut} position={[0, midY, LOBBY.backZ]} receiveShadow>
        <planeGeometry args={[LOBBY.halfW * 2, H]} />
      </mesh>
      {[-3.3, -1.1, 1.1, 3.3].map((x) => (
        <mesh key={x} material={brass} position={[x, midY, LOBBY.backZ + 0.01]}>
          <boxGeometry args={[0.025, H, 0.01]} />
        </mesh>
      ))}
      {/* Murs latéraux en pierre, calepinage 1,6 × 1,2 m */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * LOBBY.halfW, midY, LOBBY.backZ / 2 + 0.5]} rotation={[0, -side * Math.PI / 2, 0]}>
          <mesh material={stone} receiveShadow>
            <planeGeometry args={[13, H]} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={`v${i}`} material={joint} position={[-6.5 + (i + 0.5) * 1.6, 0, 0.002]}>
              <planeGeometry args={[0.012, H]} />
            </mesh>
          ))}
          {[1.2, 2.4, 3.6].map((y) => (
            <mesh key={`h${y}`} material={joint} position={[0, -H / 2 + y, 0.002]}>
              <planeGeometry args={[13, 0.012]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Plafond à caissons */}
      <mesh material={ceiling} position={[0, LOBBY.ceilY, LOBBY.backZ / 2 + 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[LOBBY.halfW * 2, 13]} />
      </mesh>
      {coffers.map(([x, z]) => (
        <mesh key={`${x}${z}`} material={ceiling} position={[x, LOBBY.ceilY - 0.12, z]}>
          <boxGeometry args={[1.85, 0.08, 1.85]} />
        </mesh>
      ))}
    </group>
  );
}

function Letters() {
  const big = useTextGeometry("HARLOW & VANCE", 0.36, 0.05);
  const small = useTextGeometry("44 — 52", 0.14, 0.03);
  const brass = useMat(() => PBR.brass({ color: "#d8b25c" }), []);
  return (
    <group position={[0, LOBBY.floorY + 3.05, LOBBY.backZ + 0.05]}>
      {big && <mesh geometry={big} material={brass} castShadow />}
      {small && <mesh geometry={small} material={brass} position={[0, -0.42, 0]} />}
    </group>
  );
}

function Desk() {
  const walnut = useMat(() => PBR.wood("walnut", { repeat: [2, 0.6] }), []);
  const top = useMat(() => PBR.marble({ repeat: [2, 0.4] }), []);
  const brass = useMat(() => PBR.brass(), []);
  const screen = useMat(() => new THREE.MeshStandardMaterial({ color: "#000", emissive: "#6fa8ff", emissiveIntensity: 1.4 }), []);
  const z = -6.2;
  const y0 = LOBBY.floorY;
  return (
    <group position={[-1.6, 0, 0]}>
      <mesh material={walnut} position={[0, y0 + 0.54, z]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.08, 0.8]} />
      </mesh>
      <mesh material={top} position={[0, y0 + 1.1, z - 0.05]} castShadow receiveShadow>
        <boxGeometry args={[3.3, 0.05, 0.95]} />
      </mesh>
      <mesh material={brass} position={[0, y0 + 0.2, z + 0.41]}>
        <boxGeometry args={[3.2, 0.03, 0.01]} />
      </mesh>
      <mesh material={screen} position={[-0.8, y0 + 1.3, z - 0.3]} rotation={[0, 0.3, 0]}>
        <planeGeometry args={[0.45, 0.28]} />
      </mesh>
      <Mannequin pose="stand" suit="#18223a" shirt="#c9ccd6" tie="#0c1020" skin="#a8785a" hair="#8a8a8a" build={1.12} position={[0.25, y0, z - 0.75]} seed={3} />
    </group>
  );
}

function Turnstiles() {
  const brass = useMat(() => PBR.brass(), []);
  const glass = useMat(() => PBR.glass({ color: "#e8f0f4", opacity: 0.22 }), []);
  const reader = useMat(() => new THREE.MeshStandardMaterial({ color: "#0c0d10", roughness: 0.3 }), []);
  const cabinet = useMat(() => new THREE.MeshPhysicalMaterial({ color: "#1b1c1f", metalness: 0.85, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }), []);
  const leds = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    leds.current.forEach((m, i) => {
      const ok = anchorState.reader === "ok" && i === 1;
      m.emissive.set(ok ? "#3cff7a" : "#ff3a2a");
      m.emissiveIntensity = ok ? 4 : 1.2 + Math.sin(clock.elapsedTime * 3 + i) * 0.3;
    });
  });
  const xs = GATES.xs;
  const y0 = LOBBY.floorY;
  const z = GATES.z;
  return (
    <group>
      {xs.map((x, i) => (
        <group key={x} position={[x, y0, z]}>
          <mesh material={cabinet} position={[0.24, 0.49, 0]} castShadow>
            <boxGeometry args={[0.14, 0.98, 0.9]} />
          </mesh>
          <mesh material={brass} position={[0.24, 0.995, 0]}>
            <boxGeometry args={[0.15, 0.012, 0.91]} />
          </mesh>
          <mesh material={glass} position={[-0.1, 0.62, 0]}>
            <boxGeometry args={[0.45, 0.6, 0.012]} />
          </mesh>
          <mesh material={reader} position={[0.24, 1.012, 0.2]}>
            <boxGeometry args={[0.12, 0.02, 0.16]} />
          </mesh>
          <mesh position={[0.24, 1.024, 0.13]}>
            <circleGeometry args={[0.012, 16]} />
            <meshStandardMaterial
              ref={(m) => {
                if (m) leds.current[i] = m;
              }}
              color="#200"
              emissive="#ff3a2a"
              emissiveIntensity={1.2}
            />
          </mesh>
        </group>
      ))}
      <mesh material={cabinet} position={[xs[0] - 0.48, y0 + 0.49, z]} castShadow>
        <boxGeometry args={[0.14, 0.98, 0.9]} />
      </mesh>
      <mesh material={brass} position={[xs[0] - 0.48, y0 + 0.995, z]}>
        <boxGeometry args={[0.15, 0.012, 0.91]} />
      </mesh>
    </group>
  );
}

function Columns() {
  const marble = useMat(() => PBR.marble({ repeat: [1, 2] }), []);
  const brass = useMat(() => PBR.brass(), []);
  const H = LOBBY.ceilY - LOBBY.floorY;
  return (
    <group>
      {[
        [-3.9, -1.5],
        [3.9, -1.5],
        [-3.9, -8],
        [3.9, -8],
      ].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x!, LOBBY.floorY + H / 2, z!]}>
          <mesh material={marble} castShadow receiveShadow>
            <cylinderGeometry args={[0.36, 0.36, H, 40]} />
          </mesh>
          <mesh material={brass} position={[0, -H / 2 + 0.12, 0]}>
            <cylinderGeometry args={[0.42, 0.44, 0.24, 40]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Rais de lumière : cônes additifs très transparents sous les spots (volumétrie « de cinéma »). */
function LightShafts() {
  const mat = useMat(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float uTime;
          void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float fade = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
            float a = edge * fade * 0.055 * (0.9 + 0.1 * sin(uTime * 0.7));
            gl_FragColor = vec4(vec3(1.0, 0.82, 0.58) * a, 1.0); }`,
      }),
    [],
  );
  useFrame(({ clock }) => {
    mat.uniforms.uTime!.value = clock.elapsedTime;
  });
  const spots: [number, number][] = [
    [-1.6, -5.2],
    [2.3, -5.2],
    [0, -9],
    [-2.2, -2],
    [2.2, -2],
  ];
  const H = LOBBY.ceilY - LOBBY.floorY;
  return (
    <group>
      {spots.map(([x, z]) => (
        <mesh key={`${x}${z}`} material={mat} position={[x, LOBBY.floorY + H / 2, z]} renderOrder={5}>
          <cylinderGeometry args={[0.09, 1.1, H, 32, 1, true]} />
        </mesh>
      ))}
    </group>
  );
}

function Lights() {
  const spots: [number, number][] = [
    [-1.6, -5.2],
    [2.3, -5.2],
    [0, -9],
    [-2.2, -2],
    [2.2, -2],
  ];
  return (
    <group>
      {spots.map(([x, z], i) => {
        const target = new THREE.Object3D();
        target.position.set(x, LOBBY.floorY, z);
        return (
          <group key={`${x}${z}`}>
            <primitive object={target} />
            <spotLight position={[x, LOBBY.ceilY - 0.05, z]} target={target} angle={0.55} penumbra={0.7} intensity={z > -3 ? 16 : 40} distance={9} decay={2} color="#ffd9a8" castShadow={i < 2} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0005} />
            <mesh position={[x, LOBBY.ceilY - 0.02, z]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.1, 24]} />
              <meshStandardMaterial color="#fff" emissive="#ffe2b8" emissiveIntensity={2.4} />
            </mesh>
          </group>
        );
      })}
      {/* Lumière chaude qui lave le mur de noyer et fait briller les lettres */}
      <spotLight position={[0, LOBBY.ceilY - 0.1, LOBBY.backZ + 3]} angle={0.7} penumbra={0.9} intensity={60} distance={8} decay={2} color="#ffcf90" target-position={[0, LOBBY.floorY + 2.6, LOBBY.backZ]} />
      <hemisphereLight args={["#ffe8cc", "#1a1410", 0.18]} />
    </group>
  );
}

export function Lobby({ quality }: { quality: "high" | "medium" }) {
  return (
    <group>
      <SceneEnvironment name="hall" intensity={0.55} />
      <Floor quality={quality} />
      <Walls />
      <Letters />
      <Desk />
      <Turnstiles />
      <Columns />
      <Lights />
      <LightShafts />
    </group>
  );
}
