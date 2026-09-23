"use client";
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { Vector2 } from "three";
import { useMemo } from "react";

/**
 * Post-traitement « cinéma » : bloom doux, ACES Filmic, aberration chromatique radiale très légère,
 * vignettage et grain de film animé. La profondeur de champ et les rayons de lumière sont calculés
 * directement dans le shader de plate (à partir de la carte de profondeur), plus juste en 2,5D.
 */
export function Effects({ quality }: { quality: "high" | "medium" }) {
  const ca = useMemo(() => new Vector2(0.0007, 0.0005), []);
  if (quality === "medium") {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.4} luminanceThreshold={0.78} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.3} darkness={0.65} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.72} luminanceSmoothing={0.25} radius={0.75} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <ChromaticAberration offset={ca} radialModulation modulationOffset={0.35} />
      <Vignette offset={0.28} darkness={0.72} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.22} />
    </EffectComposer>
  );
}
