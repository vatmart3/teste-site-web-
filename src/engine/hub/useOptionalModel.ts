"use client";
/**
 * Modèle glTF optionnel : si `public/models/<nom>.glb` existe (manifeste), il remplace l'objet procédural.
 * Les modèles doivent être à l'échelle réelle (mètres), origine au centre de la base.
 */
import { useEffect, useState } from "react";
import type * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadManifest } from "../assets/manifest";

const cache = new Map<string, Promise<THREE.Object3D | null>>();

function load(name: string): Promise<THREE.Object3D | null> {
  let p = cache.get(name);
  if (!p) {
    p = loadManifest().then(async (m) => {
      const file = [`models/${name}.glb`, `models/${name}.gltf`].find((f) => m.files.has(f));
      if (!file) return null;
      try {
        const gltf = await new GLTFLoader().loadAsync("/" + file);
        gltf.scene.traverse((o) => {
          o.castShadow = true;
        });
        return gltf.scene;
      } catch {
        return null;
      }
    });
    cache.set(name, p);
  }
  return p;
}

export function useOptionalModel(name: string): THREE.Object3D | null {
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    let alive = true;
    void load(name).then((m) => alive && setModel(m ? m.clone(true) : null));
    return () => {
      alive = false;
    };
  }, [name]);
  return model;
}
