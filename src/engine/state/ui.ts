"use client";
import { create } from "zustand";

export interface Subtitle {
  id: number;
  speaker?: string;
  text: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  hint?: string;
}

/** Panneau d'interaction qui attend une réponse du joueur. */
export type Panel =
  | { kind: "identity" }
  | { kind: "choice"; prompt?: string; options: ChoiceOption[] }
  | { kind: "swipe"; label: string };

export interface UiState {
  panel: Panel | null;
  letterbox: boolean;
  subtitle: Subtitle | null;
  /** Hotspots cliquables actuellement proposés (ids du plan courant). */
  activeHotspots: string[];
  /** Consigne discrète en bas d'écran (« Cliquez sur la porte »). */
  prompt: string | null;
  /** Une cinématique sautable est en cours. */
  skippable: boolean;
  /** Fondu au noir de l'interface (utilisé aussi par le fallback CSS). */
  blackout: number;
  /** Niveau de rendu effectif (le mode CSS n'a pas d'objets 3D). */
  quality: "high" | "medium" | "css" | null;
  set: (patch: Partial<Omit<UiState, "set">>) => void;
}

export const useUi = create<UiState>()((set) => ({
  panel: null,
  letterbox: false,
  subtitle: null,
  activeHotspots: [],
  prompt: null,
  skippable: false,
  blackout: 0,
  quality: null,
  set: (patch) => set(patch),
}));
