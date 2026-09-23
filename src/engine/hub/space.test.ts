import { describe, expect, it } from "vitest";
import { DESK_FAR, DESK_PITCH, DESK_Y, officeVariant } from "./space";
import { PROP_FOV } from "../props/model";

describe("repère du bureau", () => {
  it("le bord arrière du plateau tombe vers 40 % de la hauteur d'écran (comme sur la plate)", () => {
    const below = Math.atan2(-DESK_Y, -DESK_FAR); // angle sous l'horizontale
    const rel = below - DESK_PITCH; // sous l'axe optique
    const v = 0.5 - Math.tan(rel) / Math.tan(((PROP_FOV / 2) * Math.PI) / 180) / 2;
    const fromTop = 1 - v;
    expect(fromTop).toBeGreaterThan(0.55);
    expect(fromTop).toBeLessThan(0.65);
  });
  it("lumière selon l'heure de New York", () => {
    expect(officeVariant(9)).toBe("day");
    expect(officeVariant(18)).toBe("dusk");
    expect(officeVariant(23)).toBe("night");
    expect(officeVariant(3)).toBe("night");
  });
});
