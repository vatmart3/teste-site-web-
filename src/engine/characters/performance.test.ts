import { describe, expect, it } from "vitest";
import { characterMotion, syntheticSpeech } from "./performance";

describe("characterMotion", () => {
  it("reste un micro-mouvement (moins de 2 % de l'image)", () => {
    for (const s of ["idle", "talk", "pleased", "tense", "break"] as const) {
      for (let t = 0; t < 20; t += 0.37) {
        for (const v of characterMotion(s, t, 1)) expect(Math.abs(v)).toBeLessThan(0.02);
      }
    }
  });
  it("l'effondrement fait baisser la tête", () => {
    let sum = 0;
    for (let t = 0; t < 30; t += 0.1) sum += characterMotion("break", t, 0)[2];
    expect(sum / 300).toBeLessThan(-0.005);
  });
  it("l'enveloppe de parole est bornée", () => {
    for (let t = 0; t < 5; t += 0.01) {
      const v = syntheticSpeech(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
