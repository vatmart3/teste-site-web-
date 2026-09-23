"use client";
/** Lettres extrudées (police Droid Serif, Apache 2.0) pour les enseignes en laiton. */
import { useEffect, useState } from "react";
import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

let fontPromise: Promise<Font> | null = null;
function loadFont(): Promise<Font> {
  fontPromise ??= new FontLoader().loadAsync("./fonts/droid_serif_bold.typeface.json");
  return fontPromise;
}

export function useTextGeometry(text: string, size: number, depth: number): THREE.BufferGeometry | null {
  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    let alive = true;
    void loadFont().then((font) => {
      if (!alive) return;
      const g = new TextGeometry(text, { font, size, depth, curveSegments: 6, bevelEnabled: true, bevelThickness: depth * 0.25, bevelSize: size * 0.012, bevelSegments: 3 });
      g.computeBoundingBox();
      const b = g.boundingBox!;
      g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, 0);
      setGeo(g);
    });
    return () => {
      alive = false;
    };
  }, [text, size, depth]);
  return geo;
}
