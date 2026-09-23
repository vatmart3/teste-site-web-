"use client";
/**
 * Éclairage d'ambiance par image (IBL) : HDRI Poly Haven (CC0) du paquet @pmndrs/assets (512 px, EXR),
 * préfiltrés (PMREM) une fois puis mis en cache. Donne des reflets réels sur le laiton, le vernis, le verre.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

export type HdriName = "apartment" | "lobby" | "city" | "night" | "studio" | "dawn" | "hall" | "sunset";

const IMPORTS: Record<HdriName, () => Promise<{ default: string }>> = {
  apartment: () => import("@pmndrs/assets/hdri/apartment.exr"),
  lobby: () => import("@pmndrs/assets/hdri/lobby.exr"),
  city: () => import("@pmndrs/assets/hdri/city.exr"),
  night: () => import("@pmndrs/assets/hdri/night.exr"),
  studio: () => import("@pmndrs/assets/hdri/studio.exr"),
  dawn: () => import("@pmndrs/assets/hdri/dawn.exr"),
  hall: () => import("@pmndrs/assets/hdri/hall.exr"),
  sunset: () => import("@pmndrs/assets/hdri/sunset.exr"),
};

const cache = new Map<HdriName, Promise<THREE.Texture>>();

function load(gl: THREE.WebGLRenderer, name: HdriName): Promise<THREE.Texture> {
  let p = cache.get(name);
  if (!p) {
    p = IMPORTS[name]().then(
      (m) =>
        new Promise<THREE.Texture>((resolve, reject) => {
          new EXRLoader().load(
            m.default,
            (t) => {
              t.mapping = THREE.EquirectangularReflectionMapping;
              const pmrem = new THREE.PMREMGenerator(gl);
              const env = pmrem.fromEquirectangular(t).texture;
              pmrem.dispose();
              t.dispose();
              resolve(env);
            },
            undefined,
            reject,
          );
        }),
    );
    cache.set(name, p);
  }
  return p;
}

/** Applique un HDRI comme environnement de la scène (intensité et rotation réglables). */
export function SceneEnvironment({ name, intensity = 1, rotationY = 0 }: { name: HdriName; intensity?: number; rotationY?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    let alive = true;
    void load(gl, name)
      .then((env) => {
        if (!alive) return;
        scene.environment = env;
        scene.environmentIntensity = intensity;
        scene.environmentRotation.set(0, rotationY, 0);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [gl, scene, name, intensity, rotationY]);
  return null;
}
