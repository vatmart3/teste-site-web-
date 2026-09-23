/**
 * Moteur de notation de l'audit (pur, testé) :
 * - chaque anomalie trouvée rapporte son poids (80 %), 100 % si elle est recoupée par deux lignes ;
 * - une anomalie révélée par l'expert ne rapporte que 50 % ;
 * - chaque fausse accusation coûte 6 points, une copie sans aucune erreur gagne 5 points ;
 * - rendre tôt rapporte jusqu'à 10 points ;
 * - S exige toutes les anomalies et au plus une erreur.
 */
import type { AuditCaseDef, AuditMark, AuditResult, Grade } from "./types";

export const REPUTATION_BY_GRADE: Record<Grade, number> = { S: 140, A: 110, B: 75, C: 35 };

export function gradeFor(score: number, allFound: boolean, falsePositives: number): Grade {
  if (score >= 90 && allFound && falsePositives <= 1) return "S";
  if (score >= 75) return "A";
  if (score >= 55) return "B";
  return "C";
}

/** Garde la dernière qualification posée sur chaque ligne. */
export function latestMarks(marks: AuditMark[]): AuditMark[] {
  const byLine = new Map<string, AuditMark>();
  for (const m of marks) byLine.set(m.lineId, m);
  return [...byLine.values()].filter((m) => m.category !== "none");
}

export function scoreAudit(def: AuditCaseDef, marks: AuditMark[], endMinutes: number, assisted: string[] = []): AuditResult {
  const active = latestMarks(marks);
  const evidence = new Map<string, Set<string>>();
  let falsePositives = 0;
  for (const m of active) {
    const clue = def.clues[m.lineId];
    if (!clue || clue.anomaly !== m.category) {
      falsePositives++;
      continue;
    }
    const set = evidence.get(clue.anomaly) ?? new Set<string>();
    set.add(m.lineId);
    evidence.set(clue.anomaly, set);
  }
  const found = def.anomalies.filter((a) => evidence.has(a.id)).map((a) => a.id);
  const corroborated = found.filter((id) => (evidence.get(id)?.size ?? 0) >= 2);
  const missed = def.anomalies.filter((a) => !found.includes(a.id)).map((a) => a.id);

  const totalWeight = def.anomalies.reduce((s, a) => s + a.weight, 0);
  let earned = 0;
  for (const a of def.anomalies) {
    if (!found.includes(a.id)) continue;
    let k = corroborated.includes(a.id) ? 1 : 0.8;
    if (assisted.includes(a.id)) k *= 0.5;
    earned += a.weight * k;
  }
  const total = def.deadlineMinutes - def.startMinutes;
  const minutesUsed = Math.max(0, Math.min(total, endMinutes - def.startMinutes));
  const minutesLeft = total - minutesUsed;
  const timeBonus = found.length > 0 ? (minutesLeft / total) * 10 : 0;
  const precision = falsePositives === 0 && found.length > 0 ? 5 : 0;
  const raw = (earned / totalWeight) * 85 + timeBonus + precision - falsePositives * 6;
  const score = Math.round(Math.max(0, Math.min(100, raw)));
  const grade = gradeFor(score, missed.length === 0, falsePositives);
  // Heures facturées : le temps passé, arrondi au dixième (tranches de 6 minutes).
  const billedHours = Math.round((minutesUsed / 60) * 10) / 10;
  return {
    found,
    corroborated,
    missed,
    falsePositives,
    assisted: assisted.filter((a) => found.includes(a)),
    score,
    grade,
    minutesUsed,
    minutesLeft,
    billedHours,
    fees: Math.round(billedHours * def.hourlyRate),
    reputation: REPUTATION_BY_GRADE[grade],
  };
}

/**
 * Part de la largeur d'une ligne couverte par un trait de surligneur.
 * Coordonnées en uv de page (x → droite, y → bas). Le trait est une polyligne ; seules les portions
 * dont la hauteur tombe dans la ligne (± marge) comptent.
 */
export function lineCoverage(stroke: { x: number; y: number }[], box: { x0: number; y0: number; x1: number; y1: number }, pad = 0.006): number {
  const spans: [number, number][] = [];
  for (let i = 1; i < stroke.length; i++) {
    const a = stroke[i - 1]!;
    const b = stroke[i]!;
    const ym = (a.y + b.y) / 2;
    if (ym < box.y0 - pad || ym > box.y1 + pad) continue;
    const lo = Math.max(box.x0, Math.min(a.x, b.x));
    const hi = Math.min(box.x1, Math.max(a.x, b.x));
    if (hi > lo) spans.push([lo, hi]);
  }
  if (!spans.length) {
    // Un simple point posé sur la ligne compte pour un tout petit peu.
    return stroke.some((p) => p.y >= box.y0 - pad && p.y <= box.y1 + pad && p.x >= box.x0 && p.x <= box.x1) ? 0.02 : 0;
  }
  spans.sort((p, q) => p[0] - q[0]);
  let covered = 0;
  let [cs, ce] = spans[0]!;
  for (const [s, e] of spans.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else {
      covered += ce - cs;
      cs = s;
      ce = e;
    }
  }
  covered += ce - cs;
  return covered / Math.max(1e-6, box.x1 - box.x0);
}

/** La ligne la mieux couverte par un trait (au moins `threshold`), ou null. */
export function strokeTarget(stroke: { x: number; y: number }[], boxes: Record<string, { x0: number; y0: number; x1: number; y1: number }>, threshold = 0.45): string | null {
  let best: string | null = null;
  let bestCov = threshold;
  for (const [id, box] of Object.entries(boxes)) {
    const c = lineCoverage(stroke, box);
    if (c >= bestCov) {
      best = id;
      bestCov = c;
    }
  }
  return best;
}
