import { describe, expect, it } from "vitest";
import { SCENES } from "@/content/scenes";
import type { SceneDef } from "@/content/types";
import { createRig } from "../camera/rig";
import { cabinHeight, ELEVATOR } from "./Elevator";
import { CORRIDOR_STATIONS } from "./Corridor";
import { roomAnchorPoints, roomBaseCamera } from "./registry";

const roomScenes = (Object.values(SCENES) as SceneDef[]).filter((s) => s.room3d);

describe("pièces 3D", () => {
  it("chaque plan en 3D a une caméra valide", () => {
    for (const s of roomScenes) {
      const cam = roomBaseCamera(s.room3d!, s.station ?? "", 0.5);
      expect(cam.fov, s.id).toBeGreaterThan(20);
      expect(cam.fov, s.id).toBeLessThan(80);
      expect(cam.pos.every(Number.isFinite), s.id).toBe(true);
    }
  });

  it("les points de passage des plans 3D sont accrochés au décor", () => {
    const rig = createRig();
    for (const s of roomScenes) {
      if (s.room3d!.startsWith("office-")) continue; // zones du bureau : objets 3D cliquables (RoomZone)
      const pts = roomAnchorPoints(s.room3d!, s.station ?? "", rig);
      for (const h of s.hotspots ?? []) expect(Object.keys(pts), `${s.id} → ${h.id}`).toContain(h.id);
    }
    // Le lecteur de badge est aussi visible depuis les portiques (retour au hall).
    expect(Object.keys(roomAnchorPoints("lobby", "gates", rig))).toContain("reader");
  });

  it("le couloir avance vers le fond d'une station à l'autre", () => {
    const z = ["a", "b", "c"].map((st) => roomBaseCamera("corridor", st, 0).pos[2]);
    expect(z[0]).toBeGreaterThan(z[1]!);
    expect(z[1]).toBeGreaterThan(z[2]!);
    expect(CORRIDOR_STATIONS.c).toBeLessThan(0);
  });

  it("l'ascenseur monte de toute la hauteur pendant le trajet", () => {
    expect(cabinHeight(0)).toBe(0);
    expect(cabinHeight(0.32)).toBeCloseTo(ELEVATOR.riseMeters);
  });
});
