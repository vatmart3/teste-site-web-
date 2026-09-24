/**
 * Plan du 48e étage de Harlow & Vance (données pures : murs, mobilier fixe, postes, points de passage).
 *
 *   z = −12  ── baies vitrées (nord) ─────────────────────────────────────────────────────────
 *   │ Bureau d'angle HARLOW │ Salle de conférence │ Bureau MERCER │ VOTRE BUREAU │ Bureau VANCE │
 *   z = −7,5 ── cloisons vitrées, portes ─────────────────────────────────────────────────────
 *   │ postes des assistants (Vivian devant Harlow, Theo devant vous)                           │
 *   │ couloir                                                                                  │
 *   │ Salon │           OPEN SPACE (îlots de collaborateurs)            │ Cafétéria             │
 *   │ Archives │  Accueil (Nora) · mur du logo · ascenseurs (sud)        │ Courrier / copies     │
 *   z = +12
 * x de −20 (ouest) à +20 (est). Unités : mètres. Lacet 0 = regard vers +z.
 */

export type Vec2 = [number, number];

export interface Wall {
  a: Vec2;
  b: Vec2;
  kind: "wall" | "glass" | "window" | "panel";
  /** Hauteur (m) ; par défaut sol → plafond. */
  h?: number;
}

export type FurnitureType =
  | "desk-exec"
  | "desk-glass"
  | "desk-walnut"
  | "desk-assistant"
  | "desk-pod"
  | "chair-office"
  | "chair-exec"
  | "chair-visitor"
  | "sofa"
  | "armchair"
  | "coffee-table"
  | "bookshelf"
  | "plant"
  | "plant-tall"
  | "lamp-floor"
  | "rug"
  | "art"
  | "diplomas"
  | "record-player"
  | "bar-cart"
  | "globe"
  | "aquarium"
  | "basketball"
  | "whiteboard"
  | "cabinet"
  | "statue"
  | "conf-table"
  | "reception-desk"
  | "archive-shelf"
  | "counter"
  | "espresso"
  | "table-round"
  | "copier"
  | "mail-slots"
  | "corkboard"
  | "tv"
  | "credenza";

export interface Placed {
  id: string;
  type: FurnitureType;
  x: number;
  z: number;
  rot: number;
  /** Variante de couleur / matière. */
  v?: number;
}

export interface Box {
  x: number;
  z: number;
  w: number;
  d: number;
  rot: number;
}

export const FLOOR = { x0: -20, x1: 20, z0: -12, z1: 12, ceiling: 3.2 };

/** Pièces (pour l'affichage du lieu et les sols). */
export const ROOMS: { id: string; name: string; x0: number; x1: number; z0: number; z1: number; floor: "wood" | "carpet" | "marble" | "tile" }[] = [
  { id: "harlow", name: "Bureau de R. Harlow", x0: -20, x1: -12, z0: -12, z1: -7.5, floor: "wood" },
  { id: "conference", name: "Salle de conférence", x0: -12, x1: -3, z0: -12, z1: -7.5, floor: "carpet" },
  { id: "mercer", name: "Bureau de G. Mercer", x0: -3, x1: 3, z0: -12, z1: -7.5, floor: "carpet" },
  { id: "player", name: "Votre bureau", x0: 3, x1: 10, z0: -12, z1: -7.5, floor: "wood" },
  { id: "vance", name: "Bureau de M. Vance", x0: 10, x1: 20, z0: -12, z1: -7.5, floor: "wood" },
  { id: "archives", name: "Archives", x0: -20, x1: -12, z0: 3, z1: 12, floor: "tile" },
  { id: "mail", name: "Courrier & reprographie", x0: 12, x1: 20, z0: 4, z1: 12, floor: "tile" },
  { id: "break", name: "Cafétéria", x0: 12, x1: 20, z0: -7.5, z1: 4, floor: "wood" },
  { id: "lounge", name: "Salon", x0: -20, x1: -12, z0: -7.5, z1: 3, floor: "carpet" },
  { id: "reception", name: "Accueil", x0: -12, x1: 12, z0: 5.5, z1: 12, floor: "marble" },
  { id: "bullpen", name: "Open space", x0: -12, x1: 12, z0: -7.5, z1: 5.5, floor: "carpet" },
];

