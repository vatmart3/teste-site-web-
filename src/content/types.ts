import type { Vec2 } from "@/engine/plate/projection";
import type { CharacterId } from "./characters";

export type LightVariant = "day" | "dusk" | "night";

export type ReverbPreset = "none" | "car" | "street" | "marble" | "elevator" | "office" | "openspace" | "court" | "conference";

/** Source sonore positionnée dans la plate (coordonnées authorées : x→, y↓, profondeur 0..1). */
export interface SpatialSoundDef {
  id: string;
  /** Nom du fichier dans /public/audio (sans extension), cf. annexe C. */
  sound: string;
  at: Vec2;
  depth: number;
  volume?: number;
  loop?: boolean;
}

export interface HotspotDef {
  id: string;
  kind: "waypoint" | "object";
  label: string;
  /** Position authorée (x→, y↓) dans l'image. */
  at: Vec2;
  depth: number;
}

export interface PlateLayerDef {
  /** Fichier PNG détouré de même dimension que la plate (ex. `06a-openspace.layer-plant.png`). */
  name: string;
  depth: number;
  /** Attaché à la caméra (cabine d'ascenseur…) : ignore panoramique et montée. Calque en 16:9. */
  locked?: boolean;
}

/** Personnage présent dans le plan : zone animée (respiration, tête) + vidéos d'états éventuelles. */
export interface SceneCharacterDef {
  id: CharacterId;
  /** Centre de la tête / du buste (coordonnées authorées). */
  at: Vec2;
  depth: number;
  /** Rayon de la zone animée, en hauteur d'image. */
  radius: number;
}

export type AnchorKind = "floor-counter" | "wall-clock" | "reader-light" | "desk-clock";

/** Élément d'interface HTML accroché à un point de la plate (compteur d'étages, horloge…). */
export interface AnchorDef {
  id: string;
  kind: AnchorKind;
  at: Vec2;
  depth: number;
  /** Taille en fraction de la hauteur d'écran. */
  size: number;
  /** Accroché à un calque « locked » (cabine) plutôt qu'au décor. */
  locked?: boolean;
}

export interface SceneDef {
  id: string;
  title: string;
  /** Ratio largeur/hauteur de la plate (16/9 par défaut, plus petit pour une plate « très haute »). */
  aspect: number;
  /** Profondeur qui reste immobile pendant la parallaxe. */
  pivot: number;
  /** Multiplicateur d'amplitude de parallaxe propre au plan. */
  parallax: number;
  /** Mise au point par défaut. */
  focus: number;
  aperture: number;
  /** Boucle vidéo image-to-video disponible (WebM + MP4). */
  video?: boolean;
  layers?: PlateLayerDef[];
  variants?: LightVariant[];
  /** Effets de shader. */
  rain?: number;
  fog?: number;
  flicker?: number;
  /** Rayon de lumière (god rays) : position authorée + intensité. */
  shaft?: { at: Vec2; strength: number };
  /** Particules de poussière dans les faisceaux. */
  dust?: number;
  /** Essuie-glaces sur la pluie (taxi). */
  wipers?: boolean;
  /** Pluie qui tombe vers la caméra : intensité + point de fuite (coordonnées authorées). */
  rainStreaks?: { amount: number; from: Vec2 };
  character?: SceneCharacterDef;
  anchors?: AnchorDef[];
  reverb: ReverbPreset;
  ambience: string[];
  sounds?: SpatialSoundDef[];
  hotspots?: HotspotDef[];
}
