import { describe, expect, it } from "vitest";
import { readingTime } from "./director";

describe("readingTime", () => {
  it("laisse le temps de lire, sans excéder 9 s", () => {
    expect(readingTime("Oui.")).toBeGreaterThan(1.4);
    expect(readingTime("x".repeat(40))).toBeCloseTo(1.4 + 40 * 0.055);
    expect(readingTime("x".repeat(1000))).toBe(9);
  });
});

import { fillTemplate, speakerLabel } from "./director";

describe("répliques", () => {
  const p = { firstName: "Alex", lastName: "Martin" } as never;
  it("insère le nom du joueur", () => {
    expect(fillTemplate("Bonjour {firstName} {lastName}.", p)).toBe("Bonjour Alex Martin.");
    expect(fillTemplate("{fullName}", p)).toBe("Alex Martin");
  });
  it("affiche le nom du personnage", () => {
    expect(speakerLabel("harlow")).toBe("Robert Harlow");
    expect(speakerLabel("narrator")).toBeUndefined();
    expect(speakerLabel("sms")).toBe("SMS — R. Harlow");
  });
});
