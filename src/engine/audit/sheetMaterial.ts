/**
 * Matériau des feuilles : texture imprimée × fibres du papier, encre de surligneur (multiplication jaune),
 * crayon rouge, et loupe (grossissement avec légère distorsion en bord de lentille).
 */
import * as THREE from "three";
import { tex } from "../three/pbr";

export interface SheetUniforms {
  uMarks: THREE.IUniform<THREE.Texture>;
  uPaper: THREE.IUniform<THREE.Texture>;
  /** Loupe : (u, v, rayon) en uv de texture (v vers le haut) ; rayon ≤ 0 = pas de loupe. */
  uLens: THREE.IUniform<THREE.Vector3>;
  uLensZoom: THREE.IUniform<number>;
  uAspect: THREE.IUniform<number>;
}

export function makeSheetMaterial(page: THREE.Texture, marks: THREE.Texture, aspect: number): { material: THREE.MeshStandardMaterial; uniforms: SheetUniforms } {
  const uniforms: SheetUniforms = {
    uMarks: { value: marks },
    uPaper: { value: tex("paper_albedo", { srgb: true }) },
    uLens: { value: new THREE.Vector3(0.5, 0.5, -1) },
    uLensZoom: { value: 2.2 },
    uAspect: { value: aspect },
  };
  const material = new THREE.MeshStandardMaterial({
    map: page,
    normalMap: tex("paper_normal"),
    normalScale: new THREE.Vector2(0.25, 0.25),
    roughness: 0.88,
    side: THREE.FrontSide,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D uMarks;
uniform sampler2D uPaper;
uniform vec3 uLens;
uniform float uLensZoom;
uniform float uAspect;`,
      )
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
  vec2 muv = vMapUv;
  float lensMask = 0.0;
  if (uLens.z > 0.0) {
    vec2 d = (muv - uLens.xy) * vec2(uAspect, 1.0);
    float r = length(d) / uLens.z;
    lensMask = 1.0 - smoothstep(0.97, 1.0, r);
    vec2 zoomed = uLens.xy + (muv - uLens.xy) / uLensZoom * (1.0 + 0.18 * r * r);
    muv = mix(muv, zoomed, lensMask);
  }
  vec4 sampledDiffuseColor = texture2D(map, muv);
  vec3 fiber = texture2D(uPaper, muv * 2.0).rgb;
  sampledDiffuseColor.rgb *= fiber * 1.04;
  vec4 mk = texture2D(uMarks, muv);
  float hl = mk.g * mk.a;
  float pencil = mk.r * (1.0 - mk.g) * mk.a;
  sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, sampledDiffuseColor.rgb * vec3(1.0, 0.93, 0.26), hl * 0.88);
  sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, vec3(0.72, 0.1, 0.08), pencil * 0.85);
  // Reflet du verre de la loupe : léger éclaircissement et vignette au bord.
  sampledDiffuseColor.rgb *= 1.0 + lensMask * 0.06;
  diffuseColor *= sampledDiffuseColor;
#endif`,
      );
  };
  return { material, uniforms };
}
