"use client";
/**
 * Le bureau vit : de temps en temps, la silhouette floue d'un collègue passe derrière la vitre dépolie
 * de la porte (même projection que la plate, donc elle suit la parallaxe), avec des pas spatialisés.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DESK_LAYOUT, getScene } from "@/content/scenes";
import { audio } from "../audio/AudioEngine";
import { rig } from "../camera/rig";
import { plateCommon, plateVertex } from "../plate/plateShader";
import { viewParams } from "../plate/view";
import { useStage } from "../state/stage";
import { useHub } from "./state";
import { useRender } from "../state/render";
import { roomState } from "../room/roomState";

const fragment = /* glsl */ `
precision highp float;
uniform vec4 uGlass;
uniform float uX;
uniform float uBob;
uniform float uGlassDepth;
uniform float uAlpha;
${plateCommon}

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 uv = proj(screenToBase(vUv), uGlassDepth);
  if (uv.x < uGlass.x || uv.x > uGlass.z || uv.y < uGlass.y || uv.y > uGlass.w) discard;
  float h = uGlass.w - uGlass.y;
  vec2 p = (uv - vec2(uX, uGlass.y + h * (0.62 + uBob))) * vec2(16.0 / 9.0, 1.0);
  float head = length(p - vec2(0.0, h * 0.22)) - h * 0.075;
  float body = sdRoundBox(p - vec2(0.0, -h * 0.12), vec2(h * 0.11, h * 0.26), h * 0.08);
  float d = min(head, body);
  // Vitre dépolie : silhouette très floue et sombre.
  float a = smoothstep(h * 0.06, -h * 0.04, d) * uAlpha * 0.55;
  gl_FragColor = vec4(vec3(0.07, 0.08, 0.1), a);
  #include <colorspace_fragment>
}
`;

export function Passerby() {
  const current = useStage((s) => s.current);
  const active = useHub((s) => s.active);
  const scene = current ? getScene(current.sceneId) : null;
  const room = useRender((s) => s.room);
  // Dans la pièce 3D, la silhouette passe réellement derrière la vitre (voir OfficeRoom) : on pilote roomState.
  const isDesk = !!scene && scene.id.startsWith("08-desk");
  const walk = useRef<{ start: number; dir: number; dur: number } | null>(null);
  const next = useRef(8);

  const material = useMemo(() => {
    const g = DESK_LAYOUT.doorGlass;
    return new THREE.ShaderMaterial({
      vertexShader: plateVertex,
      fragmentShader: fragment,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: {
        uGlass: { value: new THREE.Vector4(g.x0, 1 - g.y1, g.x1, 1 - g.y0) },
        uX: { value: -1 },
        uBob: { value: 0 },
        uGlassDepth: { value: DESK_LAYOUT.door.depth },
        uAlpha: { value: 0 },
        uScale: { value: new THREE.Vector2(1, 1) },
        uPan: { value: new THREE.Vector2() },
        uRoll: { value: 0 },
        uViewAspect: { value: 16 / 9 },
        uOffset: { value: new THREE.Vector2() },
        uPivot: { value: 0.5 },
        uDolly: { value: 0 },
        uDollyCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uFocus: { value: 0.5 },
        uAperture: { value: 0 },
        uOpacity: { value: 1 },
        uReveal: { value: 1 },
        uExposure: { value: 1 },
        uTime: { value: 0 },
        uLift: { value: 0 },
        uChar: { value: new THREE.Vector4() },
        uCharMotion: { value: new THREE.Vector3() },
        uRevealMode: { value: 0 },
      },
    });
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock, size }) => {
    if (!scene || !isDesk || !active) {
      material.uniforms.uAlpha!.value = 0;
      return;
    }
    const t = clock.elapsedTime;
    const u = material.uniforms;
    const { cover, proj } = viewParams(scene, rig, size.width, size.height);
    u.uScale!.value.set(cover.scale.x, cover.scale.y);
    u.uPan!.value.set(cover.pan.x, cover.pan.y);
    u.uRoll!.value = cover.roll;
    u.uViewAspect!.value = cover.viewAspect;
    u.uOffset!.value.set(proj.offset.x, proj.offset.y);
    u.uPivot!.value = proj.pivot;
    u.uDolly!.value = proj.dolly;
    u.uDollyCenter!.value.set(proj.dollyCenter.x, proj.dollyCenter.y);

    const g = DESK_LAYOUT.doorGlass;
    if (!walk.current && t > next.current && !rig.reducedMotion) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      walk.current = { start: t, dir, dur: 3 + Math.random() * 1.5 };
      void audio.sfx("sfx-footsteps", { at: { x: 0.915, y: 0.4 }, depth: 0.3, volume: 0.35 });
    }
    const w = walk.current;
    if (w) {
      const k = (t - w.start) / w.dur;
      roomState.passerby.visible = !!room && k < 1;
      roomState.passerby.x = w.dir * (Math.min(1, k) * 2 - 1) * 0.7;
      if (k >= 1) {
        walk.current = null;
        next.current = t + 18 + Math.random() * 25;
        u.uAlpha!.value = 0;
      } else if (room) {
        u.uAlpha!.value = 0;
      } else {
        const from = w.dir > 0 ? g.x0 - 0.05 : g.x1 + 0.05;
        const to = w.dir > 0 ? g.x1 + 0.05 : g.x0 - 0.05;
        u.uX!.value = from + (to - from) * k;
        u.uBob!.value = Math.abs(Math.sin(k * Math.PI * 7)) * 0.012;
        u.uAlpha!.value = 1;
      }
    }
  });

  if (!isDesk) return null;
  return (
    <mesh frustumCulled={false} renderOrder={500} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
