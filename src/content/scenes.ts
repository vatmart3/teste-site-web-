/**
 * Registre des plans. Les noms d'id = noms de fichiers de l'annexe A (sans extension).
 * Tant que les vraies plates ne sont pas dans /public/scenes, le moteur génère des plates provisoires
 * (dégradés + profondeur procédurale, cf. engine/plate/placeholders.ts).
 */
import type { SceneDef } from "./types";

const base = {
  aspect: 16 / 9,
  pivot: 0.45,
  parallax: 1,
  focus: 0.5,
  aperture: 0.35,
} as const;

export const SCENES = {
  "01-taxi-night": {
    ...base,
    id: "01-taxi-night",
    title: "Taxi, 6h40, pluie",
    pivot: 0.3,
    focus: 0.25,
    aperture: 0.5,
    rain: 1,
    fog: 0.35,
    video: true,
    reverb: "car",
    ambience: ["amb-rain-taxi"],
    sounds: [{ id: "radio", sound: "amb-taxi-radio", at: { x: 0.52, y: 0.8 }, depth: 0.9, volume: 0.25, loop: true }],
    hotspots: [{ id: "door", kind: "object", label: "Ouvrir la portière", at: { x: 0.9, y: 0.55 }, depth: 0.85 }],
  },
  "02-tower-base": {
    ...base,
    id: "02-tower-base",
    title: "Au pied de la tour",
    aspect: 9 / 16,
    pivot: 0.5,
    focus: 0.8,
    aperture: 0.25,
    rain: 0.35,
    reverb: "street",
    ambience: ["amb-street-rain"],
    hotspots: [{ id: "revolving-door", kind: "object", label: "Porte tambour", at: { x: 0.5, y: 0.9 }, depth: 0.95 }],
  },
  "03-lobby": {
    ...base,
    id: "03-lobby",
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
    hotspots: [{ id: "desk", kind: "waypoint", label: "Accueil", at: { x: 0.5, y: 0.78 }, depth: 0.6 }],
  },
  "06a-openspace": {
    ...base,
    id: "06a-openspace",
    title: "L'open space",
    pivot: 0.35,
    focus: 0.3,
    aperture: 0.3,
    flicker: 0.15,
    dust: 0.4,
    shaft: { at: { x: 0.5, y: 0.42 }, strength: 0.65 },
    variants: ["day", "dusk", "night"],
    layers: [{ name: "06a-openspace.layer-plant", depth: 0.97 }],
    reverb: "openspace",
    ambience: ["amb-openspace"],
    sounds: [
      { id: "phone-left", sound: "sfx-desk-phone-ring", at: { x: 0.12, y: 0.55 }, depth: 0.6, volume: 0.5, loop: true },
      { id: "printer", sound: "amb-printer", at: { x: 0.8, y: 0.5 }, depth: 0.45, volume: 0.35, loop: true },
    ],
    hotspots: [{ id: "forward", kind: "waypoint", label: "Avancer", at: { x: 0.5, y: 0.8 }, depth: 0.7 }],
  },
  "06b-openspace": {
    ...base,
    id: "06b-openspace",
    title: "L'open space — plus loin",
    pivot: 0.35,
    focus: 0.25,
    aperture: 0.3,
    dust: 0.4,
    shaft: { at: { x: 0.5, y: 0.42 }, strength: 0.8 },
    variants: ["day", "dusk", "night"],
    reverb: "openspace",
    ambience: ["amb-openspace"],
    hotspots: [{ id: "back", kind: "waypoint", label: "Revenir au hall", at: { x: 0.5, y: 0.82 }, depth: 0.7 }],
  },
} satisfies Record<string, SceneDef>;

export type SceneId = keyof typeof SCENES;

export function getScene(id: SceneId): SceneDef {
  return SCENES[id];
}
