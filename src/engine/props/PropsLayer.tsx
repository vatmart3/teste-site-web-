"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { rig } from "../camera/rig";
import { Badge } from "./Badge";
import { Folder } from "./Folder";
import { propCamera, useProps } from "./model";
import { useHub } from "../hub/state";
import { HubDesk } from "../hub/HubDesk";
import { CaseFolders } from "../hub/CaseFolders";
import { Nameplate } from "../hub/Promotion3D";
import { useProfile } from "../state/profile";
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
  const view = useRef<THREE.Group>(null);
  const hubActive = useHub((s) => s.active);
  const hubView = useHub((s) => s.view);
  const moving = useHub((s) => s.moving);
  const officeRank = useProfile((s) => s.officeRank);

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

  const lights = useRef<{ amb: THREE.AmbientLight | null; key: THREE.DirectionalLight | null; fill: THREE.DirectionalLight | null }>({ amb: null, key: null, fill: null });
  useFrame(({ camera, scene: sc }) => {
    // Les objets 3D suivent l'exposition du plan (fondus au noir, vue ouverte = décor assombri).
    const e = Math.max(0, rig.exposure);
    const L = lights.current;
    if (L.amb) L.amb.intensity = 0.18 * e;
    if (L.key) L.key.intensity = 0.85 * e;
    if (L.fill) L.fill.intensity = 0.35 * e;
    sc.environmentIntensity = 0.3 * e;
    // Toujours après les plates (qui ne testent pas la profondeur).
    root.current?.traverse((o) => (o.renderOrder = 1000));
    camera.position.set(rig.offset.x * 0.35, rig.offset.y * 0.35, 0);
    camera.rotation.set(-propCamera.pitch + rig.pan.y * 0.3, -rig.pan.x * 0.3, (-rig.roll * Math.PI) / 180);
    // Le repère « vue » suit l'inclinaison de base : les objets tenus devant soi restent face à la caméra.
    if (view.current) view.current.rotation.x = -propCamera.pitch;
  });

  return (
    <group ref={root}>
      <ambientLight ref={(n) => void (lights.current.amb = n)} intensity={0.18} />
      <directionalLight ref={(n) => void (lights.current.key = n)} position={[0.8, 1.2, 0.6]} intensity={0.85} color="#ffe0b0" />
      <directionalLight ref={(n) => void (lights.current.fill = n)} position={[-1, 0.3, -0.4]} intensity={0.35} color="#9bb8ff" />
      {hubActive && <HubDesk />}
      <group ref={view}>
        {phone && <Phone />}
        {badge && <Badge />}
        {folder && <Folder />}
        {hubActive && hubView === "cases" && <CaseFolders />}
        {moving && <Nameplate rank={officeRank} />}
      </group>
    </group>
  );
}
