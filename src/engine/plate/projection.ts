/**
 * Mathématiques de projection 2,5D — partagées entre le shader (GLSL, voir plateShader.ts)
 * et le code JS (positionnement des points de passage / hotspots, son spatialisé).
 *
 * Conventions :
 * - « screen uv » : 0..1, origine en BAS à gauche (convention GL).
 * - « image uv »  : 0..1 dans la texture de la plate, origine en bas à gauche.
 * - Profondeur : 0 = infini (ciel), 1 = contre l'objectif (Depth Anything : blanc = proche).
 * - Les points authorés dans /content le sont en coordonnées « haut-gauche » (x→, y↓), cf. fromAuthoring().
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface ProjectionParams {
  /** Décalage de parallaxe (en uv image) appliqué à la profondeur 1 relativement au pivot. */
  offset: Vec2;
  /** Profondeur qui ne bouge pas avec la parallaxe (plan de pivot). */
  pivot: number;
  /** Poussée de caméra (travelling avant) : 0 = aucune. Les plans proches grossissent plus vite. */
  dolly: number;
  /** Centre de la poussée en uv image. */
  dollyCenter: Vec2;
}

export interface CoverParams {
  /** Facteur d'échelle écran → image (type object-fit: cover + overscan). */
  scale: Vec2;
  /** Panoramique (rotation de tête / travelling latéral ou vertical), en uv image. */
  pan: Vec2;
  /** Roulis en radians, autour du centre de l'écran. */
  roll: number;
  /** Ratio largeur/hauteur de la vue (pour que le roulis ne déforme pas). */
  viewAspect: number;
}

/** Marge de sécurité : on zoome légèrement pour que la parallaxe ne découvre jamais les bords. */
export const DEFAULT_OVERSCAN = 1.1;

/** Portion de la poussée appliquée même au fond (0.35) + part proportionnelle à la profondeur (0.65). */
const DOLLY_BASE = 0.35;
const DOLLY_DEPTH = 0.65;

export function coverScale(viewAspect: number, imageAspect: number, overscan = DEFAULT_OVERSCAN): Vec2 {
  if (viewAspect > imageAspect) {
    // Vue plus large que l'image : la largeur remplit, on rogne en hauteur.
    return { x: 1 / overscan, y: imageAspect / viewAspect / overscan };
  }
  return { x: viewAspect / imageAspect / overscan, y: 1 / overscan };
}

function rotateAround(p: Vec2, angle: number, aspect: number): Vec2 {
  if (angle === 0) return p;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = (p.x - 0.5) * aspect;
  const dy = p.y - 0.5;
  return { x: (dx * c - dy * s) / aspect + 0.5, y: dx * s + dy * c + 0.5 };
}

/** Écran → uv « de base » de l'image (avant parallaxe). */
export function screenToBase(screen: Vec2, cover: CoverParams): Vec2 {
  const r = rotateAround(screen, cover.roll, cover.viewAspect);
  return {
    x: (r.x - 0.5) * cover.scale.x + 0.5 + cover.pan.x,
    y: (r.y - 0.5) * cover.scale.y + 0.5 + cover.pan.y,
  };
}

export function baseToScreen(base: Vec2, cover: CoverParams): Vec2 {
  const r = {
    x: (base.x - cover.pan.x - 0.5) / cover.scale.x + 0.5,
    y: (base.y - cover.pan.y - 0.5) / cover.scale.y + 0.5,
  };
  return rotateAround(r, -cover.roll, cover.viewAspect);
}

export function dollyScale(dolly: number, depth: number): number {
  return 1 + dolly * (DOLLY_BASE + DOLLY_DEPTH * depth);
}

/** uv de base → uv échantillonnée pour une surface située à la profondeur `depth`. */
export function project(base: Vec2, depth: number, p: ProjectionParams): Vec2 {
  const s = dollyScale(p.dolly, depth);
  return {
    x: p.dollyCenter.x + (base.x - p.dollyCenter.x) / s + p.offset.x * (depth - p.pivot),
    y: p.dollyCenter.y + (base.y - p.dollyCenter.y) / s + p.offset.y * (depth - p.pivot),
  };
}

/** Inverse de project() pour une profondeur donnée (la projection est affine à profondeur fixe). */
export function unproject(imageUv: Vec2, depth: number, p: ProjectionParams): Vec2 {
  const s = dollyScale(p.dolly, depth);
  return {
    x: p.dollyCenter.x + (imageUv.x - p.offset.x * (depth - p.pivot) - p.dollyCenter.x) * s,
    y: p.dollyCenter.y + (imageUv.y - p.offset.y * (depth - p.pivot) - p.dollyCenter.y) * s,
  };
}

/** Où apparaît à l'écran un point de l'image situé à une profondeur donnée ? */
export function imageToScreen(imageUv: Vec2, depth: number, p: ProjectionParams, cover: CoverParams): Vec2 {
  return baseToScreen(unproject(imageUv, depth, p), cover);
}

/** Coordonnées authorées (x→ depuis la gauche, y↓ depuis le haut) → uv image GL. */
export function fromAuthoring(p: Vec2): Vec2 {
  return { x: p.x, y: 1 - p.y };
}

/** uv écran GL → pixels CSS (origine en haut à gauche). */
export function screenToCss(screen: Vec2, width: number, height: number): Vec2 {
  return { x: screen.x * width, y: (1 - screen.y) * height };
}
