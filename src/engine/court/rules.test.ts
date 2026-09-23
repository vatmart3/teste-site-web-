import { describe, expect, it } from "vitest";
import { CROSS_EXAMINATION as DEF } from "@/content/cases/crossExamination";
import { applyEvent, inObjectionWindow, replay, scoreCourt, START_GAUGES, witnessBreaks, witnessTells } from "./rules";
import type { CourtEvent } from "./types";

const perfect: CourtEvent[] = [
  { type: "objection", line: "d-honest", ground: "leading", correct: true },
  { type: "objection", line: "d-auditor", ground: "hearsay", correct: true },
  { type: "objection", line: "d-drivers", ground: "speculation", correct: true },
  ...DEF.topics.flatMap((t): CourtEvent[] => [
    { type: "question", topic: t.id, style: "precise" },
    ...(t.contradictedBy ? [{ type: "contradiction", topic: t.id, piece: t.contradictedBy } as CourtEvent] : []),
  ]),
  { type: "admission" },
];

describe("contre-interrogatoire", () => {
  it("données : chaque pièce qui contredit existe, trois objections contestables", () => {
    const pieces = new Set(DEF.pieces.map((p) => p.id));
    for (const t of DEF.topics) if (t.contradictedBy) expect(pieces.has(t.contradictedBy), t.id).toBe(true);
    expect(DEF.direct.filter((l) => l.objection).length).toBe(3);
    for (const t of DEF.topics) expect(new Set(t.questions.map((q) => q.style)).size).toBe(3);
  });

  it("les jauges restent entre 0 et 100", () => {
    let g = START_GAUGES;
    for (let i = 0; i < 20; i++) g = applyEvent(g, { type: "wrong-piece", topic: "t-orca", piece: "p-bond" });
    expect(g.patience).toBe(0);
    expect(g.jury).toBe(0);
    for (let i = 0; i < 20; i++) g = applyEvent(g, { type: "contradiction", topic: "t-orca", piece: "p-orca" }, DEF);
    expect(g.pressure).toBe(100);
  });

  it("une question agressive coûte la patience de la juge", () => {
    const g = applyEvent(START_GAUGES, { type: "question", topic: "t-orca", style: "aggressive" });
    expect(g.patience).toBeLessThan(START_GAUGES.patience);
  });

  it("le témoin craque avec assez de pression et au moins deux contradictions", () => {
    const g = replay(perfect.filter((e) => e.type !== "admission"), DEF);
    expect(witnessBreaks(DEF, g, 4)).toBe(true);
    expect(witnessBreaks(DEF, { ...g, pressure: 100 }, 1)).toBe(false);
  });

  it("note : sans faute = S ; rater des contradictions et des objections fait baisser", () => {
    const best = scoreCourt(DEF, perfect);
    expect(best.grade).toBe("S");
    expect(best.contradictions.length).toBe(4);
    expect(best.fees).toBe(Math.round(best.billedHours * DEF.hourlyRate));
    const poor = scoreCourt(DEF, [
      { type: "bad-objection", line: "d-tenure" },
      { type: "missed-objection", line: "d-honest" },
      { type: "question", topic: "t-orca", style: "aggressive" },
      { type: "wrong-piece", topic: "t-bond", piece: "p-auditor" },
    ]);
    expect(poor.grade).toBe("C");
    expect(poor.missedContradictions.length).toBe(4);
    expect(poor.score).toBeLessThan(best.score);
  });

  it("fenêtre d'objection avec une petite tolérance", () => {
    expect(inObjectionWindow(0.5, { from: 0.2, to: 1 })).toBe(true);
    expect(inObjectionWindow(0.15, { from: 0.2, to: 1 })).toBe(true);
    expect(inObjectionWindow(0.05, { from: 0.2, to: 1 })).toBe(false);
    expect(inObjectionWindow(0.5, undefined)).toBe(false);
  });

  it("micro-signes : déglutir, regard qui fuit, cravate desserrée au-delà de 60", () => {
    expect(witnessTells(20).swallow).toBe(false);
    expect(witnessTells(62).loosenTie).toBe(true);
    expect(witnessTells(55).loosenTie).toBe(false);
    expect(witnessTells(100).sweat).toBe(1);
  });
});
