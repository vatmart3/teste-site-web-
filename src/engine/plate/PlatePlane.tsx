"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getScene } from "@/content/scenes";
import { coverScale, fromAuthoring } from "./projection";
import { rig, type CameraRig } from "../camera/rig";
import type { PlateInstance } from "../state/stage";
import { layerFragment, plateFragment, plateVertex } from "./plateShader";
import { fxOverrides, registerPlate, unregisterPlate } from "./registry";
import { loadPlateTextures, type PlateTextures } from "./textures";
import { viewParams } from "./view";
import { Dust } from "../fx/Dust";
import { RainStreaks } from "../fx/RainStreaks";
import { cast, characterMotion, stateOf } from "../characters/performance";
import { useCharacterVideos } from "./characterVideos";
import { OfficeRoom } from "../room/OfficeRoom";
import { useRender } from "../state/render";

function maxLod(t: THREE.Texture): number {
  const img = t.image as { width?: number; height?: number } | undefined;
  const m = Math.max(img?.width ?? 1, img?.height ?? 1);
  return Math.max(0, Math.floor(Math.log2(m)) - 1);
}

function texel(t: THREE.Texture): THREE.Vector2 {
  const img = t.image as { width?: number; height?: number } | undefined;
  return new THREE.Vector2(1 / (img?.width ?? 1), 1 / (img?.height ?? 1));
}

/** Une plate 2,5D (image + profondeur + calques + vidéo éventuelle), plein écran. */
/**
 * Les plates sont dessinées dans la passe « opaque » (triée par renderOrder) avec un mélange alpha
 * manuel : les accessoires 3D, rendus ensuite, passent ainsi toujours devant le décor.
 */
const PLATE_BLENDING = {
  transparent: false,
  depthTest: false,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendSrc: THREE.SrcAlphaFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
} as const;

function readyVideo(t: THREE.VideoTexture | undefined): THREE.VideoTexture | null {
  return t && (t.image as HTMLVideoElement).readyState >= 2 ? t : null;
}

function snapshot(r: CameraRig): CameraRig {
  return { ...r, offset: { ...r.offset }, pan: { ...r.pan } };
}

