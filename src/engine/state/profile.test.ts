import { describe, expect, it } from "vitest";
import { clampRelation, displayName, normalizeName } from "./profile";

describe("normalizeName", () => {
  it("nettoie et met les majuscules", () => {
    expect(normalizeName("  jean-baptiste  ")).toBe("Jean-Baptiste");
    expect(normalizeName("d'artagnan")).toBe("D'Artagnan");
    expect(normalizeName("élodie <script>")).toBe("Élodie Script");
  });
  it("borne la longueur", () => {
    expect(normalizeName("a".repeat(60))).toHaveLength(24);
  });
});

describe("relations", () => {
  it("restent dans [−100, 100]", () => {
    expect(clampRelation(140)).toBe(100);
    expect(clampRelation(-101)).toBe(-100);
  });
  it("affiche le nom complet", () => {
    expect(displayName({ firstName: "Alex", lastName: "Martin" })).toBe("Alex Martin");
    expect(displayName({ firstName: "Alex", lastName: "" })).toBe("Alex");
  });
});
