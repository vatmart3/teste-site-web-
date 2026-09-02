"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { paperFragment, paperVertex } from "./shaders";

export type HeroPhase = "repos" | "scan" | "separation" | "resultat";

type Props = { phase: HeroPhase };

export function Scene({ phase }: Props) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 3.2], fov: 42 }}
      style={{ pointerEvents: "none" }}
    >
      <Feuille phase={phase} />
      <TroisObjets phase={phase} />
    </Canvas>
  );
}

function Feuille({ phase }: Props) {
  const { viewport } = useThree();
  // la feuille déborde du cadre : c'est la page, pas un objet posé dessus
  const largeur = viewport.width * 1.14;
  const hauteur = viewport.height * 1.14;
  const material = useRef<THREE.ShaderMaterial>(null);
  const scan = useRef(-1);
  const fold = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScan: { value: -1 },
      uFold: { value: 0 },
    }),
    [],
  );

  useFrame((state, delta) => {
    const step = Math.min(delta, 0.05);
    uniforms.uTime.value = state.clock.elapsedTime;

    if (phase === "scan") {
      scan.current = scan.current < 0 ? 1.12 : scan.current - step * 0.78;
      if (scan.current < -0.12) scan.current = 1.12;
    } else {
      scan.current = -1;
    }
    uniforms.uScan.value = scan.current;

    const target = phase === "separation" || phase === "resultat" ? 1 : 0;
    fold.current += (target - fold.current) * Math.min(1, step * 2.6);
    uniforms.uFold.value = fold.current;

    if (material.current) material.current.needsUpdate = false;
  });

  return (
    <mesh>
      <planeGeometry args={[largeur, hauteur, 60, 72]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={paperVertex}
        fragmentShader={paperFragment}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Le paquet de fiches, le graphe de nœuds et le document plié : ils sortent de
 *  la feuille au moment du pli, puis s'effacent en laissant la place aux onglets. */
function TroisObjets({ phase }: Props) {
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0);

  const graphe = useMemo(() => {
    const points: [number, number, number][] = [
      [0, 0, 0],
      [-0.22, 0.2, 0],
      [0.24, 0.16, 0],
      [-0.16, -0.22, 0],
      [0.2, -0.2, 0],
    ];
    const positions: number[] = [];
    for (let i = 1; i < points.length; i += 1) {
      const a = points[0];
      const b = points[i];
      if (!a || !b) continue;
      positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return { points, geometry };
  }, []);

  useFrame((state, delta) => {
    const step = Math.min(delta, 0.05);
    const target = phase === "separation" ? 1 : 0;
    progress.current += (target - progress.current) * Math.min(1, step * 2.2);
    if (!group.current) return;
    group.current.visible = progress.current > 0.02;
    group.current.scale.setScalar(0.35 + progress.current * 0.65);
    group.current.children.forEach((child, index) => {
      const spread = [-1.05, 0, 1.05][index] ?? 0;
      child.position.x = spread * progress.current;
      child.position.y = (index === 1 ? 0.05 : -0.02) * progress.current;
      child.rotation.z = (index - 1) * 0.16 * progress.current;
    });
  });

  return (
    <group ref={group} visible={false}>
      {/* le paquet de fiches */}
      <group>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} position={[index * 0.018, index * 0.026, index * 0.012]} rotation={[0, 0, (index - 1.5) * 0.045]}>
            <boxGeometry args={[0.86, 0.56, 0.012]} />
            <meshBasicMaterial color={index === 3 ? "#ffffff" : "#f2f2ee"} />
          </mesh>
        ))}
        <mesh position={[0.054, 0.078 + 0.2, 0.05]}>
          <planeGeometry args={[0.4, 0.05]} />
          <meshBasicMaterial color="#ffe94a" />
        </mesh>
      </group>

      {/* le graphe de nœuds */}
      <group>
        <lineSegments geometry={graphe.geometry}>
          <lineBasicMaterial color="#0b0b0c" />
        </lineSegments>
        {graphe.points.map((point, index) => (
          <mesh key={index} position={point}>
            <circleGeometry args={[index === 0 ? 0.07 : 0.045, 20]} />
            <meshBasicMaterial color={index === 0 ? "#0b0b0c" : "#ff7bb0"} />
          </mesh>
        ))}
      </group>

      {/* le document plié */}
      <group>
        <mesh position={[-0.2, 0, 0]} rotation={[0, 0.42, 0]}>
          <planeGeometry args={[0.44, 0.78]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.2, 0, 0]} rotation={[0, -0.42, 0]}>
          <planeGeometry args={[0.44, 0.78]} />
          <meshBasicMaterial color="#efefeb" side={THREE.DoubleSide} />
        </mesh>
        {[0.22, 0.06, -0.1].map((y) => (
          <mesh key={y} position={[-0.2, y, 0.01]} rotation={[0, 0.42, 0]}>
            <planeGeometry args={[0.3, 0.014]} />
            <meshBasicMaterial color="#0b0b0c" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