export function PlatePlane({
  inst,
  order,
  isCurrent,
  quality,
}: {
  inst: PlateInstance;
  order: number;
  isCurrent: boolean;
  quality: "high" | "medium";
}) {
  const scene = getScene(inst.sceneId);
  const [tex, setTex] = useState<PlateTextures | null>(null);
  // Quand un plan cède la place, il garde la caméra figée au moment de la coupe (et continue
  // doucement sa poussée) : le plan suivant peut repartir d'une caméra neutre sans à-coup.
  const frozen = useRef<CameraRig | null>(null);
  if (isCurrent) frozen.current = null;
  else if (!frozen.current) frozen.current = snapshot(rig);

  useEffect(() => {
    let alive = true;
    loadPlateTextures(scene, inst.variant).then((t) => alive && setTex(t));
    return () => {
      alive = false;
    };
  }, [scene, inst.variant]);

  // Uniforms « vue » partagés entre la plate et ses calques (mêmes objets {value}).
  const shared = useMemo(
    () => ({
      uScale: { value: new THREE.Vector2(1, 1) },
      uPan: { value: new THREE.Vector2() },
      uRoll: { value: 0 },
      uViewAspect: { value: 16 / 9 },
      uOffset: { value: new THREE.Vector2() },
      uPivot: { value: scene.pivot },
      uDolly: { value: 0 },
      uDollyCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uFocus: { value: scene.focus },
      uAperture: { value: scene.aperture },
      uOpacity: { value: inst.transition === "fade" ? 0 : 1 },
      uReveal: { value: inst.transition === "depth" || inst.transition === "doors" ? 0 : 1 },
      uRevealMode: { value: inst.transition === "doors" ? 1 : 0 },
      uLift: { value: 0 },
      uChar: { value: new THREE.Vector4(0, 0, 0, 0) },
      uCharMotion: { value: new THREE.Vector3() },
      uExposure: { value: 1 },
      uTime: { value: 0 },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const material = useMemo(() => {
    if (!tex) return null;
    return new THREE.ShaderMaterial({
      vertexShader: plateVertex,
      fragmentShader: plateFragment,
      defines: quality === "high" ? { MARCH_STEPS: 24, DOF_TAPS: 12 } : { MARCH_STEPS: 14, DOF_TAPS: 8 },
      ...PLATE_BLENDING,
      uniforms: {
        ...shared,
        uColor: { value: tex.color },
        uColorB: { value: tex.color },
        uMix: { value: 0 },
        uWiper: { value: new THREE.Vector4(scene.wipers ? 1 : 0, 2.4, 1.9, 0.78) },
        uDepth: { value: tex.depth },
        uTexel: { value: texel(tex.color) },
        uMaxLod: { value: maxLod(tex.color) },
        uRain: { value: 0 },
        uFog: { value: 0 },
        uFlicker: { value: 0 },
        uShaftPos: { value: new THREE.Vector2(0.5, 1) },
        uShaft: { value: 0 },
      },
    });
  }, [tex, shared, quality, scene.wipers]);

  const layerMaterials = useMemo(() => {
    if (!tex) return [];
    return (scene.layers ?? [])
      .filter((l) => tex.layers[l.name])
      .map(
        (l) =>
          new THREE.ShaderMaterial({
            vertexShader: plateVertex,
            fragmentShader: layerFragment,
            ...PLATE_BLENDING,
            uniforms: {
              ...shared,
              uLayer: { value: tex.layers[l.name] },
              uDepthConst: { value: l.depth },
              uLocked: { value: l.locked ? 1 : 0 },
              uLockScale: { value: new THREE.Vector2(1, 1) },
              uMaxLod: { value: maxLod(tex.layers[l.name]!) },
            },
          }),
      );
  }, [tex, scene.layers, shared]);

  const charVideos = useCharacterVideos(scene.character?.id ?? null);
  // Pièce 3D : remplace la plate peinte tant qu'aucune vraie plate photo n'a été fournie.
  const room = tex?.placeholder && scene.room3d ? scene.room3d : null;
  useEffect(() => {
    if (!isCurrent || !tex) return;
    useRender.getState().set({ room });
    return () => {
      if (useRender.getState().room === room) useRender.getState().set({ room: null });
    };
  }, [isCurrent, tex, room]);
  const charFade = useRef<{ shown: THREE.Texture | null; target: THREE.Texture | null }>({ shown: null, target: null });

  useEffect(() => {
    if (!material) return;
    registerPlate(inst.key, { uniforms: { uOpacity: shared.uOpacity, uReveal: shared.uReveal } });
    return () => {
      unregisterPlate(inst.key);
      material.dispose();
      for (const m of layerMaterials) m.dispose();
    };
  }, [material, layerMaterials, inst.key, shared]);

  useFrame(({ size, clock }, dt) => {
    if (!material) return;
    const f = frozen.current;
    if (f) f.dolly += dt * 0.12;
    const r = f ?? rig;
    const { cover, proj } = viewParams(scene, r, size.width, size.height);
    const u = material.uniforms;
    shared.uScale.value.set(cover.scale.x, cover.scale.y);
    shared.uPan.value.set(cover.pan.x, cover.pan.y);
    shared.uRoll.value = cover.roll;
    shared.uViewAspect.value = cover.viewAspect;
    shared.uOffset.value.set(proj.offset.x, proj.offset.y);
    shared.uDolly.value = proj.dolly;
    shared.uDollyCenter.value.set(proj.dollyCenter.x, proj.dollyCenter.y);
    shared.uFocus.value = r.focus;
    shared.uAperture.value = r.aperture;
    // L'exposition est appliquée en post-traitement (ExposureEffect), commune à la 2,5D et à la 3D.
    shared.uExposure.value = 1;
    shared.uTime.value = clock.elapsedTime;
    shared.uTint.value.set(...fxOverrides.tint);
    shared.uLift.value = r.lift;
    for (let i = 0; i < layerMaterials.length; i++) {
      const lm = layerMaterials[i]!;
      if (lm.uniforms.uLocked!.value > 0.5) {
        const sc = coverScale(cover.viewAspect, 16 / 9);
        lm.uniforms.uLockScale!.value.set(sc.x, sc.y);
      }
    }

    // Personnage : zone animée + fondu enchaîné entre vidéos d'états.
    const ch = scene.character;
    if (ch) {
      const at = fromAuthoring(ch.at);
      shared.uChar.value.set(at.x, at.y, ch.depth, ch.radius);
      const state = stateOf(ch.id);
      const talk = cast.speaker === ch.id ? cast.level : 0;
      const m = rig.reducedMotion ? [0, 0, 0] : characterMotion(state, clock.elapsedTime, talk);
      shared.uCharMotion.value.set(m[0]!, m[1]!, m[2]!);
      const f = charFade.current;
      const idle = tex?.video ?? tex?.color ?? null;
      const want = readyVideo(charVideos[state]) ?? readyVideo(charVideos.idle) ?? idle;
      if (want && want !== (f.target ?? f.shown ?? u.uColor!.value)) {
        f.target = want;
        u.uColorB!.value = want;
        u.uMix!.value = 0;
      }
      if (f.target) {
        u.uMix!.value = Math.min(1, u.uMix!.value + dt / 0.35);
        if (u.uMix!.value >= 1) {
          u.uColor!.value = f.target;
          f.shown = f.target;
          f.target = null;
          u.uMix!.value = 0;
        }
      }
    }

    u.uRain!.value = rig.reducedMotion ? 0 : (fxOverrides.rain ?? scene.rain ?? 0);
    u.uFog!.value = fxOverrides.fog ?? scene.fog ?? 0;
    u.uFlicker!.value = rig.reducedMotion ? 0 : (fxOverrides.flicker ?? scene.flicker ?? 0);
    if (scene.shaft) {
      const sp = fromAuthoring(scene.shaft.at);
      u.uShaftPos!.value.set(sp.x, sp.y);
    }
    u.uShaft!.value = fxOverrides.shaft ?? scene.shaft?.strength ?? 0;

    // La boucle vidéo remplace l'image fixe dès qu'elle a des images à afficher.
    const v = tex?.video;
    if (!scene.character && v && (v.image as HTMLVideoElement).readyState >= 2 && u.uColor!.value !== v) {
      u.uColor!.value = v;
      u.uMaxLod!.value = 0;
    }
  });

  if (!material) return null;
  if (room) return isCurrent ? <OfficeRoom kind={room} variant={inst.variant ?? "night"} /> : null;
  const dust = fxOverrides.dust ?? scene.dust ?? 0;
  return (
    <group>
      <mesh frustumCulled={false} renderOrder={order * 10} material={material}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      {layerMaterials.map((m, i) => (
        <mesh key={i} frustumCulled={false} renderOrder={order * 10 + 2 + i} material={m}>
          <planeGeometry args={[2, 2]} />
        </mesh>
      ))}
      {scene.rainStreaks && !rig.reducedMotion && (
        <RainStreaks amount={scene.rainStreaks.amount} from={scene.rainStreaks.from} opacity={shared.uOpacity} order={order * 10 + 5} />
      )}
      {dust > 0 && <Dust amount={dust} scene={scene} opacity={shared.uOpacity} reveal={shared.uReveal} exposure={shared.uExposure} order={order * 10 + 1} />}
    </group>
  );
}
