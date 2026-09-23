"use client";
/**
 * Accessoires 3D (téléphone, badge, chemise de dossier) : modèles mutables animés par le directeur
 * (GSAP) et lus à chaque frame par les composants R3F. Repère caméra : œil à l'origine, regard vers −z,
 * y vers le haut, unités ≈ mètres.
 */
import { create } from "zustand";

export interface Transform {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
  /** 0..1, fondu d'apparition. */
  opacity: number;
}

const t = (x: number, y: number, z: number): Transform => ({ x, y, z, rx: 0, ry: 0, rz: 0, scale: 1, opacity: 1 });

export type PhoneScreen =
  | { mode: "off" }
  | { mode: "lock"; time: string; date: string; sms?: { from: string; text: string } }
  | { mode: "voicemail"; from: string; duration: number };

export const phone = { ...t(0.02, -0.55, -0.75), vibrate: 0, progress: 0 };
export const badge = { ...t(0, -0.6, -0.8), glow: 0, float: 0 };
export const folder = { ...t(0.05, -0.42, -2.4), cover: 0, fan: 0, float: 0 };

/** Position écran (px CSS) des accessoires, pour y accrocher des hotspots HTML accessibles. */
export const propAnchors: Record<string, { x: number; y: number; visible: boolean }> = {
  phone: { x: 0, y: 0, visible: false },
  badge: { x: 0, y: 0, visible: false },
  folder: { x: 0, y: 0, visible: false },
};

export const PROP_LABELS: Record<string, string> = {
  "prop:folder": "Attraper le dossier",
  "prop:badge": "Prendre le badge",
  "prop:phone": "Lire le message",
};

interface PropsState {
  phone: boolean;
  badge: boolean;
  folder: boolean;
  phoneScreen: PhoneScreen;
  /** Le badge peut être saisi et glissé sur le lecteur. */
  badgeDraggable: boolean;
  set: (patch: Partial<Omit<PropsState, "set">>) => void;
}

export const useProps = create<PropsState>()((set) => ({
  phone: false,
  badge: false,
  folder: false,
  phoneScreen: { mode: "off" },
  badgeDraggable: false,
  set: (patch) => set(patch),
}));

export function resetTransform(target: Transform, x: number, y: number, z: number): void {
  Object.assign(target, t(x, y, z));
}

/** Demi-hauteur visible à la distance `dist` pour un champ vertical `fovDeg`. */
export function halfHeightAt(dist: number, fovDeg: number): number {
  return Math.tan(((fovDeg / 2) * Math.PI) / 180) * dist;
}

/** Point écran (uv GL 0..1) → point du repère caméra à la profondeur z (négative). */
export function screenToCamera(u: number, v: number, z: number, fovDeg: number, aspect: number): { x: number; y: number } {
  const hh = halfHeightAt(-z, fovDeg);
  return { x: (u * 2 - 1) * hh * aspect, y: (v * 2 - 1) * hh };
}

export function cameraToScreen(x: number, y: number, z: number, fovDeg: number, aspect: number): { u: number; v: number } {
  const hh = halfHeightAt(-z, fovDeg);
  return { u: (x / (hh * aspect) + 1) / 2, v: (y / hh + 1) / 2 };
}

export const PROP_FOV = 40;

/** Inclinaison de la caméra des objets 3D (0 pendant l'arrivée, vers le plateau dans le bureau). */
export const propCamera = { pitch: 0 };
