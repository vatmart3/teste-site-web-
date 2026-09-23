"use client";
/**
 * Matériaux PBR à partir des textures procédurales de public/textures (tools/make-textures.py) :
 * bois (noyer, chêne, stratifié), plâtre, liège, cuir, papier, métal brossé, moquette, marbre.
 */
import { useMemo } from "react";
import * as THREE from "three";

const loader = typeof window !== "undefined" ? new THREE.TextureLoader() : null;
const cache = new Map<string, THREE.Texture>();

export function tex(name: string, opts: { srgb?: boolean; repeat?: [number, number] } = {}): THREE.Texture {
  const key = `${name}|${opts.repeat?.join("x") ?? "1x1"}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const t = loader!.load(`./textures/${name}.webp`);
  t.colorSpace = opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  cache.set(key, t);
  return t;
}

export type WoodKind = "walnut" | "oak" | "laminate";

export interface MatOptions {
  color?: THREE.ColorRepresentation;
  repeat?: [number, number];
  roughness?: number;
  metalness?: number;
  normalScale?: number;
}

/** Fabrique de matériaux PBR (mémoïsés). */
export const PBR = {
  wood(kind: WoodKind, o: MatOptions = {}) {
    const r = o.repeat ?? [1, 1];
    return new THREE.MeshPhysicalMaterial({
      map: tex(`${kind}_albedo`, { srgb: true, repeat: r }),
      normalMap: tex(`${kind}_normal`, { repeat: r }),
      normalScale: new THREE.Vector2(o.normalScale ?? 0.6, o.normalScale ?? 0.6),
      roughnessMap: tex(`${kind}_rough`, { repeat: r }),
      roughness: o.roughness ?? 1,
      color: o.color ?? "#ffffff",
      // Vernis : une couche brillante par-dessus le bois mat.
      clearcoat: kind === "laminate" ? 0.25 : 0.6,
      clearcoatRoughness: kind === "laminate" ? 0.4 : 0.18,
    });
  },
  plaster(o: MatOptions = {}) {
    const r = o.repeat ?? [2, 2];
    return new THREE.MeshStandardMaterial({
      map: tex("plaster_albedo", { srgb: true, repeat: r }),
      normalMap: tex("plaster_normal", { repeat: r }),
      normalScale: new THREE.Vector2(o.normalScale ?? 0.5, o.normalScale ?? 0.5),
      roughnessMap: tex("plaster_rough", { repeat: r }),
      color: o.color ?? "#d9d5cc",
    });
  },
  cork(o: MatOptions = {}) {
    const r = o.repeat ?? [1.5, 1];
    return new THREE.MeshStandardMaterial({
      map: tex("cork_albedo", { srgb: true, repeat: r }),
      normalMap: tex("cork_normal", { repeat: r }),
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 0.95,
    });
  },
  leather(o: MatOptions = {}) {
    const r = o.repeat ?? [2, 2];
    return new THREE.MeshPhysicalMaterial({
      map: tex("leather_tint", { srgb: true, repeat: r }),
      normalMap: tex("leather_normal", { repeat: r }),
      normalScale: new THREE.Vector2(o.normalScale ?? 0.8, o.normalScale ?? 0.8),
      roughnessMap: tex("leather_rough", { repeat: r }),
      color: o.color ?? "#4a2a18",
      sheen: 0.4,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color("#a07050"),
    });
  },
  paper(o: MatOptions = {}) {
    const r = o.repeat ?? [1, 1];
    return new THREE.MeshStandardMaterial({
      map: tex("paper_albedo", { srgb: true, repeat: r }),
      normalMap: tex("paper_normal", { repeat: r }),
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.92,
      color: o.color ?? "#ffffff",
    });
  },
  brass(o: MatOptions = {}) {
    const r = o.repeat ?? [1, 1];
    return new THREE.MeshStandardMaterial({
      color: o.color ?? "#c9a24a",
      metalness: 1,
      roughnessMap: tex("brushed_rough", { repeat: r }),
      roughness: o.roughness ?? 1,
      normalMap: tex("brushed_normal", { repeat: r }),
      normalScale: new THREE.Vector2(0.25, 0.25),
    });
  },
  steel(o: MatOptions = {}) {
    const r = o.repeat ?? [1, 1];
    return new THREE.MeshStandardMaterial({
      color: o.color ?? "#9aa0a8",
      metalness: 1,
      roughnessMap: tex("brushed_rough", { repeat: r }),
      roughness: o.roughness ?? 1.4,
    });
  },
  carpet(o: MatOptions = {}) {
    const r = o.repeat ?? [6, 6];
    return new THREE.MeshStandardMaterial({
      map: tex("carpet_albedo", { srgb: true, repeat: r }),
      normalMap: tex("carpet_normal", { repeat: r }),
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 1,
      color: o.color ?? "#2a3040",
    });
  },
  /**
   * Verre clair « bon marché » : transparent + reflets de l'environnement, sans passe de transmission
   * (qui re-rendrait toute la ville derrière chaque vitre).
   */
  glass(o: MatOptions & { opacity?: number } = {}) {
    return new THREE.MeshPhysicalMaterial({
      color: o.color ?? "#e6eef2",
      roughness: o.roughness ?? 0.03,
      metalness: 0,
      transparent: true,
      opacity: o.opacity ?? 0.14,
      depthWrite: false,
      specularIntensity: 1,
    });
  },
  marble(o: MatOptions = {}) {
    const r = o.repeat ?? [2, 2];
    return new THREE.MeshPhysicalMaterial({
      map: tex("marble_albedo", { srgb: true, repeat: r }),
      roughnessMap: tex("marble_rough", { repeat: r }),
      roughness: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    });
  },
};

/** Mémoïse un matériau pour la durée de vie du composant. */
export function useMat<T extends THREE.Material>(make: () => T, deps: unknown[] = []): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(make, deps);
}
