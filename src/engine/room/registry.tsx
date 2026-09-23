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
import { COURT, Courtroom, DEFENSE_SEAT, JUDGE_HEAD, LECTERN, ROURKE_HEAD, WITNESS } from "./Courtroom";
import { CourthouseSteps, STEPS, STEPS_TOP } from "./CourthouseSteps";
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
  /** Regard libre à la souris / au doigt : rotation maximale de la tête (radians). */
  look?: number;
}

/** Caméra qui regarde un point : lacet et tangage depuis `pos` (convention YXZ, −z vers l'avant). */
function aimAt(pos: [number, number, number], target: [number, number, number]): { yaw: number; pitch: number } {
  const fx = target[0] - pos[0];
  const fy = target[1] - pos[1];
  const fz = target[2] - pos[2];
  return { yaw: Math.atan2(-fx, -fz), pitch: Math.atan2(fy, Math.hypot(fx, fz)) };
}

function aimed(pos: [number, number, number], target: [number, number, number], rest: Omit<BaseCamera, "pos" | "yaw" | "pitch">, pitchBias = 0): BaseCamera {
  const a = aimAt(pos, target);
  return { pos, yaw: a.yaw, pitch: a.pitch + pitchBias, ...rest };
}

const CF = COURT.floorY;
const BRANDT_LECTERN_HEAD: [number, number, number] = [LECTERN.x + 0.05, CF + 1.59, LECTERN.z - 0.45];
const BRANDT_SEAT_HEAD: [number, number, number] = [DEFENSE_SEAT.x, CF + 1.13, DEFENSE_SEAT.z];
const JURY_CENTER: [number, number, number] = [5.5, CF + 1.1, -6.4];

function courtCamera(station: string): BaseCamera {
  switch (station) {
    case "entry":
      return { pos: [0, 0.45, 6.3], yaw: 0, pitch: -0.03, fov: 50, dollyMeters: 3, focus: 12, dof: 0.3, look: 0.35 };
    case "lectern":
      return aimed([-0.25, 0.45, -3.05], ROURKE_HEAD, { fov: 42, dollyMeters: 2.2, focus: 6.3, dof: 0.45, look: 0.22 });
    case "witness": {
      const d: [number, number, number] = [Math.sin(WITNESS.rot) * 1.45, 0.02, Math.cos(WITNESS.rot) * 1.45];
      return aimed([ROURKE_HEAD[0] + d[0], ROURKE_HEAD[1] + d[1], ROURKE_HEAD[2] + d[2]], ROURKE_HEAD, { fov: 30, dollyMeters: 0.55, focus: 1.45, dof: 1, look: 0.04 });
    }
    case "judge":
      return aimed([0.4, 0.95, -8.5], JUDGE_HEAD, { fov: 30, dollyMeters: 0.8, focus: 3.05, dof: 0.9, look: 0.04 });
    case "brandt": {
      const r = -2.55;
      const h = BRANDT_LECTERN_HEAD;
      return aimed([h[0] + Math.sin(r) * 1.5, h[1] + 0.01, h[2] + Math.cos(r) * 1.5], h, { fov: 30, dollyMeters: 0.4, focus: 1.5, dof: 1, look: 0.04 });
    }
    case "brandt-seat":
      return aimed([BRANDT_SEAT_HEAD[0], BRANDT_SEAT_HEAD[1] + 0.05, BRANDT_SEAT_HEAD[2] - 1.5], BRANDT_SEAT_HEAD, { fov: 32, dollyMeters: 0.4, focus: 1.5, dof: 1, look: 0.04 });
    case "jury":
      return aimed([2.3, 0.25, -4.2], JURY_CENTER, { fov: 46, dollyMeters: 1, focus: 3.9, dof: 0.5, look: 0.15 });
    default: // "counsel" : assis à la table des plaignants
      return aimed([-2.0, 0, -0.55], JUDGE_HEAD, { fov: 52, dollyMeters: 1.5, focus: 10, dof: 0.35, look: 0.3 }, -0.055);
  }
}

export function roomBaseCamera(kind: RoomKind, station: string, deskPitch: number): BaseCamera {
  switch (kind) {
    case "lobby":
      // « gates » : devant les portiques, le lecteur de badge en bas du cadre.
      return station === "gates" ? { pos: [1.7, 0, -3.2], yaw: -0.12, pitch: -0.18, fov: 50, dollyMeters: 2.2, focus: 2.7, dof: 0.6, look: 0.12 } : { pos: [0, 0, 1.2], yaw: 0, pitch: -0.03, fov: 50, dollyMeters: 3.8, focus: 7, dof: 0.3, look: 0.35 };
    case "elevator":
      // Tout net : la ville et le téléphone en main.
      return { pos: [0, 0, 0.35], yaw: 0, pitch: -0.06, fov: 56, dollyMeters: 0, focus: 60, dof: 0, look: 0.3 };
    case "corridor":
      return { pos: [0, 0, (CORRIDOR_STATIONS[station] ?? 0) + 0.8], yaw: 0, pitch: -0.05, fov: 54, dollyMeters: 3.2, focus: 6, dof: 0.35, look: 0.3 };
    case "courtroom":
      return courtCamera(station);
    case "courthouse-steps":
      return station === "top"
        ? { pos: [0, STEPS_TOP + 1.65, -3.2], yaw: 0, pitch: 0.03, fov: 50, dollyMeters: 2.5, focus: 6, dof: 0.35, look: 0.3 }
        : { pos: [0, STEPS.plazaY + 1.65, 11], yaw: 0, pitch: 0.2, fov: 55, dollyMeters: 6, focus: 12, dof: 0.3, look: 0.35 };
    case "corner-office":
      // « desk » : assis face au bureau en verre, le regard sur le plateau ; « hold » : même place, on relève la tête.
      if (station === "desk" || station === "hold") {
        return { pos: [CORNER_DESK.x, CORNER_DESK.topY + 0.42, CORNER_DESK.z + 1.05], yaw: 0, pitch: station === "desk" ? -0.36 : -0.08, fov: 50, dollyMeters: 0.6, focus: station === "desk" ? 1.05 : 3.1, dof: 0.8 };
      }
      return { pos: [0.7, 0, 0.7], yaw: 0.12, pitch: -0.04, fov: 48, dollyMeters: 1.6, focus: 5.3, dof: 0.6, look: 0.25 };
    default:
      // Bureaux : face au tableau de liège (tableau d'enquête), assis au bureau (hub, audit), sinon plan neutre.
      if (station === "board") return { pos: [-0.48, 0.2, -1.1], yaw: 0, pitch: -0.03, fov: 48, dollyMeters: 0.2, focus: 0.74, dof: 0.5, look: 0.03 };
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
    case "courtroom":
      return { witness: [WITNESS.x, CF + WITNESS.platform + 0.8, WITNESS.z], lectern: [LECTERN.x - 0.2, CF + 0.01, LECTERN.z + 0.6], judge: JUDGE_HEAD };
    case "courthouse-steps":
      return { stairs: [0, STEPS.plazaY + 0.17 * 5.5, 2 - 0.42 * 5.5], doors: [0, STEPS_TOP + 1.3, -9.4] };
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
    case "courtroom":
      return <Courtroom />;
    case "courthouse-steps":
      return <CourthouseSteps />;
    default:
      return <OfficeRoom kind={kind} variant={variant} />;
  }
}

export const tmpVec = new THREE.Vector3();
