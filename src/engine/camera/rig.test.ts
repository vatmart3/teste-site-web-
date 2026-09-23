import { describe, expect, it } from "vitest";
import { createRig, pointerToLook, stepRig } from "./rig";

describe("rig", () => {
  it("converge vers la cible du regard", () => {
    const r = createRig();
    r.targetX = 1;
    for (let i = 0; i < 240; i++) stepRig(r, 1 / 60);
    expect(r.lookX).toBeGreaterThan(0.99);
    expect(r.offset.x).toBeGreaterThan(0.02);
  });
  it("reste immobile en mode mouvements réduits", () => {
    const r = createRig();
    r.reducedMotion = true;
    r.targetX = 1;
    r.shake = 1;
    for (let i = 0; i < 120; i++) stepRig(r, 1 / 60);
    expect(r.offset.x).toBe(0);
    expect(r.offset.y).toBe(0);
  });
  it("la secousse s'amortit", () => {
    const r = createRig();
    r.shake = 1;
    for (let i = 0; i < 180; i++) stepRig(r, 1 / 60);
    expect(r.shake).toBe(0);
  });
  it("borne le pointeur à [-1, 1] et inverse l'axe Y", () => {
    expect(pointerToLook(0, 0, 100, 100)).toEqual({ x: -1, y: 1 });
    expect(pointerToLook(250, 50, 100, 100)).toEqual({ x: 1, y: 0 });
  });
});
