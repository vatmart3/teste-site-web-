/**
 * Décoration du bureau du joueur : catalogue (prix en $), placement sur grille, validation (dans la pièce,
 * pas de chevauchement, porte dégagée, objets muraux contre les murs), budget.
 */
import { DEFAULT_DECOR, FOOTPRINT, PLAYER_OFFICE, type FurnitureType, type Placed } from "./layout";
import { boxSegs } from "./nav";

export interface CatalogItem {
  type: FurnitureType;
  v?: number;
  name: string;
  price: number;
  cat: "Bureaux" | "Sièges" | "Rangement" | "Déco" | "Prestige";
  /** Rang minimum (0 collaborateur … 3 associé). */
  rank?: number;
}

export const CATALOG: CatalogItem[] = [
  { type: "desk-walnut", name: "Bureau en noyer", price: 2400, cat: "Bureaux" },
  { type: "desk-glass", name: "Bureau en verre et chrome", price: 3800, cat: "Bureaux" },
  { type: "desk-exec", name: "Bureau de direction", price: 7900, cat: "Bureaux", rank: 1 },
  { type: "chair-exec", name: "Fauteuil cuir noir", price: 1200, cat: "Sièges" },
  { type: "chair-exec", v: 1, name: "Fauteuil cuir cognac", price: 1500, cat: "Sièges" },
  { type: "chair-visitor", name: "Chaise visiteur", price: 450, cat: "Sièges" },
  { type: "sofa", name: "Canapé Chesterfield", price: 3600, cat: "Sièges" },
  { type: "sofa", v: 2, name: "Canapé velours marine", price: 2900, cat: "Sièges" },
  { type: "armchair", name: "Fauteuil club", price: 1700, cat: "Sièges" },
  { type: "armchair", v: 1, name: "Fauteuil club cognac", price: 1900, cat: "Sièges" },
  { type: "coffee-table", name: "Table basse marbre", price: 1100, cat: "Sièges" },
  { type: "bookshelf", name: "Bibliothèque en noyer", price: 1300, cat: "Rangement" },
  { type: "credenza", name: "Enfilade", price: 1600, cat: "Rangement" },
  { type: "cabinet", name: "Classeur métallique", price: 350, cat: "Rangement" },
  { type: "plant", name: "Plante en pot", price: 120, cat: "Déco" },
  { type: "plant-tall", name: "Figuier lyre", price: 260, cat: "Déco" },
  { type: "lamp-floor", name: "Lampe sur pied", price: 540, cat: "Déco" },
  { type: "rug", v: 0, name: "Tapis moderne", price: 900, cat: "Déco" },
  { type: "rug", v: 1, name: "Tapis persan", price: 2600, cat: "Déco" },
  { type: "art", v: 0, name: "Toile « Minuit »", price: 3200, cat: "Déco" },
  { type: "art", v: 1, name: "Toile « Soleil »", price: 3500, cat: "Déco" },
  { type: "art", v: 2, name: "Toile « Hudson »", price: 4100, cat: "Déco" },
  { type: "diplomas", name: "Diplômes encadrés", price: 180, cat: "Déco" },
  { type: "whiteboard", name: "Tableau blanc", price: 380, cat: "Déco" },
  { type: "globe", name: "Globe terrestre ancien", price: 950, cat: "Prestige" },
  { type: "record-player", name: "Platine et vinyles", price: 2800, cat: "Prestige", rank: 1 },
  { type: "bar-cart", name: "Bar roulant", price: 1900, cat: "Prestige", rank: 1 },
  { type: "basketball", name: "Ballon dédicacé sous verre", price: 1500, cat: "Prestige" },
  { type: "aquarium", name: "Aquarium", price: 4200, cat: "Prestige", rank: 2 },
  { type: "statue", name: "Sculpture en bronze", price: 6500, cat: "Prestige", rank: 2 },
];

export const WALL_ITEMS = new Set<FurnitureType>(["art", "diplomas", "whiteboard"]);
export const FLOOR_OVERLAY = new Set<FurnitureType>(["rug"]);
/** Objets indispensables : on peut les remplacer, pas les vendre. */
export const ESSENTIAL: Record<string, FurnitureType[]> = {
  desk: ["desk-walnut", "desk-glass", "desk-exec"],
  chair: ["chair-exec"],
};

export const GRID = 0.25;
export const START_BUDGET = 6000;

export function budget(p: { billed: number; spent: number }): number {
  return Math.round(START_BUDGET + p.billed * 0.2 - p.spent);
}

export function priceOf(item: Pick<Placed, "type" | "v">): number {
  return CATALOG.find((c) => c.type === item.type && (c.v ?? 0) === (item.v ?? 0))?.price ?? CATALOG.find((c) => c.type === item.type)?.price ?? 0;
}

