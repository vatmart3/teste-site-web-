import { describe, expect, it } from "vitest";
import { MERIDIAN_BOARD } from "@/content/cases/meridianBoard";
import { courtEvidenceFrom, linkBetween, makeRope, ropeSag, scoreBoard, stepRope, TAUT_ITERATIONS, tighten } from "./logic";

describe("tableau d'enquête", () => {
  it("une connexion se trouve dans les deux sens, jamais d'une pièce vers elle-même", () => {
    expect(linkBetween(MERIDIAN_BOARD, "p-contract", "p-invoice")?.id).toBe("l-cutoff");
    expect(linkBetween(MERIDIAN_BOARD, "p-invoice", "p-contract")?.id).toBe("l-cutoff");
    expect(linkBetween(MERIDIAN_BOARD, "p-invoice", "p-invoice")).toBeNull();
    expect(linkBetween(MERIDIAN_BOARD, "p-bond", "p-auditor")).toBeNull();
  });

  it("les données sont cohérentes : pièces existantes, positions dans le panneau", () => {
    const ids = new Set(MERIDIAN_BOARD.pieces.map((p) => p.id));
    for (const l of MERIDIAN_BOARD.links) {
      expect(ids.has(l.a) && ids.has(l.b), l.id).toBe(true);
      if (l.courtEvidence) expect([l.a, l.b]).toContain(l.courtEvidence);
    }
    for (const p of MERIDIAN_BOARD.pieces) {
      expect(p.at.x).toBeGreaterThan(0.05);
      expect(p.at.x).toBeLessThan(0.95);
    }
    expect(MERIDIAN_BOARD.required).toBeLessThanOrEqual(MERIDIAN_BOARD.links.length);
  });

  it("note : tout trouver sans erreur = 100 ; les erreurs coûtent, sans descendre sous 0", () => {
    const all = MERIDIAN_BOARD.links.map((l) => l.id);
    expect(scoreBoard(MERIDIAN_BOARD, all, 0).score).toBe(100);
    expect(scoreBoard(MERIDIAN_BOARD, all, 2).score).toBe(80);
    expect(scoreBoard(MERIDIAN_BOARD, [], 20).score).toBe(0);
    expect(scoreBoard(MERIDIAN_BOARD, ["l-cutoff", "l-cutoff", "inconnu"], 0).found).toEqual(["l-cutoff"]);
  });

  it("seules les connexions trouvées donnent des pièces présentables au tribunal", () => {
    expect(courtEvidenceFrom(MERIDIAN_BOARD, ["l-related"])).toEqual(["p-orca"]);
  });

  it("le fil rouge pend sous la gravité, puis se tend quand on raccourcit sa longueur", () => {
    const a: [number, number, number] = [0, 0, 0];
    const b: [number, number, number] = [0.4, 0, 0];
    const rope = makeRope(16, a, b, 1.3);
    for (let i = 0; i < 240; i++) stepRope(rope, 1 / 60, a, b);
    const slack = ropeSag(rope);
    expect(slack).toBeGreaterThan(0.05);
    tighten(rope, a, b);
    for (let i = 0; i < 240; i++) stepRope(rope, 1 / 60, a, b, { iterations: TAUT_ITERATIONS });
    expect(ropeSag(rope)).toBeLessThan(slack / 3);
    // extrémités épinglées
    expect(rope.p[0]).toBe(0);
    expect(rope.p[15 * 3]).toBeCloseTo(0.4);
  });
});
