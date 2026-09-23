"use client";
/**
 * Registre des pièces 3D : composant, caméra de base par « station », points d'accroche de l'interface.
 * Les pièces remplacent les plates peintes tant que les vraies plates générées ne sont pas fournies.
 */
import * as THREE from "three";
import type { RoomKind } from "@/content/types";
import type { CameraRig } from "../camera/rig";
import { CORNER, CORNER_DESK, CornerOffice } from "./CornerOffice";
import { CORRIDOR, CORRIDOR_STATIONS, Corridor } from "./Corridor";
import { ELEVATOR_PANEL, Elevator, cabinHeight } from "./Elevator";
import { LOBBY_DESK_SPOT, LOBBY_READER, Lobby } from "./Lobby";
import { OfficeRoom } from "./OfficeRoom";
import { ROOM_CAMERA } from "./roomState";

export interface BaseCamera {
  pos: [number, number, number];
  yaw: number;
  pitch: number;
  fov: number;
  /** Mètres parcourus pour rig.dolly = 1 (travelling avant). */
  dollyMeters: number;
  /** Distance (m) du sujet de la station : la mise au point s'y cale (sauf objet tenu tout près). */
  focus?: number;
  /** Intensité du flou de profondeur de champ (0 = tout net, 1 = défaut). */
  dof?: number;
}

export function roomBaseCamera(kind: RoomKind, station: string, deskPitch: number): BaseCamera {
  switch (kind) {
    case "lobby":
      // « gates » : devant les portiques, le lecteur de badge en bas du cadre.
      return station === "gates" ? { pos: [1.7, 0, -3.2], yaw: -0.12, pitch: -0.18, fov: 50, dollyMeters: 2.2, focus: 2.7, dof: 0.6 } : { pos: [0, 0, 1.2], yaw: 0, pitch: -0.03, fov: 50, dollyMeters: 3.8, focus: 7, dof: 0.3 };
    case "elevator":
      // Tout net : la ville et le téléphone en main.
      return { pos: [0, 0, 0.35], yaw: 0, pitch: -0.06, fov: 56, dollyMeters: 0, focus: 60, dof: 0 };
    case "corridor":
      return { pos: [0, 0, (CORRIDOR_STATIONS[station] ?? 0) + 0.8], yaw: 0, pitch: -0.05, fov: 54, dollyMeters: 3.2, focus: 6, dof: 0.35 };
    case "corner-office":
      // « desk » : assis face au bureau en verre, le regard sur le plateau ; « hold » : même place, on relève la tête.
      if (station === "desk" || station === "hold") {
        return { pos: [CORNER_DESK.x, CORNER_DESK.topY + 0.42, CORNER_DESK.z + 1.05], yaw: 0, pitch: station === "desk" ? -0.36 : -0.08, fov: 50, dollyMeters: 0.6, focus: station === "desk" ? 1.05 : 3.1, dof: 0.8 };
      }
      return { pos: [0.7, 0, 0.7], yaw: 0.12, pitch: -0.04, fov: 48, dollyMeters: 1.6, focus: 5.3, dof: 0.6 };
    default:
      // Bureaux : caméra assise quand on est au bureau (hub, audit), sinon plan neutre.
      return deskPitch > 0 ? { pos: ROOM_CAMERA.eye, yaw: 0, pitch: -ROOM_CAMERA.pitch, fov: ROOM_CAMERA.fov, dollyMeters: 0.25 } : { pos: [0, 0, 0], yaw: 0, pitch: 0, fov: 40, dollyMeters: 0.25 };
  }
}

/** Décalage vertical dynamique (montée de l'ascenseur). */
export function roomCameraLift(kind: RoomKind, r: CameraRig): number {
  return kind === "elevator" ? cabinHeight(r.lift) : 0;
}

/** Points 3D (monde) auxquels s'accroche l'interface HTML, selon la pièce et la station. */
export function roomAnchorPoints(kind: RoomKind, station: string, r: CameraRig): Record<string, [number, number, number]> {
  switch (kind) {
    case "lobby":
      return { desk: LOBBY_DESK_SPOT, reader: LOBBY_READER };
    case "elevator":
      return { floor: [ELEVATOR_PANEL[0], ELEVATOR_PANEL[1] + cabinHeight(r.lift), ELEVATOR_PANEL[2]] };
    case "corridor": {
      const z = CORRIDOR_STATIONS[station] ?? 0;
      return { forward: [0, CORRIDOR.floorY + 0.01, z - 3.4], back: [0, CORRIDOR.floorY + 0.01, z + 0.1] };
    }
    case "corner-office":
      return { desk: [CORNER_DESK.x, CORNER_DESK.topY, CORNER_DESK.z], window: [0.35, 0, CORNER.backZ + 0.2] };
    default:
      return {};
  }
}

export function RoomView({ kind, variant, quality }: { kind: RoomKind; variant: "day" | "dusk" | "night"; quality: "high" | "medium" }) {
  switch (kind) {
    case "lobby":
      return <Lobby quality={quality} />;
    case "elevator":
      return <Elevator />;
    case "corridor":
      return <Corridor />;
    case "corner-office":
      return <CornerOffice />;
    default:
      return <OfficeRoom kind={kind} variant={variant} />;
  }
}

export const tmpVec = new THREE.Vector3();
