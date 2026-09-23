"use client";
/** Le bureau en 3D (repère monde) : objets survolables, physique, cartons de déménagement. */
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect, useRef } from "react";
import type * as THREE from "three";
import { ROOM_HOTSPOTS } from "../room/OfficeRoom";
import { useRender } from "../state/render";
import { rig } from "../camera/rig";
import { Briefcase, CoffeeCup, DeskPhone, FolderStack } from "./DeskObjects";
import { ContactShadow, Hoverable, RoomZone } from "./Hoverable";
import { MovingBoxes } from "./Promotion3D";
import { DESK_SPOTS, DESK_Y } from "./space";
import { useHub } from "./state";
import { DeskColliders, Toys } from "./Toys";

export function HubDesk() {
  const moving = useHub((s) => s.moving);
  const room = useRender((s) => s.room);
  const root = useRef<THREE.Group>(null);
  const S = DESK_SPOTS;
  // Ombres réelles dans la pièce 3D (lampe de banquier, fenêtre).
  useEffect(() => {
    const id = window.setTimeout(() => {
      root.current?.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && !o.userData.shell && !o.userData.noShadow) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
    }, 400);
    return () => window.clearTimeout(id);
  });
  return (
    <group ref={root}>
      {room && (
        <>
          <RoomZone view="library" position={ROOM_HOTSPOTS.library.position} size={ROOM_HOTSPOTS.library.size} />
          <RoomZone view="board" position={ROOM_HOTSPOTS.board.position} size={ROOM_HOTSPOTS.board.size} />
          <RoomZone view="terminal" position={ROOM_HOTSPOTS.terminal.position} size={ROOM_HOTSPOTS.terminal.size} />
          <RoomZone view="door" position={ROOM_HOTSPOTS.door.position} size={ROOM_HOTSPOTS.door.size} />
        </>
      )}
      <Hoverable view="cases" position={S.cases} rotationY={0.12} footprint={[0.25, 0.33]}>
        <FolderStack />
      </Hoverable>
      <Hoverable view="briefcase" position={S.briefcase} rotationY={0.25} footprint={[0.46, 0.34]}>
        <Briefcase />
      </Hoverable>
      <Hoverable view="phone" position={S.phone} footprint={[0.22, 0.2]}>
        <DeskPhone />
      </Hoverable>
      <group position={[S.cup[0], DESK_Y, S.cup[2]]} userData={{ noShadow: false }}>
        <ContactShadow w={0.09} d={0.09} />
        <CoffeeCup />
      </group>
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} paused={moving || rig.reducedMotion}>
          <DeskColliders />
          <Toys />
        </Physics>
      </Suspense>
      <MovingBoxes />
    </group>
  );
}
