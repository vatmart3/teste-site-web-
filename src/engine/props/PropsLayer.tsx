"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rig } from "../camera/rig";
import { Badge } from "./Badge";
import { Folder } from "./Folder";
import { PROP_FOV, propCamera, useProps } from "./model";
import { useRender } from "../state/render";
import { ROOM_CAMERA } from "../room/roomState";
import { SceneEnvironment } from "../three/environment";
import { useAudit } from "../audit/state";
import { AuditDesk, AuditReading } from "../audit/AuditDesk";
import { useHub } from "../hub/state";
import { HubDesk } from "../hub/HubDesk";
import { CaseFolders } from "../hub/CaseFolders";
import { Nameplate } from "../hub/Promotion3D";
import { useProfile } from "../state/profile";
import { Phone } from "./Phone";

/**
 * Couche des objets 3D manipulables. Sur une plate 2,5D : éclairage d'appoint chaud/froid et reflets d'un
 * HDRI nocturne, caméra qui suit légèrement la parallaxe. Dans une pièce 3D : la pièce fournit lumières et
 * HDRI, et la caméra devient une vraie tête (translation + rotation), avec un champ plus large.
 */
export function PropsLayer() {
  const { phone, badge, folder } = useProps();
  const root = useRef<THREE.Group>(null);
  const view = useRef<THREE.Group>(null);
  const hubActive = useHub((s) => s.active);
  const hubView = useHub((s) => s.view);
  const moving = useHub((s) => s.moving);
  const officeRank = useProfile((s) => s.officeRank);
  const room = useRender((s) => s.room);
  const auditActive = useAudit((s) => s.active);

  useFrame(({ camera }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const inRoom = !!room && propCamera.pitch > 0;
    const pitch = inRoom ? ROOM_CAMERA.pitch : propCamera.pitch;
    const fov = inRoom ? ROOM_CAMERA.fov : PROP_FOV;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    if (!inRoom) {
      // Toujours après les plates (qui ne testent pas la profondeur).
      root.current?.traverse((o) => (o.renderOrder = 1000));
      cam.position.set(rig.offset.x * 0.35, rig.offset.y * 0.35, 0);
      cam.rotation.set(-pitch + rig.pan.y * 0.3, -rig.pan.x * 0.3, (-rig.roll * Math.PI) / 180);
    } else {
      const lx = rig.offset.x / rig.parallaxAmplitude;
      const ly = rig.offset.y / rig.parallaxAmplitude;
      const [ex, ey, ez] = ROOM_CAMERA.eye;
      cam.position.set(ex + lx * 0.03, ey + ly * 0.02, ez - rig.dolly * 0.25);
      cam.rotation.set(-pitch + ly * 0.03 + rig.panY * 0.5, -lx * 0.045 - rig.panX * 0.5, (-rig.roll * Math.PI) / 180, "YXZ");
    }
    // Le repère « vue » suit l'inclinaison de base : les objets tenus devant soi restent face à la caméra.
    if (view.current) view.current.rotation.x = -pitch;
  });

  return (
    <group ref={root}>
      {!room && (
        <>
          <SceneEnvironment name="night" intensity={0.45} />
          <ambientLight intensity={0.18} />
          <directionalLight position={[0.8, 1.2, 0.6]} intensity={0.85} color="#ffe0b0" />
          <directionalLight position={[-1, 0.3, -0.4]} intensity={0.35} color="#9bb8ff" />
        </>
      )}
      {hubActive && <HubDesk />}
      {auditActive && <AuditDesk />}
      <group ref={view}>
        {phone && <Phone />}
        {badge && <Badge />}
        {folder && <Folder />}
        {hubActive && hubView === "cases" && <CaseFolders />}
        {moving && <Nameplate rank={officeRank} />}
        {auditActive && <AuditReading />}
      </group>
    </group>
  );
}
