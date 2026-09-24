import { describe, expect, it } from "vitest";
import { budget, canPlace, defaultDecor, snap, wallSnap } from "./decor";

describe("décoration du bureau", () => {
  it("l'aménagement par défaut est valide", () => {
    const d = defaultDecor();
    for (const p of d) expect(canPlace(p, d).ok, p.id).toBe(true);
  });
  it("refuse les chevauchements, la porte et l'extérieur", () => {
    const d = defaultDecor();
    expect(canPlace({ id: "x", type: "sofa", x: 6.5, z: -10.25, rot: 0 }, d).ok).toBe(false);
    expect(canPlace({ id: "x", type: "plant", x: 4.2, z: -8.1, rot: 0 }, d).ok).toBe(false);
    expect(canPlace({ id: "x", type: "plant", x: 12, z: -10, rot: 0 }, d).ok).toBe(false);
    expect(canPlace({ id: "x", type: "plant", x: 8.75, z: -8.5, rot: 0 }, d).ok).toBe(true);
    expect(canPlace({ id: "x", type: "rug", x: 6.5, z: -9.8, rot: 0 }, d).ok).toBe(true);
  });
  it("colle les tableaux au mur et arrondit à la grille", () => {
    const a = wallSnap({ id: "a", type: "art", x: 9.2, z: -9.1, rot: 0 });
    expect(a.x).toBeGreaterThan(9.7);
    expect(a.rot).toBeCloseTo(-Math.PI / 2);
    expect(snap(1.13)).toBeCloseTo(1.25);
  });
  it("budget = prime + part des honoraires − dépenses", () => {
    expect(budget({ billed: 0, spent: 0 })).toBe(6000);
    expect(budget({ billed: 10000, spent: 3000 })).toBe(5000);
  });
});
