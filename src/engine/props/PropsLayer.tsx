"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rig } from "../camera/rig";
import { Badge } from "./Badge";
import { Folder } from "./Folder";
import { PROP_FOV, propCamera, useProps } from "./model";
import { useRender } from "../state/render";
import { roomBaseCamera, roomCameraLift, type BaseCamera } from "../room/registry";
import { writeRoomAnchors } from "../room/RoomStage";
import type { RoomKind } from "@/content/types";
import { SceneEnvironment } from "../three/environment";
import { useAudit } from "../audit/state";
import { useBoard } from "../board/state";
import { Board3D } from "../board/Board3D";
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
const EULER = new THREE.Euler(0, 0, 0, "YXZ");
/** Amplitude du regard par défaut (bureau : petite parallaxe de tête). */
const LOOK_DEFAULT = 0.045;
const DIR = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const UP = new THREE.Vector3();

function copyBase(to: BaseCamera, from: BaseCamera): void {
  to.pos = [from.pos[0], from.pos[1], from.pos[2]];
  to.yaw = from.yaw;
  to.pitch = from.pitch;
  to.fov = from.fov;
  to.dollyMeters = from.dollyMeters;
  to.look = from.look;
}

function mixBase(to: BaseCamera, a: BaseCamera, b: BaseCamera, k: number): void {
  const m = (x: number, y: number) => x + (y - x) * k;
  to.pos = [m(a.pos[0], b.pos[0]), m(a.pos[1], b.pos[1]), m(a.pos[2], b.pos[2])];
  to.yaw = m(a.yaw, b.yaw);
  to.pitch = m(a.pitch, b.pitch);
  to.fov = m(a.fov, b.fov);
  to.dollyMeters = m(a.dollyMeters, b.dollyMeters);
  to.look = m(a.look ?? LOOK_DEFAULT, b.look ?? LOOK_DEFAULT);
}

/** Glissement de caméra entre deux stations d'une pièce 3D (état hors React). */
const glide = {
  room: null as RoomKind | null,
  station: "",
  t: 1,
  dur: 1,
  from: { pos: [0, 0, 0], yaw: 0, pitch: 0, fov: PROP_FOV, dollyMeters: 0 } as BaseCamera,
  cur: { pos: [0, 0, 0], yaw: 0, pitch: 0, fov: PROP_FOV, dollyMeters: 0 } as BaseCamera,
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
  const boardActive = useBoard((s) => s.active);

  useFrame(({ camera, size }, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const r = useRender.getState();
    const office = !!r.room && r.room.startsWith("office-");
    // Bureaux : caméra « assise » seulement au bureau ; les autres pièces ont toujours leur caméra.
    const inRoom = !!r.room && (!office || propCamera.pitch > 0);
    const v = view.current;
    if (!inRoom || !r.room) {
      glide.room = null;
      if (cam.fov !== PROP_FOV || cam.far !== 100) {
        cam.fov = PROP_FOV;
        cam.far = 100;
        cam.near = 0.01;
        cam.updateProjectionMatrix();
      }
      // Toujours après les plates (qui ne testent pas la profondeur).
      root.current?.traverse((o) => (o.renderOrder = 1000));
      cam.position.set(rig.offset.x * 0.35, rig.offset.y * 0.35, 0);
      cam.rotation.set(-propCamera.pitch + rig.pan.y * 0.3, -rig.pan.x * 0.3, (-rig.roll * Math.PI) / 180, "XYZ");
      if (v) {
        v.position.set(0, 0, 0);
        v.rotation.set(-propCamera.pitch, 0, 0, "XYZ");
      }
      propCamera.fov = PROP_FOV;
      writeRoomAnchors(cam, size.width, size.height);
      return;
    }

    // --- Pièce 3D : caméra de la station, glissement quand elle change, coupe franche quand la pièce change.
    if (r.frozen) {
      writeRoomAnchors(cam, size.width, size.height);
      return;
    }
    const base = roomBaseCamera(r.room, r.station, propCamera.pitch);
    if (glide.room !== r.room) {
      glide.room = r.room;
      glide.station = r.station;
      glide.t = 1;
    } else if (glide.station !== r.station) {
      glide.station = r.station;
      copyBase(glide.from, glide.cur);
      glide.dur = r.glide;
      glide.t = r.glide > 0 ? 0 : 1;
    }
    if (glide.t < 1) {
      glide.t = Math.min(1, glide.t + dt / glide.dur);
      mixBase(glide.cur, glide.from, base, easeInOut(glide.t));
    } else copyBase(glide.cur, base);
    const c = glide.cur;

    // Pièces ouvertes sur la ville : plan lointain à 6 km (ciel, tours à l'horizon).
    const far = office ? 100 : 6000;
    const near = office ? 0.01 : 0.04;
    if (cam.fov !== c.fov || cam.far !== far || cam.near !== near) {
      cam.fov = c.fov;
      cam.far = far;
      cam.near = near;
      cam.updateProjectionMatrix();
    }
    propCamera.fov = c.fov;
    const lx = rig.offset.x / rig.parallaxAmplitude;
    const ly = rig.offset.y / rig.parallaxAmplitude;
    // Travelling avant : le long du rayon qui passe par le centre de la poussée (dollyX, dollyY).
    EULER.set(c.pitch, c.yaw, 0, "YXZ");
    const th = Math.tan((c.fov * Math.PI) / 360);
    DIR.set((rig.dollyX - 0.5) * 2 * th * (size.width / size.height), (0.5 - rig.dollyY) * 2 * th, -1)
      .normalize()
      .applyEuler(EULER);
    const push = rig.dolly * c.dollyMeters;
    const lift = roomCameraLift(r.room, rig);
    const px = c.pos[0] + DIR.x * push;
    const py = c.pos[1] + DIR.y * push + lift;
    const pz = c.pos[2] + DIR.z * push;
    RIGHT.set(1, 0, 0).applyEuler(EULER);
    UP.set(0, 1, 0).applyEuler(EULER);
    cam.position.set(px + RIGHT.x * lx * 0.03 + UP.x * ly * 0.02, py + RIGHT.y * lx * 0.03 + UP.y * ly * 0.02, pz + RIGHT.z * lx * 0.03 + UP.z * ly * 0.02);
    // Regard libre : la souris (ou le doigt, le gyroscope) tourne la tête, plus ou moins selon la station.
    const lookAmp = c.look ?? LOOK_DEFAULT;
    cam.rotation.set(c.pitch + ly * Math.max(0.03, lookAmp * 0.45) + rig.panY * 0.5, c.yaw - lx * lookAmp - rig.panX * 0.5, (-rig.roll * Math.PI) / 180, "YXZ");
    writeRoomAnchors(cam, size.width, size.height);
    // Le repère « vue » suit la caméra de base : les objets tenus devant soi restent face à l'objectif.
    // (Bureau d'angle : repère horizontal, la chemise glisse à plat sur le bureau en verre.)
    if (v) {
      if (office) {
        v.position.set(0, 0, 0);
        v.rotation.set(c.pitch, 0, 0, "YXZ");
      } else {
        v.position.set(px, py, pz);
        v.rotation.set(r.room === "corner-office" ? 0 : c.pitch, c.yaw, 0, "YXZ");
      }
    }
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
      {boardActive && <Board3D />}
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
