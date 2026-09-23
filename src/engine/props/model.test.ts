import { describe, expect, it } from "vitest";
import { cameraToScreen, screenToCamera } from "./model";

describe("repère des accessoires", () => {
  it("screenToCamera et cameraToScreen sont inverses", () => {
    const p = screenToCamera(0.3, 0.8, -0.75, 40, 16 / 9);
    const s = cameraToScreen(p.x, p.y, -0.75, 40, 16 / 9);
    expect(s.u).toBeCloseTo(0.3);
    expect(s.v).toBeCloseTo(0.8);
  });
  it("le centre de l'écran est sur l'axe optique", () => {
    expect(screenToCamera(0.5, 0.5, -2, 40, 1)).toEqual({ x: 0, y: 0 });
  });
});
