"use client";
/** Pluie qui tombe vers la caméra : traînées qui s'écartent d'un point de fuite en grandissant. */
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Vec2 } from "../plate/projection";
import { fromAuthoring } from "../plate/projection";
import { rig } from "../camera/rig";

const vertex = /* glsl */ `
attribute vec4 aSeed;
attribute float aEnd;
uniform float uTime;
uniform vec2 uFrom;
uniform float uAspect;
uniform vec2 uLook;
varying float vA;
void main() {
  float p = fract(uTime * (0.35 + aSeed.z * 0.4) + aSeed.w);
  float r = p * p * 1.6;
  float ang = aSeed.x * 6.2831;
  vec2 dir = vec2(cos(ang), sin(ang) * 0.6 - 0.8);
  dir = normalize(dir);
  float len = 0.02 + p * p * 0.12;
  float rr = r - aEnd * len;
  vec2 pos = uFrom + dir * max(rr, 0.0) * vec2(1.0 / uAspect, 1.0) - uLook * p * 0.08;
  vA = p * (1.0 - p) * 4.0 * (0.4 + aSeed.y * 0.6) * (1.0 - aEnd * 0.8);
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
`;

const fragment = /* glsl */ `
uniform float uOpacity;
uniform float uAmount;
varying float vA;
void main() {
  gl_FragColor = vec4(vec3(0.75, 0.82, 0.95) * vA * 0.35 * uAmount * uOpacity, 1.0);
  #include <colorspace_fragment>
}
`;

export function RainStreaks({ amount, from, opacity, order }: { amount: number; from: Vec2; opacity: THREE.IUniform<number>; order: number }) {
  const { geometry, material } = useMemo(() => {
    const n = Math.round(700 * amount);
    const seeds = new Float32Array(n * 2 * 4);
    const ends = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const s = [Math.random(), Math.random(), Math.random(), Math.random()];
      for (let e = 0; e < 2; e++) {
        seeds.set(s, (i * 2 + e) * 4);
        ends[i * 2 + e] = e;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    g.setAttribute("aEnd", new THREE.BufferAttribute(ends, 1));
    const f = fromAuthoring(from);
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uFrom: { value: new THREE.Vector2(f.x, f.y) },
        uAspect: { value: 16 / 9 },
        uLook: { value: new THREE.Vector2() },
        uOpacity: opacity,
        uAmount: { value: amount },
      },
    });
    return { geometry: g, material: m };
  }, [amount, from, opacity]);

  useFrame(({ clock, size }) => {
    const u = material.uniforms;
    u.uTime!.value = clock.elapsedTime;
    u.uAspect!.value = size.width / Math.max(1, size.height);
    u.uLook!.value.set(rig.lookX, rig.lookY);
  });

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} renderOrder={order} />;
}
