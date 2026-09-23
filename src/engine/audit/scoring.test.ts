import { describe, expect, it } from "vitest";
import { buildMidnightAudit, fr } from "@/content/cases/midnightAudit";
import { gradeFor, latestMarks, lineCoverage, scoreAudit, strokeTarget } from "./scoring";
import type { AuditMark } from "./types";

const def = buildMidnightAudit(0);
const at = def.startMinutes + 300; // 4 h du matin
const mark = (lineId: string, category: string, t = at): AuditMark => ({ lineId, category, at: t });

describe("contenu de l'affaire 1", () => {
  it("chaque anomalie a une preuve principale et au moins un recoupement", () => {
    for (const a of def.anomalies) {
      const clues = Object.entries(def.clues).filter(([, c]) => c.anomaly === a.id);
      expect(clues.some(([, c]) => c.strength === "primary")).toBe(true);
      expect(clues.length).toBeGreaterThanOrEqual(2);
    }
  });
  it("toutes les lignes d'indice existent dans les documents", () => {
    const ids = new Set<string>();
    for (const d of def.docs) for (const p of d.pages) for (const b of p) {
      if (b.kind === "para" && b.id) ids.add(b.id);
      if (b.kind === "table") for (const r of b.rows) if (r.id) ids.add(r.id);
    }
    for (const id of Object.keys(def.clues)) expect(ids.has(id), id).toBe(true);
  });
  it("les variantes changent les montants mais pas les indices", () => {
    const b = buildMidnightAudit(1);
    expect(Object.keys(b.clues)).toEqual(Object.keys(def.clues));
    expect(JSON.stringify(b.docs)).not.toEqual(JSON.stringify(def.docs));
  });
  it("formate les montants à la française", () => {
    expect(fr(1842.6)).toBe("1 842,6");
    expect(fr(-118.4)).toBe("(118,4)");
  });
});

describe("notation", () => {
  it("tout trouver, recouper, sans erreur et tôt → S", () => {
    const marks = [
      mark("n7-halvorsen", "cutoff"),
      mark("bl-start", "cutoff"),
      mark("n19-orca-fees", "related"),
      mark("n19-orca-debt", "related"),
      mark("n2-useful-life", "depreciation"),
      mark("pl-depreciation", "depreciation"),
      mark("n11-no-impairment", "inventory"),
      mark("bs-stocks", "inventory"),
    ];
    const r = scoreAudit(def, marks, def.startMinutes + 240);
    expect(r.found).toHaveLength(4);
    expect(r.corroborated).toHaveLength(4);
    expect(r.falsePositives).toBe(0);
    expect(r.grade).toBe("S");
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.billedHours).toBe(4);
    expect(r.fees).toBe(720);
  });
  it("rien trouvé → C, et le temps ne rapporte rien", () => {
    const r = scoreAudit(def, [], def.startMinutes + 60);
    expect(r.grade).toBe("C");
    expect(r.score).toBe(0);
    expect(r.missed).toHaveLength(4);
  });
  it("les fausses accusations coûtent des points", () => {
    const base = [mark("n7-halvorsen", "cutoff"), mark("n19-orca-fees", "related")];
    const clean = scoreAudit(def, base, def.deadlineMinutes);
    const dirty = scoreAudit(def, [...base, mark("bs-cash", "related"), mark("pl-staff", "inventory")], def.deadlineMinutes);
    expect(dirty.falsePositives).toBe(2);
    expect(dirty.score).toBeLessThan(clean.score - 10);
  });
  it("une bonne ligne mal qualifiée est une erreur", () => {
    const r = scoreAudit(def, [mark("n7-halvorsen", "related")], def.deadlineMinutes);
    expect(r.found).toHaveLength(0);
    expect(r.falsePositives).toBe(1);
  });
  it("« fausse alerte » retire une marque précédente", () => {
    const marks = [mark("bs-cash", "related"), mark("bs-cash", "none")];
    expect(latestMarks(marks)).toHaveLength(0);
    expect(scoreAudit(def, marks, def.deadlineMinutes).falsePositives).toBe(0);
  });
  it("l'expert judiciaire réduit le crédit de l'anomalie révélée", () => {
    const marks = [mark("n7-halvorsen", "cutoff")];
    const a = scoreAudit(def, marks, def.deadlineMinutes);
    const b = scoreAudit(def, marks, def.deadlineMinutes, ["cutoff"]);
    expect(b.score).toBeLessThan(a.score);
    expect(b.assisted).toEqual(["cutoff"]);
  });
  it("S exige toutes les anomalies", () => {
    expect(gradeFor(99, false, 0)).toBe("A");
    expect(gradeFor(92, true, 2)).toBe("A");
    expect(gradeFor(92, true, 1)).toBe("S");
  });
});

describe("surligneur", () => {
  const box = { x0: 0.1, y0: 0.4, x1: 0.9, y1: 0.42 };
  it("mesure la part de la ligne couverte", () => {
    expect(lineCoverage([{ x: 0.1, y: 0.41 }, { x: 0.5, y: 0.41 }], box)).toBeCloseTo(0.5);
    expect(lineCoverage([{ x: 0.1, y: 0.41 }, { x: 0.5, y: 0.41 }, { x: 0.3, y: 0.41 }, { x: 0.9, y: 0.41 }], box)).toBeCloseTo(1);
  });
  it("ignore un trait tracé sur une autre ligne", () => {
    expect(lineCoverage([{ x: 0.1, y: 0.6 }, { x: 0.9, y: 0.6 }], box)).toBe(0);
  });
  it("choisit la ligne la mieux couverte", () => {
    const boxes = { a: box, b: { x0: 0.1, y0: 0.45, x1: 0.9, y1: 0.47 } };
    expect(strokeTarget([{ x: 0.12, y: 0.46 }, { x: 0.8, y: 0.46 }], boxes)).toBe("b");
    expect(strokeTarget([{ x: 0.12, y: 0.46 }, { x: 0.2, y: 0.46 }], boxes)).toBeNull();
  });
});
