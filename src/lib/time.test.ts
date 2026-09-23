import { describe, expect, it } from "vitest";
import { clock, clockHands, newYorkTime } from "./time";

describe("newYorkTime", () => {
  it("convertit l'heure de Paris en heure de New York (heure d'été : −6 h)", () => {
    // 23 septembre 2026, 14:30 à Paris (UTC+2) = 12:30 UTC = 8:30 à New York (UTC−4).
    const t = newYorkTime(new Date("2026-09-23T12:30:00Z"));
    expect(t.digital).toBe("08:30");
    expect(t.label).toBe("8 h 30");
  });
  it("gère l'hiver (−6 h aussi, mais UTC−5)", () => {
    expect(newYorkTime(new Date("2026-01-15T05:05:00Z")).digital).toBe("00:05");
  });
});

describe("clockHands", () => {
  it("place les aiguilles", () => {
    const h = clockHands(clock(3, 30));
    expect(h.hour).toBe(105);
    expect(h.minute).toBe(180);
  });
});
