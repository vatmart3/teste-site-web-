/**
 * Registre des plans. Les noms d'id = noms de fichiers de l'annexe A (sans extension).
 * Tant que les vraies plates ne sont pas dans /public/scenes, le moteur génère des plates provisoires
 * (dégradés + profondeur procédurale, cf. engine/plate/placeholders.ts).
 */
import type { RoomKind, SceneDef } from "./types";

const base = {
  aspect: 16 / 9,
  pivot: 0.45,
  parallax: 1,
  focus: 0.5,
  aperture: 0.35,
} as const;

/**
 * Disposition commune des bureaux (hub) : étagère, tableau de liège, ordinateur, porte vitrée.
 * Les objets posés sur le bureau (chemises, téléphone, mallette, café…) sont en 3D (engine/hub).
 */
export const DESK_LAYOUT = {
  shelf: { at: { x: 0.12, y: 0.28 }, size: { x: 0.18, y: 0.44 }, depth: 0.3 },
  board: { at: { x: 0.36, y: 0.26 }, size: { x: 0.22, y: 0.28 }, depth: 0.25 },
  terminal: { at: { x: 0.65, y: 0.41 }, size: { x: 0.26, y: 0.3 }, depth: 0.55 },
  door: { at: { x: 0.915, y: 0.32 }, size: { x: 0.15, y: 0.6 }, depth: 0.35 },
  /** Vitre de la porte (où passent les collègues) : x0, y0, x1, y1 en coordonnées authorées. */
  doorGlass: { x0: 0.855, y0: 0.06, x1: 0.975, y1: 0.58 },
} as const;

function deskScene(id: string, title: string, room3d: RoomKind): SceneDef {
  const L = DESK_LAYOUT;
  return {
    id,
    title,
    aspect: 16 / 9,
    pivot: 0.55,
    parallax: 0.8,
    focus: 0.55,
    aperture: 0.25,
    reverb: "office",
    ambience: ["amb-office-day"],
    room3d,
    hotspots: [
      { id: "shelf", kind: "region", label: "Bibliothèque de leçons", at: L.shelf.at, size: L.shelf.size, depth: L.shelf.depth },
      { id: "board", kind: "region", label: "Tableau d'enquête", at: L.board.at, size: L.board.size, depth: L.board.depth },
      { id: "terminal", kind: "region", label: "H&V Terminal", at: L.terminal.at, size: L.terminal.size, depth: L.terminal.depth },
      { id: "door", kind: "region", label: "Couloir", at: L.door.at, size: L.door.size, depth: L.door.depth },
    ],
    anchors: [
      { id: "clock", kind: "wall-clock", at: { x: 0.36, y: 0.065 }, depth: 0.25, size: 0.085 },
      { id: "notify", kind: "notification", at: { x: 0.65, y: 0.3 }, depth: 0.55, size: 0.03 },
    ],
  };
}

