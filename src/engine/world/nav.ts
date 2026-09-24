/**
 * Collisions (cercle contre segments) et navigation (graphe de points de passage, A*) de l'étage.
 * Pur et testable : aucune dépendance au rendu.
 */
import { WALLS, WAYPOINTS, type Box, type Vec2 } from "./layout";

export interface Seg {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

export function boxSegs(b: Box, pad = 0): Seg[] {
  const c = Math.cos(b.rot);
  const s = Math.sin(b.rot);
  const hw = b.w / 2 + pad;
  const hd = b.d / 2 + pad;
  // Axes locaux : x → (cos, −sin) ; z → (sin, cos) (rotation autour de y).
  const pts: Vec2[] = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([x, z]) => [b.x + x! * c + z! * s, b.z - x! * s + z! * c]);
  return pts.map((p, i) => {
    const q = pts[(i + 1) % 4]!;
    return { ax: p[0], az: p[1], bx: q[0], bz: q[1] };
  });
}

export function wallSegs(): Seg[] {
  return WALLS.map((w) => ({ ax: w.a[0], az: w.a[1], bx: w.b[0], bz: w.b[1] }));
}

/** Point du segment le plus proche de (x, z). */
function closest(s: Seg, x: number, z: number): [number, number] {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const l = dx * dx + dz * dz;
  const t = l > 0 ? Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / l)) : 0;
  return [s.ax + dx * t, s.az + dz * t];
}

export class Collider {
  segs: Seg[] = [];
  constructor(segs: Seg[] = []) {
    this.segs = segs;
  }

  static fromWorld(boxes: Box[]): Collider {
    return new Collider([...wallSegs(), ...boxes.flatMap((b) => boxSegs(b))]);
  }

  /** Repousse un cercle hors des segments (quelques itérations). Rend la position corrigée. */
  resolve(x: number, z: number, r: number): [number, number] {
    for (let it = 0; it < 4; it++) {
      let moved = false;
      for (const s of this.segs) {
        const [cx, cz] = closest(s, x, z);
        const dx = x - cx;
        const dz = z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 1e-6;
          const push = r - d;
          x += (dx / d) * push;
          z += (dz / d) * push;
          moved = true;
        }
      }
      if (!moved) break;
    }
    return [x, z];
  }

  /** La ligne (a → b) passe-t-elle à au moins `r` de tout obstacle ? */
  clear(ax: number, az: number, bx: number, bz: number, r = 0.3): boolean {
    for (const s of this.segs) {
      if (segDist(ax, az, bx, bz, s) < r) return false;
    }
    return true;
  }

  /** Distance libre depuis (x, z) le long de (dx, dz) (lancer de rayon), bornée à `max`. */
  ray(x: number, z: number, dx: number, dz: number, max: number): number {
    let best = max;
    for (const s of this.segs) {
      const ex = s.bx - s.ax;
      const ez = s.bz - s.az;
      const den = dx * ez - dz * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((s.ax - x) * ez - (s.az - z) * ex) / den;
      const u = ((s.ax - x) * dz - (s.az - z) * dx) / den;
      if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
    }
    return best;
  }
}

