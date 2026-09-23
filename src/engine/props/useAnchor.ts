"use client";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { propAnchors } from "./model";

const v = new THREE.Vector3();

/** Recopie à chaque frame la position écran (px CSS) d'un objet 3D, pour y accrocher un hotspot HTML. */
export function useAnchor(id: string, ref: React.RefObject<THREE.Object3D | null>) {
  const size = useThree((s) => s.size);
  useFrame(({ camera }) => {
    const o = ref.current;
    const a = propAnchors[id];
    if (!o || !a) return;
    o.getWorldPosition(v);
    v.project(camera);
    a.x = (v.x * 0.5 + 0.5) * size.width;
    a.y = (-v.y * 0.5 + 0.5) * size.height;
    a.visible = o.visible && v.z < 1;
  });
}
