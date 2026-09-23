"use client";
/**
 * Exposition globale en post-traitement (fondus au noir, flash) : s'applique de la même façon aux plates
 * 2,5D, aux pièces 3D et aux accessoires, avant le tone mapping (comme une vraie exposition de caméra).
 */
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Effect } from "postprocessing";
import { Uniform } from "three";
import { rig } from "../camera/rig";

const fragment = /* glsl */ `
uniform float exposure;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = vec4(inputColor.rgb * exposure, inputColor.a);
}
`;

class ExposureEffectImpl extends Effect {
  constructor() {
    super("ExposureEffect", fragment, { uniforms: new Map([["exposure", new Uniform(1)]]) });
  }
}

export function Exposure() {
  const effect = useMemo(() => new ExposureEffectImpl(), []);
  useEffect(() => () => effect.dispose(), [effect]);
  useFrame(() => {
    effect.uniforms.get("exposure")!.value = Math.max(0, rig.exposure);
  });
  return <primitive object={effect} dispose={null} />;
}