function segIntersect(ax: number, az: number, bx: number, bz: number, s: Seg): boolean {
  const d1x = bx - ax;
  const d1z = bz - az;
  const d2x = s.bx - s.ax;
  const d2z = s.bz - s.az;
  const den = d1x * d2z - d1z * d2x;
  if (Math.abs(den) < 1e-12) return false;
  const t = ((s.ax - ax) * d2z - (s.az - az) * d2x) / den;
  const u = ((s.ax - ax) * d1z - (s.az - az) * d1x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function segDist(ax: number, az: number, bx: number, bz: number, s: Seg): number {
  if (segIntersect(ax, az, bx, bz, s)) return 0;
  const a = { ax, az, bx, bz };
  const d = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  return Math.min(d([ax, az], closest(s, ax, az)), d([bx, bz], closest(s, bx, bz)), d([s.ax, s.az], closest(a, s.ax, s.az)), d([s.bx, s.bz], closest(a, s.bx, s.bz)));
}

export interface NavGraph {
  nodes: Record<string, Vec2>;
  edges: Record<string, string[]>;
}

/** Relie les points de passage visibles l'un de l'autre (à moins de `maxDist`). */
export function buildGraph(col: Collider, nodes: Record<string, Vec2> = WAYPOINTS, maxDist = 6.5, clearance = 0.32): NavGraph {
  const ids = Object.keys(nodes);
  const edges: Record<string, string[]> = {};
  for (const id of ids) edges[id] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = nodes[ids[i]!]!;
      const b = nodes[ids[j]!]!;
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) > maxDist) continue;
      if (!col.clear(a[0], a[1], b[0], b[1], clearance)) continue;
      edges[ids[i]!]!.push(ids[j]!);
      edges[ids[j]!]!.push(ids[i]!);
    }
  }
  return { nodes, edges };
}

/** Point de passage visible le plus proche. */
export function nearestNode(g: NavGraph, col: Collider, x: number, z: number): string | null {
  let best: string | null = null;
  let bd = Infinity;
  for (const [id, p] of Object.entries(g.nodes)) {
    const d = Math.hypot(p[0] - x, p[1] - z);
    if (d < bd && col.clear(x, z, p[0], p[1], 0.18)) {
      bd = d;
      best = id;
    }
  }
  return best;
}

/** Chemin de (x0, z0) à (x1, z1) : ligne droite si possible, sinon A* sur le graphe. */
export function findPath(g: NavGraph, col: Collider, from: Vec2, to: Vec2): Vec2[] {
  if (col.clear(from[0], from[1], to[0], to[1], 0.25)) return [to];
  const s = nearestNode(g, col, from[0], from[1]);
  const e = nearestNode(g, col, to[0], to[1]);
  if (!s || !e) return [to];
  const open = new Set([s]);
  const came: Record<string, string> = {};
  const gs: Record<string, number> = { [s]: 0 };
  const h = (id: string) => Math.hypot(g.nodes[id]![0] - to[0], g.nodes[id]![1] - to[1]);
  const fs: Record<string, number> = { [s]: h(s) };
  while (open.size) {
    let cur = "";
    let bf = Infinity;
    for (const id of open) {
      if ((fs[id] ?? Infinity) < bf) {
        bf = fs[id]!;
        cur = id;
      }
    }
    if (cur === e) break;
    open.delete(cur);
    for (const nb of g.edges[cur] ?? []) {
      const a = g.nodes[cur]!;
      const b = g.nodes[nb]!;
      const t = gs[cur]! + Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (t < (gs[nb] ?? Infinity)) {
        came[nb] = cur;
        gs[nb] = t;
        fs[nb] = t + h(nb);
        open.add(nb);
      }
    }
  }
  if (!(e in gs)) return [to];
  const ids: string[] = [e];
  while (ids[0] !== s) ids.unshift(came[ids[0]!]!);
  const pts: Vec2[] = [...ids.map((id) => g.nodes[id]!), to];
  // Lissage : on saute les points intermédiaires quand la ligne est dégagée.
  const out: Vec2[] = [];
  let cur: Vec2 = from;
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !col.clear(cur[0], cur[1], pts[j]![0], pts[j]![1], 0.28)) j--;
    out.push(pts[j]!);
    cur = pts[j]!;
    i = j + 1;
  }
  return out;
}

/** Tous les nœuds sont-ils atteignables depuis le premier ? (tests) */
export function connected(g: NavGraph): string[] {
  const ids = Object.keys(g.nodes);
  const seen = new Set([ids[0]!]);
  const stack = [ids[0]!];
  while (stack.length) {
    const c = stack.pop()!;
    for (const n of g.edges[c] ?? []) {
      if (seen.has(n)) continue;
      seen.add(n);
      stack.push(n);
    }
  }
  return ids.filter((id) => !seen.has(id));
}
