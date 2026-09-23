/**
 * Registre des plates montées : le directeur y récupère les uniforms d'une plate
 * (opacité, révélation) pour animer les transitions, et attend qu'elle soit prête.
 */
import type * as THREE from "three";

export interface PlateHandle {
  uniforms: {
    uOpacity: THREE.IUniform<number>;
    uReveal: THREE.IUniform<number>;
  };
}

const handles = new Map<number, PlateHandle>();
const waiters = new Map<number, ((h: PlateHandle) => void)[]>();

export function registerPlate(key: number, h: PlateHandle): void {
  handles.set(key, h);
  for (const w of waiters.get(key) ?? []) w(h);
  waiters.delete(key);
}

export function unregisterPlate(key: number): void {
  handles.delete(key);
}

/** Poignée d'une plate déjà montée (null si elle n'existe plus). */
export function plateHandle(key: number): PlateHandle | null {
  return handles.get(key) ?? null;
}

export function whenPlateReady(key: number): Promise<PlateHandle> {
  const h = handles.get(key);
  if (h) return Promise.resolve(h);
  return new Promise((resolve) => {
    const list = waiters.get(key) ?? [];
    list.push(resolve);
    waiters.set(key, list);
  });
}

/**
 * Surcharges d'effets (labo / scénario) : null = valeur du plan.
 * Objet mutable lu à chaque frame, comme la caméra.
 */
export const fxOverrides: {
  rain: number | null;
  fog: number | null;
  flicker: number | null;
  shaft: number | null;
  dust: number | null;
  tint: [number, number, number];
} = { rain: null, fog: null, flicker: null, shaft: null, dust: null, tint: [1, 1, 1] };
