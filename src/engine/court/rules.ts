/**
 * Règles du contre-interrogatoire (pures, testées) : effets de chaque action sur les jauges, et note finale.
 *
 * Jauges : pression sur le témoin, patience de la juge, conviction du jury.
 * - Question précise : +pression ; ouverte : peu d'effet ; agressive : Brandt objecte, la juge perd patience.
 * - Bonne pièce opposée à une affirmation : grosse pression + jury ; mauvaise pièce : patience et jury baissent.
 * - Objection au bon moment et bon motif : jury + ; mauvais motif ou hors de propos : patience −.
 * - Laisser passer une question contestable : le jury se laisse influencer.
 */
import type { CourtCaseDef, CourtEvent, CourtGauges, CourtResult, QuestionStyle } from "./types";

export const START_GAUGES: CourtGauges = { pressure: 10, patience: 100, jury: 40 };

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function applyEvent(g: CourtGauges, e: CourtEvent, def?: CourtCaseDef): CourtGauges {
  const d = { pressure: 0, patience: 0, jury: 0 };
  switch (e.type) {
    case "question": {
      const fx: Record<QuestionStyle, [number, number, number]> = { precise: [10, 0, 3], open: [3, 0, 0], aggressive: [6, -18, -4] };
      [d.pressure, d.patience, d.jury] = fx[e.style];
      break;
    }
    case "contradiction": {
      const t = def?.topics.find((x) => x.id === e.topic);
      d.pressure = t?.pressure ?? 25;
      d.jury = 14;
      break;
    }
    case "wrong-piece":
      d.patience = -15;
      d.jury = -6;
      d.pressure = -5;
      break;
    case "objection":
      if (e.correct) {
        d.jury = 6;
        d.patience = 4;
      } else {
        d.patience = -12;
        d.jury = -3;
      }
      break;
    case "bad-objection":
      d.patience = -12;
      d.jury = -3;
      break;
    case "missed-objection":
      d.jury = -5;
      break;
    case "sustained-against":
      d.jury = -4;
      break;
    case "admission":
      d.jury = 25;
      break;
  }
  return { pressure: clamp(g.pressure + d.pressure), patience: clamp(g.patience + d.patience), jury: clamp(g.jury + d.jury) };
}

export function replay(events: CourtEvent[], def?: CourtCaseDef, start: CourtGauges = START_GAUGES): CourtGauges {
  return events.reduce((g, e) => applyEvent(g, e, def), start);
}

/** Le témoin craque : assez de pression et au moins deux contradictions établies. */
export function witnessBreaks(def: CourtCaseDef, g: CourtGauges, contradictions: number): boolean {
  return g.pressure >= def.breakAt && contradictions >= 2;
}

/** Micro-signes lisibles selon la pression (indices de jeu). */
export function witnessTells(pressure: number): { swallow: boolean; gazeAway: boolean; loosenTie: boolean; sweat: number } {
  return {
    swallow: pressure >= 35,
    gazeAway: pressure >= 50,
    loosenTie: pressure >= 60,
    sweat: Math.max(0, Math.min(1, (pressure - 40) / 50)),
  };
}

export const COURT_REPUTATION: Record<CourtResult["grade"], number> = { S: 170, A: 130, B: 90, C: 40 };

export function scoreCourt(def: CourtCaseDef, events: CourtEvent[]): CourtResult {
  const g = replay(events, def);
  const contradictions = [...new Set(events.filter((e) => e.type === "contradiction").map((e) => (e as { topic: string }).topic))];
  const winnable = def.topics.filter((t) => t.contradictedBy).map((t) => t.id);
  const missedContradictions = winnable.filter((id) => !contradictions.includes(id));
  const objectionsWon = events.filter((e) => e.type === "objection" && e.correct).length;
  const objectionsLost = events.filter((e) => (e.type === "objection" && !e.correct) || e.type === "bad-objection").length;
  const missedObjections = events.filter((e) => e.type === "missed-objection").length;
  const wrongPieces = events.filter((e) => e.type === "wrong-piece").length;
  const admitted = events.some((e) => e.type === "admission");
  const objectionable = def.direct.filter((l) => l.objection).length;

  const share = winnable.length ? contradictions.length / winnable.length : 0;
  const raw =
    share * 60 +
    (objectionable ? (objectionsWon / objectionable) * 15 : 0) +
    (admitted ? 15 : 0) +
    (g.jury / 100) * 10 -
    objectionsLost * 4 -
    wrongPieces * 5 -
    missedObjections * 2;
  const score = Math.round(Math.max(0, Math.min(100, raw)));
  const grade: CourtResult["grade"] = score >= 90 && admitted && wrongPieces === 0 ? "S" : score >= 72 ? "A" : score >= 50 ? "B" : "C";
  // Une audience ratée se facture quand même, mais le client conteste les heures perdues.
  const billedHours = Math.round(def.hearingHours * (0.6 + 0.4 * (score / 100)) * 10) / 10;
  return {
    contradictions,
    missedContradictions,
    objectionsWon,
    objectionsLost,
    missedObjections,
    wrongPieces,
    admitted,
    score,
    grade,
    billedHours,
    fees: Math.round(billedHours * def.hourlyRate),
    reputation: COURT_REPUTATION[grade],
  };
}

/** Le clic OBJECTION tombe-t-il dans la fenêtre contestable (fraction de la réplique affichée) ? */
export function inObjectionWindow(progress: number, win: { from: number; to: number } | undefined, grace = 0.08): boolean {
  if (!win) return false;
  return progress >= win.from - grace && progress <= win.to + grace;
}
