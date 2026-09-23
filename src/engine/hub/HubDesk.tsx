"use client";
/** Le bureau en 3D (repère monde) : objets survolables, physique, cartons de déménagement. */
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { rig } from "../camera/rig";
import { Briefcase, CoffeeCup, DeskPhone, FolderStack } from "./DeskObjects";
import { ContactShadow, Hoverable } from "./Hoverable";
import { MovingBoxes } from "./Promotion3D";
import { DESK_SPOTS, DESK_Y } from "./space";
import { useHub } from "./state";
import { DeskColliders, Toys } from "./Toys";

export function HubDesk() {
  const moving = useHub((s) => s.moving);
  const S = DESK_SPOTS;
  return (
    <group>
      <Hoverable view="cases" position={S.cases} rotationY={0.12} footprint={[0.25, 0.33]}>
        <FolderStack />
      </Hoverable>
      <Hoverable view="briefcase" position={S.briefcase} rotationY={0.25} footprint={[0.46, 0.34]}>
        <Briefcase />
      </Hoverable>
      <Hoverable view="phone" position={S.phone} footprint={[0.22, 0.2]}>
        <DeskPhone />
      </Hoverable>
      <group position={[S.cup[0], DESK_Y, S.cup[2]]}>
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
