"use client";
import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneDef } from "@/content/types";
import { rig } from "../camera/rig";
import { fromAuthoring } from "../plate/projection";
import { viewParams } from "../plate/view";

const vertex = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform vec2 uShift;
uniform float uPivot;
uniform float uDpr;
uniform vec2 uShaftPos;
varying float vGlow;
varying float vDepth;
void main() {
  float d = mix(0.55, 1.0, aSeed.z);
  vec2 p = aSeed.xy;
  // Dérive lente, brownienne, légèrement ascendante.
  p.x += sin(uTime * 0.13 + aSeed.w * 6.28) * 0.03 + uTime * 0.002 * (aSeed.w - 0.5);
  p.y += uTime * 0.006 * (0.3 + aSeed.w) + sin(uTime * 0.21 + aSeed.w * 12.0) * 0.015;
  p = fract(p);
  // Parallaxe : les particules proches glissent davantage.
  p -= uShift * (d - uPivot);
  // Éclat dans le faisceau lumineux (cône qui s'élargit vers le bas).
  float spread = 0.08 + (uShaftPos.y - p.y) * 0.45;
  float dx = abs(p.x - uShaftPos.x) / max(spread, 0.05);
  vGlow = exp(-dx * dx * 2.0) * step(p.y, uShaftPos.y + 0.02);
  vDepth = d;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = (1.0 + d * d * 5.0) * uDpr;
}
`;

const fragment = /* glsl */ `
uniform float uOpacity;
uniform float uReveal;
uniform float uAmount;
uniform float uFocus;
uniform float uExposure;
varying float vGlow;
varying float vDepth;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  // Les particules hors mise au point deviennent de gros disques doux (bokeh).
  float blur = clamp(abs(vDepth - uFocus) * 1.6, 0.05, 0.5);
  float a = smoothstep(0.5, 0.5 - blur, length(c));
  float b = (0.012 + vGlow * 0.55) * uAmount * uOpacity * uExposure * clamp(uReveal * 2.0 - 1.0, 0.0, 1.0);
  gl_FragColor = vec4(vec3(1.0, 0.9, 0.75) * b * a, 1.0);
  #include <colorspace_fragment>
}
`;

export function Dust({
  amount,
  scene,
  opacity,
  reveal,
  order,
  exposure,
}: {
  amount: number;
  scene: SceneDef;
  opacity: THREE.IUniform<number>;
  reveal: THREE.IUniform<number>;
  order: number;
  exposure: THREE.IUniform<number>;
}) {
  const dpr = useThree((s) => s.viewport.dpr);
  const { geometry, material } = useMemo(() => {
    const n = Math.round(260 * amount);
    const seeds = new Float32Array(n * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    const sp = scene.shaft ? fromAuthoring(scene.shaft.at) : { x: 0.5, y: 1.2 };
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uShift: { value: new THREE.Vector2() },
        uPivot: { value: scene.pivot },
        uDpr: { value: 1 },
        uShaftPos: { value: new THREE.Vector2(sp.x, sp.y) },
        uOpacity: opacity,
        uReveal: reveal,
        uAmount: { value: amount },
        uFocus: { value: 0.5 },
        uExposure: exposure,
      },
    });
    return { geometry: g, material: m };
  }, [amount, scene, opacity, reveal, exposure]);

  useFrame(({ clock, size }) => {
    const { cover, proj } = viewParams(scene, rig, size.width, size.height);
    const u = material.uniforms;
    u.uTime!.value = rig.reducedMotion ? 0 : clock.elapsedTime;
    u.uShift!.value.set(proj.offset.x / cover.scale.x, proj.offset.y / cover.scale.y);
    u.uDpr!.value = dpr;
    u.uFocus!.value = rig.focus;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={order} />;
}
