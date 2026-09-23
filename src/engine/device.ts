/** Détection des capacités de l'appareil → niveau de qualité du rendu. */
import type { MotionSetting, QualitySetting } from "./state/settings";

export type Quality = "high" | "medium" | "css";

export function hasWebGL2(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return Math.min(window.innerWidth, window.innerHeight) < 820 || matchMedia("(pointer: coarse)").matches;
}

export function detectQuality(): Quality {
  if (!hasWebGL2()) return "css";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  if (mem <= 2 || cores <= 2) return "css";
  if (isMobileViewport() || mem <= 4 || cores <= 4) return "medium";
  return "high";
}

export function resolveQuality(setting: QualitySetting): Quality {
  return setting === "auto" ? detectQuality() : setting;
}

export function prefersReducedMotion(setting: MotionSetting): boolean {
  if (setting === "reduced") return true;
  if (setting === "full") return false;
  return typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
