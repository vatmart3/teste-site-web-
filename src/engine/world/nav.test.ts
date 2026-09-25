import { describe, expect, it } from "vitest";
import { DEFAULT_DECOR, SPOTS, WAYPOINTS, staticBoxes } from "./layout";
import { Collider, buildGraph, connected, findPath, nearestOnBox } from "./nav";

const col = Collider.fromWorld(staticBoxes(DEFAULT_DECOR));
const g = buildGraph(col);

describe("navigation de l'étage", () => {
  it("relie tous les points de passage", () => {
    expect(connected(g)).toEqual([]);
  });

  it("aucun point de passage n'est dans un obstacle", () => {
    for (const [id, p] of Object.entries(WAYPOINTS)) {
      const [x, z] = col.resolve(p[0], p[1], 0.25);
      expect(Math.hypot(x - p[0], z - p[1]), id).toBeLessThan(0.02);
    }
  });

  it("trouve un chemin de chaque poste vers la machine à café", () => {
    const coffee = SPOTS.find((s) => s.id === "coffee")!;
    for (const s of SPOTS) {
      const path = findPath(g, col, [s.x, s.z], [coffee.x, coffee.z]);
      expect(path.length, s.id).toBeGreaterThan(0);
      // Chaque tronçon est dégagé (sauf le départ, assis dans son fauteuil).
      let cur: [number, number] = path[0]!;
      for (const p of path.slice(1)) {
        expect(col.clear(cur[0], cur[1], p[0], p[1], 0.15), `${s.id} → ${p}`).toBe(true);
        cur = p;
      }
    }
  });

  it("repousse hors des murs", () => {
    const [x, z] = col.resolve(0, -7.45, 0.3);
    expect(Math.abs(z + 7.5)).toBeGreaterThanOrEqual(0.29);
    expect(x).toBeCloseTo(0);
  });

  it("mesure la distance au bord d'un meuble, de tous les côtés", () => {
    const desk = { x: 6.5, z: -10.25, w: 1.9, d: 0.9, rot: 0 };
    expect(nearestOnBox(desk, 6.5, -9.2)).toEqual([6.5, -9.8]);
    expect(nearestOnBox(desk, 6.5, -11.2)[1]).toBeCloseTo(-10.7);
    expect(nearestOnBox(desk, 8.2, -10.2)[0]).toBeCloseTo(7.45);
    const turned = { ...desk, rot: Math.PI / 2 };
    const [x, z] = nearestOnBox(turned, 8, -10.25);
    expect(x).toBeCloseTo(6.95);
    expect(z).toBeCloseTo(-10.25);
  });
});