export function nameOf(item: Pick<Placed, "type" | "v">): string {
  return CATALOG.find((c) => c.type === item.type && (c.v ?? 0) === (item.v ?? 0))?.name ?? item.type;
}

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

const O = PLAYER_OFFICE;
/** Couloir d'accès à la porte, qui doit rester libre. */
const DOOR_ZONE = { x0: 3.4, x1: 5.0, z0: -8.9, z1: -7.5 };

function corners(p: Placed): [number, number][] {
  const segs = boxSegs({ x: p.x, z: p.z, w: FOOTPRINT[p.type][0], d: FOOTPRINT[p.type][1], rot: p.rot });
  return segs.map((s) => [s.ax, s.az]);
}

function overlap(a: Placed, b: Placed): boolean {
  // Test des axes séparateurs sur deux rectangles orientés.
  const ca = corners(a);
  const cb = corners(b);
  const axes: [number, number][] = [];
  for (const c of [ca, cb]) {
    for (let i = 0; i < 2; i++) {
      const p = c[i]!;
      const q = c[i + 1]!;
      axes.push([q[1] - p[1], -(q[0] - p[0])]);
    }
  }
  for (const [ax, az] of axes) {
    const pa = ca.map(([x, z]) => x * ax + z * az);
    const pb = cb.map(([x, z]) => x * ax + z * az);
    if (Math.max(...pa) <= Math.min(...pb) + 1e-6 || Math.max(...pb) <= Math.min(...pa) + 1e-6) return false;
  }
  return true;
}

/** Colle un objet mural au mur latéral le plus proche (ouest x = 3, est x = 10). */
export function wallSnap(p: Placed): Placed {
  const west = Math.abs(p.x - O.x0) < Math.abs(p.x - O.x1);
  const d = FOOTPRINT[p.type][1] / 2 + 0.07;
  return { ...p, x: west ? O.x0 - 0.25 + d : O.x1 + 0.25 - d, rot: west ? Math.PI / 2 : -Math.PI / 2, z: Math.max(O.z0 + 0.8, Math.min(O.z1 - 0.8, p.z)) };
}

export interface Check {
  ok: boolean;
  reason?: string;
}

export function canPlace(p: Placed, others: Placed[]): Check {
  if (WALL_ITEMS.has(p.type)) {
    const clash = others.some((o) => o.id !== p.id && WALL_ITEMS.has(o.type) && Math.abs(o.x - p.x) < 0.3 && Math.abs(o.z - p.z) < (FOOTPRINT[o.type][0] + FOOTPRINT[p.type][0]) / 2);
    return clash ? { ok: false, reason: "Il y a déjà quelque chose sur ce mur." } : { ok: true };
  }
  for (const [x, z] of corners(p)) {
    if (x < O.x0 - 1e-6 || x > O.x1 + 1e-6 || z < O.z0 - 1e-6 || z > O.z1 + 1e-6) return { ok: false, reason: "Hors du bureau." };
  }
  if (FLOOR_OVERLAY.has(p.type)) return { ok: true };
  const door: Placed = { id: "_door", type: "rug", x: (DOOR_ZONE.x0 + DOOR_ZONE.x1) / 2, z: (DOOR_ZONE.z0 + DOOR_ZONE.z1) / 2, rot: 0 };
  const dc = corners(p).concat([[p.x, p.z]]);
  if (dc.some(([x, z]) => x > DOOR_ZONE.x0 && x < DOOR_ZONE.x1 && z > DOOR_ZONE.z0 && z < DOOR_ZONE.z1) || (Math.abs(p.x - door.x) < 0.8 && Math.abs(p.z - door.z) < 0.7)) return { ok: false, reason: "La porte doit rester libre." };
  for (const o of others) {
    if (o.id === p.id || FLOOR_OVERLAY.has(o.type) || WALL_ITEMS.has(o.type)) continue;
    // Un fauteuil se glisse sous un bureau.
    const chairDesk = (a: Placed, b: Placed) => a.type.startsWith("chair") && b.type.startsWith("desk");
    if (chairDesk(p, o) || chairDesk(o, p)) continue;
    if (overlap(p, o)) return { ok: false, reason: "Ça touche un autre meuble." };
  }
  return { ok: true };
}

export function defaultDecor(): Placed[] {
  return DEFAULT_DECOR.map((d) => ({ ...d }));
}

/** Le bureau et son fauteuil : ceux qui définissent la place du joueur. */
export function playerDesk(decor: Placed[]): Placed | undefined {
  return decor.find((d) => ESSENTIAL.desk!.includes(d.type));
}

export function playerChair(decor: Placed[]): Placed | undefined {
  return decor.find((d) => d.type === "chair-exec");
}

let seq = 0;
export function newId(type: FurnitureType): string {
  seq += 1;
  return `d-${type}-${Date.now().toString(36)}-${seq}`;
}