export const SCENES = {
  // ---------------------------------------------------------------- Plan 1 — Taxi, 6h40, pluie
  "01-taxi-night": {
    ...base,
    id: "01-taxi-night",
    title: "Taxi, 6h40, pluie",
    pivot: 0.3,
    focus: 0.25,
    aperture: 0.5,
    rain: 1,
    fog: 0.35,
    wipers: true,
    video: true,
    reverb: "car",
    ambience: ["amb-rain-taxi"],
    sounds: [{ id: "radio", sound: "amb-taxi-radio", at: { x: 0.52, y: 0.8 }, depth: 0.9, volume: 0.25, loop: true }],
    hotspots: [{ id: "door", kind: "object", label: "Ouvrir la portière", at: { x: 0.9, y: 0.55 }, depth: 0.85 }],
  },
  // ---------------------------------------------------------------- Plan 2 — Au pied de la tour (plate 9:16)
  "02-tower-base": {
    ...base,
    id: "02-tower-base",
    title: "Au pied de la tour",
    aspect: 9 / 16,
    pivot: 0.5,
    focus: 0.8,
    aperture: 0.25,
    rain: 0.35,
    rainStreaks: { amount: 1, from: { x: 0.5, y: -0.1 } },
    reverb: "street",
    ambience: ["amb-street-rain"],
    hotspots: [{ id: "revolving-door", kind: "object", label: "Porte tambour", at: { x: 0.5, y: 0.9 }, depth: 0.95 }],
  },
  // ---------------------------------------------------------------- Plan 3 — Le hall
  "03-lobby": {
    ...base,
    id: "03-lobby",
    room3d: "lobby",
    station: "entry",
    title: "Le hall",
    pivot: 0.4,
    focus: 0.45,
    aperture: 0.3,
    dust: 0.6,
    shaft: { at: { x: 0.5, y: 0.02 }, strength: 0.5 },
    layers: [{ name: "03-lobby.layer-column", depth: 0.95 }],
    reverb: "marble",
    ambience: ["amb-lobby-marble"],
    sounds: [{ id: "guard", sound: "amb-lobby-radio", at: { x: 0.5, y: 0.6 }, depth: 0.45, volume: 0.15, loop: true }],
    hotspots: [
      { id: "desk", kind: "waypoint", label: "Accueil", at: { x: 0.5, y: 0.78 }, depth: 0.6 },
      { id: "reader", kind: "object", label: "Lecteur de badge", at: { x: 0.435, y: 0.69 }, depth: 0.72 },
    ],
    anchors: [{ id: "reader-light", kind: "reader-light", at: { x: 0.435, y: 0.69 }, depth: 0.72, size: 0.03 }],
  },
  "03b-lobby-guard": {
    ...base,
    id: "03b-lobby-guard",
    title: "Le hall — le vigile",
    pivot: 0.55,
    focus: 0.62,
    aperture: 0.55,
    reverb: "marble",
    ambience: ["amb-lobby-marble"],
    character: { id: "guard", at: { x: 0.52, y: 0.36 }, depth: 0.62, radius: 0.3 },
  },
  // ---------------------------------------------------------------- Plan 4 — L'ascenseur panoramique
  "04-elevator-dawn": {
    ...base,
    id: "04-elevator-dawn",
    room3d: "elevator",
    title: "L'ascenseur panoramique",
    aspect: 9 / 16,
    pivot: 0.9,
    focus: 0.2,
    aperture: 0.2,
    parallax: 0.6,
    layers: [{ name: "04-elevator-dawn.layer-cabin", depth: 0.97, locked: true }],
    reverb: "elevator",
    ambience: ["amb-elevator"],
    anchors: [{ id: "floor", kind: "floor-counter", at: { x: 0.5, y: 0.245 }, depth: 0.97, size: 0.06, locked: true }],
  },
  // ---------------------------------------------------------------- Plan 5 — Accueil du 52e
  "05-reception-52": {
    ...base,
    id: "05-reception-52",
    title: "Accueil du 52e",
    pivot: 0.45,
    focus: 0.55,
    aperture: 0.45,
    shaft: { at: { x: 0.95, y: 0.1 }, strength: 0.45 },
    dust: 0.35,
    reverb: "office",
    ambience: ["amb-openspace"],
    character: { id: "nora", at: { x: 0.64, y: 0.44 }, depth: 0.55, radius: 0.2 },
    hotspots: [{ id: "corridor", kind: "waypoint", label: "Le couloir", at: { x: 0.2, y: 0.82 }, depth: 0.55 }],
  },
  // ---------------------------------------------------------------- Plan 6 — Traversée de l'open space
  "06a-openspace": {
    ...base,
    id: "06a-openspace",
    room3d: "corridor",
    station: "a",
    title: "L'open space",
    pivot: 0.35,
    focus: 0.3,
    aperture: 0.3,
    flicker: 0.15,
    dust: 0.4,
    shaft: { at: { x: 0.5, y: 0.42 }, strength: 0.65 },
    variants: ["day", "dusk", "night"],
    video: true,
    layers: [{ name: "06a-openspace.layer-plant", depth: 0.97 }],
    reverb: "openspace",
    ambience: ["amb-openspace"],
    sounds: [
      { id: "phone-left", sound: "sfx-desk-phone-ring", at: { x: 0.12, y: 0.55 }, depth: 0.6, volume: 0.5, loop: true },
      { id: "chat-right", sound: "amb-conversation", at: { x: 0.85, y: 0.5 }, depth: 0.55, volume: 0.45, loop: true },
    ],
    hotspots: [{ id: "forward", kind: "waypoint", label: "Avancer", at: { x: 0.5, y: 0.8 }, depth: 0.7 }],
  },
  "06b-openspace": {
    ...base,
    id: "06b-openspace",
    room3d: "corridor",
    station: "b",
    title: "L'open space — plus loin",
    pivot: 0.35,
    focus: 0.25,
    aperture: 0.3,
    dust: 0.4,
    shaft: { at: { x: 0.5, y: 0.42 }, strength: 0.8 },
    variants: ["day", "dusk", "night"],
    reverb: "openspace",
    ambience: ["amb-openspace"],
    sounds: [
      { id: "printer", sound: "amb-printer", at: { x: 0.8, y: 0.5 }, depth: 0.5, volume: 0.4, loop: true },
      { id: "chat-left", sound: "amb-conversation", at: { x: 0.15, y: 0.5 }, depth: 0.6, volume: 0.4, loop: true },
    ],
    hotspots: [
      { id: "forward", kind: "waypoint", label: "Avancer", at: { x: 0.5, y: 0.8 }, depth: 0.7 },
      { id: "back", kind: "waypoint", label: "Revenir", at: { x: 0.5, y: 0.93 }, depth: 0.9 },
    ],
  },
  "06c-openspace": {
    ...base,
    id: "06c-openspace",
    room3d: "corridor",
    station: "c",
    title: "L'open space — le fond du couloir",
    pivot: 0.35,
    focus: 0.2,
    aperture: 0.3,
    dust: 0.4,
    shaft: { at: { x: 0.5, y: 0.42 }, strength: 0.9 },
    variants: ["day", "dusk", "night"],
    reverb: "openspace",
    ambience: ["amb-openspace"],
    sounds: [{ id: "phone-right", sound: "sfx-desk-phone-ring", at: { x: 0.9, y: 0.5 }, depth: 0.55, volume: 0.35, loop: true }],
    hotspots: [{ id: "forward", kind: "waypoint", label: "Continuer", at: { x: 0.5, y: 0.8 }, depth: 0.7 }],
  },
  "06-rival-door": {
    ...base,
    id: "06-rival-door",
    title: "Le rival",
    pivot: 0.5,
    focus: 0.6,
    aperture: 0.6,
    reverb: "openspace",
    ambience: ["amb-openspace"],
    character: { id: "mercer", at: { x: 0.44, y: 0.36 }, depth: 0.6, radius: 0.26 },
  },
  // ---------------------------------------------------------------- Plan 7 — Le bureau d'angle
  "07-corner-office": {
    ...base,
    id: "07-corner-office",
    room3d: "corner-office",
    station: "enter",
    title: "Le bureau d'angle",
    pivot: 0.4,
    focus: 0.45,
    aperture: 0.35,
    shaft: { at: { x: 0.5, y: 0.35 }, strength: 0.5 },
    dust: 0.5,
    reverb: "office",
    ambience: ["amb-office-day"],
    character: { id: "harlow", at: { x: 0.5, y: 0.34 }, depth: 0.45, radius: 0.22 },
  },
  // ---------------------------------------------------------------- Plan 8 — Votre bureau (hub), selon le rang
  "08-desk-intern-night": { ...deskScene("08-desk-intern-night", "Votre bureau — stagiaire", "office-intern"), flicker: 0.35, ambience: ["amb-office-night"] },
  "08-desk-associate": { ...deskScene("08-desk-associate", "Votre bureau — collaborateur", "office-associate"), variants: ["day", "dusk", "night"] },
  "08-desk-senior": { ...deskScene("08-desk-senior", "Votre bureau — senior", "office-senior"), variants: ["day", "dusk", "night"] },
  "08-desk-partner": { ...deskScene("08-desk-partner", "Votre bureau d'angle — associé", "office-partner"), variants: ["day", "dusk", "night"] },
} satisfies Record<string, SceneDef>;

export type SceneId = keyof typeof SCENES;

export function getScene(id: SceneId): SceneDef {
  return SCENES[id];
}
