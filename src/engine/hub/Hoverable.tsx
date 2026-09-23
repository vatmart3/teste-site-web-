"use client";
/**
 * Objet du bureau survolable : il se soulève de 2 cm, son ombre s'élargit, un liseré laiton l'entoure
 * (coque inversée légèrement gonflée autour de chaque pièce), petit son ; clic = ouvre sa vue. Inactif quand une vue est ouverte.
 */
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { audio } from "../audio/AudioEngine";
import { useAnchor } from "../props/useAnchor";
import { propAnchors } from "../props/model";
import { hubBus, useHub, type HubView } from "./state";
import { DESK_Y } from "./space";

let shadowTex: THREE.Texture | null = null;
function shadowTexture(): THREE.Texture {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.85)");
  g.addColorStop(0.55, "rgba(0,0,0,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

/** Ombre de contact douce posée sur le plateau. */
export function ContactShadow({ w, d, lift, opacity = 0.6 }: { w: number; d: number; lift?: { current: number }; opacity?: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity, toneMapped: false }), [opacity]);
  useFrame(() => {
    const l = lift?.current ?? 0;
    if (!mesh.current) return;
    mesh.current.scale.set(w * (1.25 + l * 9), d * (1.25 + l * 9), 1);
    mat.opacity = opacity * (1 - l * 14);
  });
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

export function Hoverable({
  view,
  position,
  rotationY = 0,
  footprint,
  children,
}: {
  view: HubView;
  position: readonly [number, number, number];
  rotationY?: number;
  footprint: [number, number];
  children: ReactNode;
}) {
  const inner = useRef<THREE.Group>(null);
  const lift = useRef(0);
  const hovered = useHub((s) => s.hovered === view);
  const blocked = useHub((s) => s.view !== null || s.moving);
  const gl = useThree((s) => s.gl);
  if (!propAnchors[view]) propAnchors[view] = { x: 0, y: 0, visible: false };
  useAnchor(view, inner);

  // Liseré laiton : une « coque » en BackSide un peu plus grande que chaque maillage, visible au survol.
  const shells = useRef<THREE.Mesh[]>([]);
  const shellMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        // Coque gonflée le long des normales, d'une épaisseur fixe en mètres (lisible même sur un objet plat).
        vertexShader: /* glsl */ `
          uniform float uThickness;
          void main() {
            vec3 n = normalize(normal);
            vec4 world = modelMatrix * vec4(position, 1.0);
            vec3 wn = normalize(mat3(modelMatrix) * n);
            world.xyz += wn * uThickness;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uOpacity;
          void main() {
            gl_FragColor = vec4(vec3(0.91, 0.78, 0.47) * 1.4, uOpacity);
            #include <colorspace_fragment>
          }
        `,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        uniforms: { uThickness: { value: 0.0035 }, uOpacity: { value: 0 } },
      }),
    [],
  );
  useEffect(() => {
    const g = inner.current;
    if (!g) return;
    const id = window.setTimeout(() => {
      const meshes: THREE.Mesh[] = [];
      g.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && !o.userData.shell) meshes.push(o as THREE.Mesh);
      });
      for (const m of meshes) {
        const shell = new THREE.Mesh(m.geometry, shellMat);
        shell.userData.shell = true;
        shell.raycast = () => undefined;
        m.add(shell);
        shells.current.push(shell);
      }
    }, 300);
    return () => {
      window.clearTimeout(id);
      for (const s of shells.current) s.removeFromParent();
      shells.current = [];
    };
  }, [shellMat]);

  useFrame((_, dt) => {
    const on = hovered && !blocked;
    const u = shellMat.uniforms.uOpacity!;
    u.value += ((on ? 0.95 : 0) - u.value) * Math.min(1, dt * 14);
    for (const s of shells.current) s.visible = u.value > 0.02;
    const target = on ? 0.02 : 0;
    lift.current += (target - lift.current) * Math.min(1, dt * 12);
    if (inner.current) inner.current.position.y = lift.current;
  });

  return (
    <group position={[position[0], position[1] ?? DESK_Y, position[2]]} rotation={[0, rotationY, 0]}>
      <ContactShadow w={footprint[0]} d={footprint[1]} lift={lift} />
      <group
          ref={inner}
          onPointerOver={(e) => {
            if (blocked) return;
            e.stopPropagation();
            if (useHub.getState().hovered !== view) void audio.sfx("sfx-ui-hover", { volume: 0.6 });
            useHub.getState().set({ hovered: view });
            gl.domElement.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            if (useHub.getState().hovered === view) useHub.getState().set({ hovered: null });
            gl.domElement.style.cursor = "";
          }}
          onClick={(e) => {
            if (blocked) return;
            e.stopPropagation();
            gl.domElement.style.cursor = "";
            useHub.getState().set({ hovered: null });
            hubBus.emit({ type: "open", view });
          }}
        >
          {children}
        </group>
    </group>
  );
}

/**
 * Zone survolable d'un élément du décor 3D (étagère, liège, écran, porte) : boîte invisible pour le clic,
 * cadre laiton lumineux au survol.
 */
export function RoomZone({ view, position, size }: { view: HubView; position: readonly [number, number, number]; size: readonly [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  const hovered = useHub((s) => s.hovered === view);
  const blocked = useHub((s) => s.view !== null || s.moving);
  const gl = useThree((s) => s.gl);
  if (!propAnchors[view]) propAnchors[view] = { x: 0, y: 0, visible: false };
  useAnchor(view, ref);
  const hit = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(size[0], size[1], size[2])), [size]);
  const line = useMemo(() => new THREE.LineBasicMaterial({ color: new THREE.Color("#e7c878").multiplyScalar(2.2), transparent: true, opacity: 0, toneMapped: false }), []);
  useFrame((_, dt) => {
    line.opacity += ((hovered && !blocked ? 1 : 0) - line.opacity) * Math.min(1, dt * 12);
  });
  return (
    <group position={position as [number, number, number]}>
      <mesh
        ref={ref}
        material={hit}
        userData={{ noShadow: true }}
        onPointerOver={(e) => {
          if (blocked) return;
          e.stopPropagation();
          if (useHub.getState().hovered !== view) void audio.sfx("sfx-ui-hover", { volume: 0.6 });
          useHub.getState().set({ hovered: view });
          gl.domElement.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          if (useHub.getState().hovered === view) useHub.getState().set({ hovered: null });
          gl.domElement.style.cursor = "";
        }}
        onClick={(e) => {
          if (blocked) return;
          e.stopPropagation();
          gl.domElement.style.cursor = "";
          useHub.getState().set({ hovered: null });
          hubBus.emit({ type: "open", view });
        }}
      >
        <boxGeometry args={size as [number, number, number]} />
      </mesh>
      <lineSegments geometry={edges} material={line} />
    </group>
  );
}