export function roomAt(x: number, z: number): (typeof ROOMS)[number] | null {
  return ROOMS.find((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) ?? null;
}

const OFFICE_FRONT = -7.5;
/** Portes des bureaux (x0, x1) dans la cloison vitrée. */
export const DOORS: { room: string; x0: number; x1: number; z: number }[] = [
  { room: "harlow", x0: -14.2, x1: -13.0, z: OFFICE_FRONT },
  { room: "conference", x0: -4.8, x1: -3.6, z: OFFICE_FRONT },
  { room: "mercer", x0: 1.4, x1: 2.6, z: OFFICE_FRONT },
  { room: "player", x0: 3.6, x1: 4.8, z: OFFICE_FRONT },
  { room: "vance", x0: 10.6, x1: 11.8, z: OFFICE_FRONT },
  { room: "archives", x0: -13.9, x1: -12.7, z: 3 },
  { room: "mail", x0: 12.7, x1: 13.9, z: 4 },
];

function frontWall(): Wall[] {
  const out: Wall[] = [];
  let x = FLOOR.x0;
  for (const d of DOORS.filter((d) => d.z === OFFICE_FRONT)) {
    out.push({ a: [x, OFFICE_FRONT], b: [d.x0, OFFICE_FRONT], kind: "glass" });
    x = d.x1;
  }
  out.push({ a: [x, OFFICE_FRONT], b: [FLOOR.x1, OFFICE_FRONT], kind: "glass" });
  return out;
}

export const WALLS: Wall[] = [
  // Façades vitrées.
  { a: [FLOOR.x0, FLOOR.z0], b: [FLOOR.x1, FLOOR.z0], kind: "window" },
  { a: [FLOOR.x1, FLOOR.z0], b: [FLOOR.x1, FLOOR.z1], kind: "window" },
  { a: [FLOOR.x0, FLOOR.z1], b: [FLOOR.x0, FLOOR.z0], kind: "window" },
  // Façade sud : noyau des ascenseurs.
  { a: [FLOOR.x1, FLOOR.z1], b: [FLOOR.x0, FLOOR.z1], kind: "wall" },
  // Bureaux du nord.
  ...frontWall(),
  { a: [-12, FLOOR.z0], b: [-12, OFFICE_FRONT], kind: "panel" },
  { a: [-3, FLOOR.z0], b: [-3, OFFICE_FRONT], kind: "glass" },
  { a: [3, FLOOR.z0], b: [3, OFFICE_FRONT], kind: "panel" },
  { a: [10, FLOOR.z0], b: [10, OFFICE_FRONT], kind: "panel" },
  // Archives (sud-ouest).
  { a: [FLOOR.x0, 3], b: [-13.9, 3], kind: "wall" },
  { a: [-12.7, 3], b: [-12, 3], kind: "wall" },
  { a: [-12, 3], b: [-12, FLOOR.z1], kind: "wall" },
  // Courrier (sud-est).
  { a: [12, 4], b: [12.7, 4], kind: "wall" },
  { a: [13.9, 4], b: [FLOOR.x1, 4], kind: "wall" },
  { a: [12, 4], b: [12, FLOOR.z1], kind: "wall" },
  // Mur du logo derrière l'accueil.
  { a: [-4, 5.5], b: [4, 5.5], kind: "panel" },
];

/** Mobilier fixe (le bureau du joueur est à part : il se décore). */
export const FURNITURE: Placed[] = [
  // Harlow
  { id: "h-desk", type: "desk-exec", x: -16, z: -10.3, rot: 0 },
  { id: "h-chair", type: "chair-exec", x: -16, z: -11.05, rot: 0 },
  { id: "h-v1", type: "chair-visitor", x: -16.6, z: -9.2, rot: Math.PI },
  { id: "h-v2", type: "chair-visitor", x: -15.4, z: -9.2, rot: Math.PI },
  { id: "h-sofa", type: "sofa", x: -19.2, z: -9.6, rot: Math.PI / 2 },
  { id: "h-table", type: "coffee-table", x: -18.1, z: -9.6, rot: Math.PI / 2 },
  { id: "h-shelf", type: "bookshelf", x: -12.3, z: -10.4, rot: -Math.PI / 2 },
  { id: "h-records", type: "record-player", x: -12.35, z: -8.6, rot: -Math.PI / 2 },
  { id: "h-bar", type: "bar-cart", x: -19.4, z: -11.3, rot: Math.PI / 4 },
  { id: "h-plant", type: "plant-tall", x: -19.5, z: -8.0, rot: 0 },
  { id: "h-rug", type: "rug", x: -16.4, z: -9.8, rot: 0, v: 1 },
  { id: "h-art", type: "art", x: -16, z: -7.62, rot: Math.PI, v: 2 },
  // Conférence
  { id: "c-table", type: "conf-table", x: -7.5, z: -9.75, rot: 0 },
  ...[-9.5, -8.3, -7.1, -5.9].flatMap((x, i) => [
    { id: `c-n${i}`, type: "chair-office" as const, x, z: -10.75, rot: 0 },
    { id: `c-s${i}`, type: "chair-office" as const, x, z: -8.75, rot: Math.PI },
  ]),
  { id: "c-tv", type: "tv", x: -11.85, z: -9.75, rot: Math.PI / 2 },
  { id: "c-wb", type: "whiteboard", x: -3.15, z: -9.75, rot: -Math.PI / 2 },
  // Mercer
  { id: "m-desk", type: "desk-glass", x: 0, z: -10.3, rot: 0 },
  { id: "m-chair", type: "chair-exec", x: 0, z: -11.05, rot: 0 },
  { id: "m-v1", type: "chair-visitor", x: -0.6, z: -9.2, rot: Math.PI },
  { id: "m-shelf", type: "credenza", x: 2.6, z: -10.3, rot: -Math.PI / 2 },
  { id: "m-plant", type: "plant", x: -2.5, z: -11.4, rot: 0 },
  { id: "m-ball", type: "basketball", x: 2.5, z: -11.4, rot: 0 },
  // Vance (bureau vide : l'associé est « en déplacement »)
  { id: "v-desk", type: "desk-walnut", x: 15, z: -10.3, rot: 0 },
  { id: "v-chair", type: "chair-exec", x: 15, z: -11.05, rot: 0 },
  { id: "v-sofa", type: "sofa", x: 19.2, z: -9.6, rot: -Math.PI / 2 },
  { id: "v-globe", type: "globe", x: 11, z: -11.2, rot: 0 },
  { id: "v-statue", type: "statue", x: 18.9, z: -11.3, rot: 0 },
  // Postes des assistants
  { id: "a-viv", type: "desk-assistant", x: -15.6, z: -5.9, rot: Math.PI },
  { id: "a-viv-c", type: "chair-office", x: -15.6, z: -6.65, rot: 0 },
  { id: "a-theo", type: "desk-assistant", x: 6.8, z: -5.9, rot: Math.PI },
  { id: "a-theo-c", type: "chair-office", x: 6.8, z: -6.65, rot: 0 },
  { id: "a-merc", type: "desk-assistant", x: -0.6, z: -5.9, rot: Math.PI },
  { id: "a-merc-c", type: "chair-office", x: -0.6, z: -6.65, rot: 0 },
  // Open space : îlots de deux postes face à face.
  ...[-9, -5.5, -2, 1.5, 5].flatMap((x, i) =>
    [-1.0, 3.0].flatMap((z, j) => [
      { id: `pod-${i}-${j}`, type: "desk-pod" as const, x, z, rot: 0 },
      { id: `pod-${i}-${j}-a`, type: "chair-office" as const, x: x - 0.45, z: z - 1.05, rot: 0 },
      { id: `pod-${i}-${j}-b`, type: "chair-office" as const, x: x + 0.45, z: z + 1.05, rot: Math.PI },
    ]),
  ),
  { id: "bp-plant1", type: "plant-tall", x: -11.3, z: -3.2, rot: 0 },
  { id: "bp-plant2", type: "plant-tall", x: 11.3, z: -3.2, rot: 0 },
  { id: "bp-cab1", type: "cabinet", x: 8.6, z: -1.0, rot: -Math.PI / 2 },
  { id: "bp-cab2", type: "cabinet", x: 8.6, z: 3.0, rot: -Math.PI / 2 },
  // Salon (ouest)
  { id: "l-sofa", type: "sofa", x: -19.1, z: -2.0, rot: Math.PI / 2 },
  { id: "l-arm1", type: "armchair", x: -16.2, z: -3.2, rot: -Math.PI / 2 },
  { id: "l-arm2", type: "armchair", x: -16.2, z: -0.8, rot: -Math.PI / 2 },
  { id: "l-table", type: "coffee-table", x: -17.7, z: -2.0, rot: Math.PI / 2 },
  { id: "l-rug", type: "rug", x: -17.6, z: -2.0, rot: Math.PI / 2, v: 0 },
  { id: "l-plant", type: "plant", x: -19.4, z: 1.8, rot: 0 },
  { id: "l-lamp", type: "lamp-floor", x: -19.4, z: -4.6, rot: 0 },
  // Archives
  ...[5, 7, 9, 11].map((z, i) => ({ id: `ar-${i}`, type: "archive-shelf" as const, x: -17, z, rot: 0 })),
  { id: "ar-cab", type: "cabinet", x: -12.4, z: 6.5, rot: -Math.PI / 2 },
  // Cafétéria
  { id: "k-counter", type: "counter", x: 19.3, z: -1.2, rot: -Math.PI / 2 },
  { id: "k-espresso", type: "espresso", x: 19.35, z: -0.4, rot: -Math.PI / 2 },
  { id: "k-t1", type: "table-round", x: 15.2, z: -2.6, rot: 0 },
  { id: "k-t2", type: "table-round", x: 15.2, z: 1.4, rot: 0 },
  ...[
    [14.4, -2.6, Math.PI / 2],
    [16.0, -2.6, -Math.PI / 2],
    [14.4, 1.4, Math.PI / 2],
    [16.0, 1.4, -Math.PI / 2],
  ].map(([x, z, r], i) => ({ id: `k-c${i}`, type: "chair-visitor" as const, x: x!, z: z!, rot: r! })),
  { id: "k-plant", type: "plant-tall", x: 19.4, z: 3.4, rot: 0 },
  // Courrier
  { id: "p-copier", type: "copier", x: 19.2, z: 6.5, rot: -Math.PI / 2 },
  { id: "p-slots", type: "mail-slots", x: 16, z: 11.6, rot: Math.PI },
  { id: "p-table", type: "counter", x: 16, z: 8.2, rot: 0 },
  // Accueil
  { id: "r-desk", type: "reception-desk", x: 0, z: 8.2, rot: 0 },
  { id: "r-chair", type: "chair-office", x: 0, z: 7.35, rot: 0 },
  { id: "r-sofa1", type: "sofa", x: -8, z: 10.8, rot: Math.PI },
  { id: "r-sofa2", type: "sofa", x: 8, z: 10.8, rot: Math.PI },
  { id: "r-t1", type: "coffee-table", x: -8, z: 9.6, rot: 0 },
  { id: "r-t2", type: "coffee-table", x: 8, z: 9.6, rot: 0 },
  { id: "r-plant1", type: "plant-tall", x: -4.6, z: 6.0, rot: 0 },
  { id: "r-plant2", type: "plant-tall", x: 4.6, z: 6.0, rot: 0 },
  { id: "r-plant3", type: "plant-tall", x: -11.4, z: 11.4, rot: 0 },
  { id: "r-plant4", type: "plant-tall", x: 11.4, z: 11.4, rot: 0 },
];

/** Bureau du joueur : zone décorable et mobilier par défaut (modifiable). */
export const PLAYER_OFFICE = { x0: 3.25, x1: 9.75, z0: -11.75, z1: -7.75 };
export const DEFAULT_DECOR: Placed[] = [
  { id: "p-desk", type: "desk-walnut", x: 6.5, z: -10.25, rot: 0 },
  { id: "p-chair", type: "chair-exec", x: 6.5, z: -11.0, rot: 0 },
  { id: "p-v1", type: "chair-visitor", x: 5.9, z: -9.2, rot: Math.PI },
  { id: "p-shelf", type: "bookshelf", x: 3.55, z: -10.25, rot: Math.PI / 2 },
  { id: "p-plant", type: "plant", x: 9.35, z: -11.35, rot: 0 },
];
/** Tableau d'enquête : fixé au mur est du bureau du joueur. */
export const PLAYER_BOARD = { x: 9.9, z: -9.6, rot: -Math.PI / 2 };

/** Emprise au sol (m) de chaque type, pour les collisions et la décoration. */
export const FOOTPRINT: Record<FurnitureType, [number, number]> = {
  "desk-exec": [2.0, 0.95],
  "desk-glass": [1.8, 0.85],
  "desk-walnut": [1.9, 0.9],
  "desk-assistant": [1.6, 0.75],
  "desk-pod": [1.8, 1.7],
  "chair-office": [0.6, 0.6],
  "chair-exec": [0.7, 0.7],
  "chair-visitor": [0.6, 0.6],
  sofa: [2.2, 0.9],
  armchair: [0.9, 0.85],
  "coffee-table": [1.2, 0.6],
  bookshelf: [1.2, 0.4],
  plant: [0.5, 0.5],
  "plant-tall": [0.6, 0.6],
  "lamp-floor": [0.4, 0.4],
  rug: [2.6, 1.8],
  art: [1.2, 0.06],
  diplomas: [0.9, 0.06],
  "record-player": [0.9, 0.45],
  "bar-cart": [0.8, 0.5],
  globe: [0.55, 0.55],
  aquarium: [1.4, 0.5],
  basketball: [0.35, 0.35],
  whiteboard: [1.6, 0.1],
  cabinet: [0.9, 0.5],
  statue: [0.5, 0.5],
  "conf-table": [5.0, 1.4],
  "reception-desk": [3.4, 0.9],
  "archive-shelf": [5.5, 0.5],
  counter: [3.0, 0.65],
  espresso: [0.45, 0.4],
  "table-round": [0.9, 0.9],
  copier: [1.1, 0.7],
  "mail-slots": [2.0, 0.4],
  corkboard: [1.3, 0.05],
  tv: [1.6, 0.1],
  credenza: [1.6, 0.45],
};

/** Objets qu'on peut traverser (tapis, cadres au mur). */
export const PASSABLE = new Set<FurnitureType>(["rug", "art", "diplomas", "corkboard", "whiteboard", "tv", "espresso"]);

export function boxOf(p: Placed): Box {
  const [w, d] = FOOTPRINT[p.type];
  return { x: p.x, z: p.z, w, d, rot: p.rot };
}

/** Postes de travail : où s'assoit un personnage, et vers quoi il regarde. */
export interface Spot {
  id: string;
  x: number;
  z: number;
  /** Lacet du personnage à ce poste. */
  rot: number;
  kind: "seat" | "stand";
  /** Activité jouée sur place. */
  act?: "type" | "think" | "phone" | "talk" | "coffee" | "pickup" | "idle" | "idleWait";
}

export const SPOTS: Spot[] = [
  { id: "harlow-seat", x: -16, z: -10.95, rot: 0, kind: "seat", act: "think" },
  { id: "harlow-window", x: -17.5, z: -11.3, rot: Math.PI, kind: "stand", act: "phone" },
  { id: "vivian-seat", x: -15.6, z: -6.6, rot: 0, kind: "seat", act: "type" },
  { id: "theo-seat", x: 6.8, z: -6.6, rot: 0, kind: "seat", act: "type" },
  { id: "mercer-seat", x: 0, z: -10.95, rot: 0, kind: "seat", act: "type" },
  { id: "mercer-assist", x: -0.6, z: -6.6, rot: 0, kind: "seat", act: "type" },
  { id: "player-seat", x: 6.5, z: -10.95, rot: 0, kind: "seat" },
  { id: "nora-seat", x: 0, z: 7.3, rot: 0, kind: "seat", act: "type" },
  ...[-9, -5.5, -2, 1.5, 5].flatMap((x, i) =>
    [-1.0, 3.0].flatMap((z, j) => [
      { id: `pod-${i}-${j}-a`, x: x - 0.45, z: z - 1.0, rot: 0, kind: "seat" as const, act: "type" as const },
      { id: `pod-${i}-${j}-b`, x: x + 0.45, z: z + 1.0, rot: Math.PI, kind: "seat" as const, act: "type" as const },
    ]),
  ),
  { id: "coffee", x: 18.55, z: -0.4, rot: Math.PI / 2, kind: "stand", act: "coffee" },
  { id: "coffee-2", x: 18.4, z: -1.9, rot: Math.PI / 2, kind: "stand", act: "idleWait" },
  { id: "break-t1", x: 15.2, z: -1.6, rot: Math.PI, kind: "stand", act: "talk" },
  { id: "break-t2", x: 15.2, z: 0.4, rot: 0, kind: "stand", act: "talk" },
  { id: "lounge-1", x: -17.6, z: -3.4, rot: Math.PI, kind: "stand", act: "talk" },
  { id: "lounge-2", x: -17.6, z: -0.6, rot: 0, kind: "stand", act: "talk" },
  { id: "archive", x: -16.6, z: 6.0, rot: 0, kind: "stand", act: "pickup" },
  { id: "archive-2", x: -16.6, z: 10.0, rot: Math.PI, kind: "stand", act: "pickup" },
  { id: "mail", x: 16, z: 10.9, rot: 0, kind: "stand", act: "pickup" },
  { id: "copier", x: 18.2, z: 6.5, rot: Math.PI / 2, kind: "stand", act: "type" },
  { id: "guard", x: -5.2, z: 10.8, rot: Math.PI, kind: "stand", act: "idleWait" },
  { id: "window-n", x: -1, z: -3.2, rot: Math.PI, kind: "stand", act: "phone" },
  { id: "bullpen-chat-1", x: -3.8, z: 0.9, rot: Math.PI / 2, kind: "stand", act: "talk" },
  { id: "bullpen-chat-2", x: -2.6, z: 0.9, rot: -Math.PI / 2, kind: "stand", act: "talk" },
  { id: "reception-front", x: 0, z: 9.3, rot: Math.PI, kind: "stand", act: "idle" },
  { id: "elevator", x: 0, z: 11.0, rot: Math.PI, kind: "stand", act: "idle" },
];

export function spot(id: string): Spot {
  const s = SPOTS.find((s) => s.id === id);
  if (!s) throw new Error(`poste inconnu : ${id}`);
  return s;
}

/** Points de passage (reliés automatiquement quand la ligne est dégagée). */
export const WAYPOINTS: Record<string, Vec2> = (() => {
  const w: Record<string, Vec2> = {};
  // Couloir nord.
  [-18.5, -15.6, -13.6, -10, -7, -4.2, -1.6, 2, 4.2, 6.8, 9, 11.2, 14, 17.5].forEach((x, i) => (w[`cor${i}`] = [x, -4.6]));
  // Portes (dehors / dedans).
  for (const d of DOORS) {
    const cx = (d.x0 + d.x1) / 2;
    const n = d.z === OFFICE_FRONT ? -1 : 1;
    w[`door-${d.room}-out`] = [cx, d.z - n * 0.9];
    w[`door-${d.room}-in`] = [cx, d.z + n * 0.9];
  }
  // Intérieur des bureaux.
  w["harlow-a"] = [-16, -8.6];
  w["harlow-b"] = [-17.6, -8.3];
  w["harlow-c"] = [-14.6, -11.0];
  w["conf-a"] = [-5.0, -7.95];
  w["conf-c"] = [-10.6, -7.98];
  w["conf-b"] = [-10.8, -9.75];
  w["mercer-a"] = [0, -8.6];
  w["mercer-b"] = [1.4, -11.0];
  w["player-a"] = [6.5, -8.6];
  w["player-b"] = [8.2, -11.0];
  w["player-c"] = [4.6, -11.0];
  w["player-d"] = [8.5, -8.7];
  w["vance-a"] = [15, -8.6];
  // Open space : allées.
  [-10.4, -7.25, -3.75, -0.25, 3.25, 6.75, 10].forEach((x, i) => {
    w[`bp-n${i}`] = [x, -3.0];
    w[`bp-m${i}`] = [x, 0.95];
    w[`bp-s${i}`] = [x, 4.9];
  });
  // Ouest, est, sud.
  w["lounge"] = [-15.2, -2.0];
  w["lounge-s"] = [-15.2, 1.6];
  w["arch-a"] = [-13.3, 5.0];
  w["arch-b"] = [-13.3, 8.0];
  w["arch-c"] = [-13.3, 10.8];
  w["arch-f"] = [-13.3, 6.0];
  w["arch-g"] = [-13.3, 10.0];
  w["arch-d"] = [-15.8, 6.0];
  w["arch-e"] = [-15.8, 10.0];
  w["break-a"] = [13.2, -1.6];
  w["break-b"] = [17.4, -0.4];
  w["break-c"] = [13.2, 2.6];
  w["break-d"] = [17.4, -2.8];
  w["mail-a"] = [13.4, 5.4];
  w["mail-d"] = [13.4, 9.6];
  w["mail-b"] = [16, 9.9];
  w["mail-c"] = [17.8, 5.4];
  w["rec-w"] = [-6, 7.2];
  w["rec-e"] = [6, 7.2];
  w["rec-sw"] = [-5, 9.4];
  w["rec-se"] = [5, 9.4];
  w["rec-n"] = [-2.4, 6.6];
  w["rec-n2"] = [2.4, 6.6];
  w["lobby"] = [0, 10.4];
  w["lobby-w"] = [-9.5, 8.2];
  w["lobby-e"] = [9.5, 8.2];
  return w;
})();

/** Obstacles pour la navigation et les collisions : mobilier fixe (hors objets passables). */
export function staticBoxes(extra: Placed[] = []): Box[] {
  return [...FURNITURE, ...extra].filter((p) => !PASSABLE.has(p.type)).map(boxOf);
}
