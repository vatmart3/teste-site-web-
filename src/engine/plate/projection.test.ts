import { describe, expect, it } from "vitest";
import {
  baseToScreen,
  coverScale,
  imageToScreen,
  project,
  screenToBase,
  unproject,
  type CoverParams,
  type ProjectionParams,
} from "./projection";

const params: ProjectionParams = {
  offset: { x: 0.03, y: -0.01 },
  pivot: 0.4,
  dolly: 0.3,
  dollyCenter: { x: 0.55, y: 0.45 },
};
const cover: CoverParams = { scale: { x: 0.9, y: 0.7 }, pan: { x: 0.02, y: -0.05 }, roll: 0.05, viewAspect: 1.9 };

describe("coverScale", () => {
  it("remplit la largeur quand la vue est plus large que l'image", () => {
    const s = coverScale(2.35, 16 / 9, 1);
    expect(s.x).toBe(1);
    expect(s.y).toBeCloseTo(16 / 9 / 2.35);
  });
  it("remplit la hauteur quand la vue est plus haute (téléphone en portrait)", () => {
    const s = coverScale(9 / 19.5, 16 / 9, 1);
    expect(s.y).toBe(1);
    expect(s.x).toBeLessThan(0.3);
  });
  it("applique l'overscan", () => {
    expect(coverScale(16 / 9, 16 / 9, 1.1).x).toBeCloseTo(1 / 1.1);
  });
});

describe("projection", () => {
  it("le plan de pivot ne bouge pas sans poussée", () => {
    const p = { ...params, dolly: 0 };
    const uv = project({ x: 0.3, y: 0.6 }, p.pivot, p);
    expect(uv.x).toBeCloseTo(0.3);
    expect(uv.y).toBeCloseTo(0.6);
  });
  it("les plans proches bougent davantage que les plans lointains", () => {
    const p = { ...params, dolly: 0 };
    const near = project({ x: 0.5, y: 0.5 }, 1, p);
    const far = project({ x: 0.5, y: 0.5 }, 0, p);
    expect(Math.abs(near.x - 0.5)).toBeGreaterThan(Math.abs(far.x - 0.5));
  });
  it("unproject est l'inverse exact de project", () => {
    for (const d of [0, 0.25, 0.7, 1]) {
      const base = { x: 0.21, y: 0.83 };
      const back = unproject(project(base, d, params), d, params);
      expect(back.x).toBeCloseTo(base.x, 10);
      expect(back.y).toBeCloseTo(base.y, 10);
    }
  });
  it("screenToBase et baseToScreen sont inverses (avec roulis)", () => {
    const s = { x: 0.12, y: 0.77 };
    const back = baseToScreen(screenToBase(s, cover), cover);
    expect(back.x).toBeCloseTo(s.x, 10);
    expect(back.y).toBeCloseTo(s.y, 10);
  });
  it("imageToScreen retombe sur le pixel qui échantillonne ce point", () => {
    const img = { x: 0.6, y: 0.3 };
    const screen = imageToScreen(img, 0.8, params, cover);
    const sampled = project(screenToBase(screen, cover), 0.8, params);
    expect(sampled.x).toBeCloseTo(img.x, 10);
    expect(sampled.y).toBeCloseTo(img.y, 10);
  });
});
