/**
 * La « caméra » 2,5D : un objet mutable (hors React, pour ne pas re-rendre à 60 fps)
 * que GSAP anime et que les plates / hotspots / le son lisent à chaque frame.
 */
import type { Vec2 } from "../plate/projection";

export interface CameraRig {
  // --- Pilotés par les timelines (GSAP) ---
  /** Panoramique scénarisé en uv image (travelling vertical sur une plate haute, etc.). */
  panX: number;
  panY: number;
  /** Poussée avant (0 = aucune). */
  dolly: number;
  /** Centre de la poussée, coordonnées authorées (0..1, y vers le bas). */
  dollyX: number;
  dollyY: number;
  /** Roulis en degrés. */
  roll: number;
  /** Montée d'ascenseur : décale les plans lointains vers le bas (uv image). */
  lift: number;
  /** Profondeur de mise au point (0 = infini, 1 = objectif). */
  focus: number;
  /** Ouverture : intensité du flou hors mise au point (0 = tout net). */
  aperture: number;
  /** Secousse (0..1), décroît naturellement si `shakeDecay` > 0. */
  shake: number;
  shakeDecay: number;
  /** Exposition globale (fondus au noir, flash). */
  exposure: number;
  /** Multiplicateur de l'amplitude de parallaxe à la souris (0 pendant certains plans). */
  lookAmount: number;

  // --- Entrée utilisateur (souris / doigt / gyroscope) ---
  targetX: number;
  targetY: number;
  lookX: number;
  lookY: number;

  // --- Réglages ---
  /** Translation max (±3 % de l'image à la profondeur 1). */
  parallaxAmplitude: number;
  /** Rotation de tête max traduite en panoramique (≈ ±6°). */
  rotationAmplitude: number;
  reducedMotion: boolean;

  // --- Calculé à chaque frame ---
  offset: Vec2;
  pan: Vec2;
  time: number;
}

export function createRig(): CameraRig {
  return {
    panX: 0,
    panY: 0,
    dolly: 0,
    dollyX: 0.5,
    dollyY: 0.5,
    roll: 0,
    lift: 0,
    focus: 0.5,
    aperture: 0,
    shake: 0,
    shakeDecay: 1.6,
    exposure: 1,
    lookAmount: 1,
    targetX: 0,
    targetY: 0,
    lookX: 0,
    lookY: 0,
    parallaxAmplitude: 0.03,
    rotationAmplitude: 0.012,
    reducedMotion: false,
    offset: { x: 0, y: 0 },
    pan: { x: 0, y: 0 },
    time: 0,
  };
}

/** Caméra partagée par tout le jeu. */
export const rig: CameraRig = createRig();

/** Remet la caméra à l'état neutre (utile entre deux plans ou quand on saute une cinématique). */
export function resetRig(r: CameraRig = rig): void {
  const fresh = createRig();
  r.panX = fresh.panX;
  r.panY = fresh.panY;
  r.dolly = fresh.dolly;
  r.dollyX = fresh.dollyX;
  r.dollyY = fresh.dollyY;
  r.roll = fresh.roll;
  r.lift = 0;
  r.focus = fresh.focus;
  r.aperture = fresh.aperture;
  r.shake = 0;
  r.exposure = 1;
  r.lookAmount = 1;
}

// Bruit lissé 1D bon marché pour la secousse (somme de sinus incommensurables).
function wobble(t: number, seed: number): number {
  return (
    Math.sin(t * 13.1 + seed) * 0.5 + Math.sin(t * 29.7 + seed * 2.3) * 0.3 + Math.sin(t * 57.3 + seed * 4.1) * 0.2
  );
}

/**
 * Avance la caméra d'un pas de temps : lissage critique du regard, secousse, calcul des offsets.
 * Fonction pure sur l'objet rig (testable).
 */
export function stepRig(r: CameraRig, dt: number): void {
  r.time += dt;
  const motion = r.reducedMotion ? 0 : 1;
  // Lissage exponentiel indépendant du framerate (~ ressort amorti, t½ ≈ 0,25 s).
  const k = 1 - Math.exp(-dt * 3.2);
  r.lookX += (r.targetX * r.lookAmount * motion - r.lookX) * k;
  r.lookY += (r.targetY * r.lookAmount * motion - r.lookY) * k;

  // Micro-respiration de la caméra portée (quasi imperceptible, donne de la vie).
  const breathe = motion * 0.12;
  const bx = Math.sin(r.time * 0.31) * breathe;
  const by = Math.sin(r.time * 0.23 + 1.3) * breathe;

  let sx = 0;
  let sy = 0;
  if (r.shake > 0.0001 && motion) {
    const a = r.shake * r.shake * 0.02;
    sx = wobble(r.time, 1.7) * a;
    sy = wobble(r.time, 5.3) * a;
  }
  if (r.shakeDecay > 0) r.shake = Math.max(0, r.shake - dt * r.shakeDecay * Math.max(r.shake, 0.2));

  const lx = r.lookX + bx;
  const ly = r.lookY + by;
  // Souris à droite → on « regarde » à droite : les plans proches glissent vers la gauche.
  r.offset.x = lx * r.parallaxAmplitude + sx;
  r.offset.y = ly * r.parallaxAmplitude + sy;
  r.pan.x = r.panX + lx * r.rotationAmplitude + sx * 0.5;
  r.pan.y = r.panY + ly * r.rotationAmplitude + sy * 0.5;
}

/** Position normalisée (-1..1, y vers le haut) depuis un événement pointeur. */
export function pointerToLook(clientX: number, clientY: number, width: number, height: number): Vec2 {
  const x = (clientX / Math.max(1, width)) * 2 - 1;
  const y = 1 - (clientY / Math.max(1, height)) * 2;
  return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
}
