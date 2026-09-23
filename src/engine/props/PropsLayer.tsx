"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { rig } from "../camera/rig";
import { Badge } from "./Badge";
import { Folder } from "./Folder";
import { useProps } from "./model";
import { Phone } from "./Phone";

/**
 * Couche des objets 3D manipulables, rendue par-dessus les plates : éclairage chaud/froid cohérent avec
 * les décors, environnement de reflets procédural (pas de HDR à télécharger), et une caméra qui suit
 * légèrement la parallaxe pour que les objets « appartiennent » au plan.
 */
export function PropsLayer() {
  const { phone, badge, folder } = useProps();
  const { gl, scene } = useThree();
  const root = useRef<THREE.Group>(null);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.3;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  useFrame(({ camera }) => {
    // Toujours après les plates (qui ne testent pas la profondeur).
    root.current?.traverse((o) => (o.renderOrder = 1000));
    camera.position.set(rig.offset.x * 0.35, rig.offset.y * 0.35, 0);
    camera.rotation.set(rig.pan.y * 0.3, -rig.pan.x * 0.3, (-rig.roll * Math.PI) / 180);
  });

  return (
    <group ref={root}>
      <ambientLight intensity={0.18} />
      <directionalLight position={[0.8, 1.2, 0.6]} intensity={0.85} color="#ffe0b0" />
      <directionalLight position={[-1, 0.3, -0.4]} intensity={0.35} color="#9bb8ff" />
      {phone && <Phone />}
      {badge && <Badge />}
      {folder && <Folder />}
    </group>
  );
}
