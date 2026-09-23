import { describe, expect, it } from "vitest";
import { depthToMeters, platePointTo3D, REVERBS } from "./AudioEngine";

describe("spatialisation", () => {
  it("les objets proches sont plus près de l'auditeur", () => {
    expect(depthToMeters(1)).toBeLessThan(depthToMeters(0.2));
  });
  it("un son à gauche de la plate est à gauche de l'auditeur", () => {
    const [x, , z] = platePointTo3D({ x: 0.1, y: 0.5 }, 0.6);
    expect(x).toBeLessThan(0);
    expect(z).toBeLessThan(0);
  });
  it("le hall en marbre résonne plus que le bureau", () => {
    expect(REVERBS.marble.seconds).toBeGreaterThan(REVERBS.office.seconds * 3);
    expect(REVERBS.court.seconds).toBeGreaterThan(REVERBS.office.seconds);
  });
});
