"use client";
/** Affiche la pièce 3D courante et projette ses points d'accroche vers l'interface HTML. */
import * as THREE from "three";
import { rig } from "../camera/rig";
import { useRender } from "../state/render";
import { roomAnchors } from "./anchors";
import { RoomView, roomAnchorPoints } from "./registry";

const v = new THREE.Vector3();

/**
 * Projette les points d'accroche de la pièce courante vers l'écran (px CSS). Appelé par la couche des
 * accessoires juste après avoir placé la caméra, pour que l'interface HTML colle au décor à la frame près.
 */
export function writeRoomAnchors(camera: THREE.Camera, width: number, height: number): void {
  const { room, station } = useRender.getState();
  const pts = room ? roomAnchorPoints(room, station, rig) : {};
  for (const k of Object.keys(roomAnchors)) if (!(k in pts)) delete roomAnchors[k];
  if (!room) return;
  camera.updateMatrixWorld();
  for (const [id, p] of Object.entries(pts)) {
    v.set(p[0], p[1], p[2]).project(camera);
    const a = (roomAnchors[id] ??= { x: 0, y: 0, visible: false });
    a.x = (v.x * 0.5 + 0.5) * width;
    a.y = (-v.y * 0.5 + 0.5) * height;
    a.visible = v.z < 1 && v.z > -1;
  }
}

export function RoomStage({ quality }: { quality: "high" | "medium" }) {
  const room = useRender((s) => s.room);
  const variant = useRender((s) => s.variant);
  return (
    <>
      {room && <RoomView key={room} kind={room} variant={variant} quality={quality} />}
    </>
  );
}
