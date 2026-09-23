/**
 * Règles du tableau d'enquête (pures, testées) : quelle connexion est juste, quel score pour la préparation,
 * et la physique du fil rouge (corde de Verlet : points, gravité, contraintes de longueur).
 */
import type { BoardDef, BoardLink, BoardResult } from "./types";

/** La connexion entre deux pièces, si elle existe (ordre indifférent). */
export function linkBetween(def: BoardDef, a: string, b: string): BoardLink | null {
  if (a === b) return null;
  return def.links.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a)) ?? null;
}

/**
 * Score de préparation : part du poids des connexions trouvées (90 points), moins 5 par fil tiré à tort
 * (au plus 30), plus 10 si aucune erreur.
 */
export function scoreBoard(def: BoardDef, found: string[], wrong: number): BoardResult {
  const unique = [...new Set(found)].filter((id) => def.links.some((l) => l.id === id));
  const total = def.links.reduce((s, l) => s + l.weight, 0);
  const got = def.links.filter((l) => unique.includes(l.id)).reduce((s, l) => s + l.weight, 0);
  const raw = (got / total) * 90 - Math.min(30, wrong * 5) + (wrong === 0 && unique.length > 0 ? 10 : 0);
  return { found: unique, wrong, score: Math.round(Math.max(0, Math.min(100, raw))) };
}

/** Pièces présentables au tribunal (contradictions établies sur le tableau). */
export function courtEvidenceFrom(def: BoardDef, found: string[]): string[] {
  return def.links.filter((l) => found.includes(l.id) && l.courtEvidence).map((l) => l.courtEvidence!);
}

// ------------------------------------------------------------------------------------ fil rouge (Verlet)
export interface Rope {
  /** Positions courantes et précédentes (x, y, z à plat). */
  p: Float32Array;
  prev: Float32Array;
  n: number;
  /** Longueur au repos de chaque segment. */
  seg: number;
}

export function makeRope(n: number, a: [number, number, number], b: [number, number, number], slack = 1.15): Rope {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    p[i * 3] = a[0] + (b[0] - a[0]) * t;
    p[i * 3 + 1] = a[1] + (b[1] - a[1]) * t;
    p[i * 3 + 2] = a[2] + (b[2] - a[2]) * t;
  }
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  return { p, prev: p.slice(), n, seg: (len * slack) / (n - 1) };
}

/**
 * Un pas de simulation : intégration de Verlet (gravité, amortissement), extrémités épinglées,
 * contraintes de distance (itérations), et le fil ne traverse pas le liège (z ≥ zMin).
 */
export function stepRope(r: Rope, dt: number, a: [number, number, number], b: [number, number, number], opts: { gravity?: number; damping?: number; iterations?: number; zMin?: number } = {}): void {
  const g = opts.gravity ?? -9.8;
  const damp = opts.damping ?? 0.985;
  const zMin = opts.zMin ?? -Infinity;
  const { p, prev, n } = r;
  const dt2 = dt * dt;
  for (let i = 1; i < n - 1; i++) {
    const k = i * 3;
    for (let c = 0; c < 3; c++) {
      const cur = p[k + c]!;
      const v = (cur - prev[k + c]!) * damp;
      prev[k + c] = cur;
      p[k + c] = cur + v + (c === 1 ? g * dt2 : 0);
    }
  }
  const pin = (i: number, q: [number, number, number]) => {
    p[i * 3] = q[0];
    p[i * 3 + 1] = q[1];
    p[i * 3 + 2] = q[2];
    prev[i * 3] = q[0];
    prev[i * 3 + 1] = q[1];
    prev[i * 3 + 2] = q[2];
  };
  const iters = opts.iterations ?? 12;
  for (let it = 0; it < iters; it++) {
    pin(0, a);
    pin(n - 1, b);
    for (let i = 0; i < n - 1; i++) {
      const i0 = i * 3;
      const i1 = i0 + 3;
      const dx = p[i1]! - p[i0]!;
      const dy = p[i1 + 1]! - p[i0 + 1]!;
      const dz = p[i1 + 2]! - p[i0 + 2]!;
      const d = Math.hypot(dx, dy, dz) || 1e-6;
      const diff = (d - r.seg) / d;
      const w0 = i === 0 ? 0 : 0.5;
      const w1 = i + 1 === n - 1 ? 0 : 0.5;
      const s = w0 + w1 || 1;
      p[i0] = p[i0]! + dx * diff * (w0 / s);
      p[i0 + 1] = p[i0 + 1]! + dy * diff * (w0 / s);
      p[i0 + 2] = p[i0 + 2]! + dz * diff * (w0 / s);
      p[i1] = p[i1]! - dx * diff * (w1 / s);
      p[i1 + 1] = p[i1 + 1]! - dy * diff * (w1 / s);
      p[i1 + 2] = p[i1 + 2]! - dz * diff * (w1 / s);
    }
    for (let i = 1; i < n - 1; i++) if (p[i * 3 + 2]! < zMin) p[i * 3 + 2] = zMin;
  }
  pin(0, a);
  pin(n - 1, b);
}

/** Itérations de contrainte pour un fil tendu (plus raide). */
export const TAUT_ITERATIONS = 40;

/** Tend le fil : longueur au repos un peu plus courte que la distance entre les punaises. */
export function tighten(r: Rope, a: [number, number, number], b: [number, number, number]): void {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  r.seg = (len * 0.985) / (r.n - 1);
}

/** Flèche (écart maximal à la droite entre les extrémités) : sert à vérifier que le fil se tend. */
export function ropeSag(r: Rope): number {
  const { p, n } = r;
  const ax = p[0]!;
  const ay = p[1]!;
  const bx = p[(n - 1) * 3]!;
  const by = p[(n - 1) * 3 + 1]!;
  let max = 0;
  for (let i = 1; i < n - 1; i++) {
    const t = i / (n - 1);
    const lx = ax + (bx - ax) * t;
    const ly = ay + (by - ay) * t;
    max = Math.max(max, Math.hypot(p[i * 3]! - lx, p[i * 3 + 1]! - ly));
  }
  return max;
}
