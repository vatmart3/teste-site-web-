import { describe, expect, it } from "vitest";
import { readingTime } from "./director";

describe("readingTime", () => {
  it("laisse le temps de lire, sans excéder 9 s", () => {
    expect(readingTime("Oui.")).toBeGreaterThan(1.4);
    expect(readingTime("x".repeat(40))).toBeCloseTo(1.4 + 40 * 0.055);
    expect(readingTime("x".repeat(1000))).toBe(9);
  });
});
