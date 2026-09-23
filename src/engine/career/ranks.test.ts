import { describe, expect, it } from "vitest";
import { formatDollars, nextRankProgress, rankFor, RANKS } from "./ranks";

describe("rangs", () => {
  it("attribue le rang selon la réputation", () => {
    expect(rankFor(0).id).toBe("intern");
    expect(rankFor(99).id).toBe("intern");
    expect(rankFor(100).id).toBe("associate");
    expect(rankFor(5000).id).toBe("managing");
  });
  it("les seuils sont croissants", () => {
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i]!.minReputation).toBeGreaterThan(RANKS[i - 1]!.minReputation);
  });
  it("calcule la progression vers le rang suivant", () => {
    const p = nextRankProgress(150)!;
    expect(p.next.id).toBe("senior");
    expect(p.progress).toBeCloseTo(0.25);
    expect(p.missing).toBe(150);
    expect(nextRankProgress(2000)).toBeNull();
  });
  it("formate les honoraires", () => {
    expect(formatDollars(12450)).toBe("12 450 $");
  });
});
