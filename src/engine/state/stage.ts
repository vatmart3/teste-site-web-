"use client";
import { create } from "zustand";
import type { SceneId } from "@/content/scenes";
import type { LightVariant } from "@/content/types";

export type Transition = "cut" | "fade" | "depth" | "doors";

export interface PlateInstance {
  key: number;
  sceneId: SceneId;
  variant?: LightVariant;
  transition: Transition;
}

export interface StageState {
  plates: PlateInstance[];
  /** Plan au premier plan (le dernier ajouté). */
  current: PlateInstance | null;
  push: (p: Omit<PlateInstance, "key">) => PlateInstance;
  /** Ne garde que la plate indiquée (appelé à la fin d'une transition). */
  settle: (key: number) => void;
}

let nextKey = 1;

export const useStage = create<StageState>()((set) => ({
  plates: [],
  current: null,
  push: (p) => {
    const inst = { ...p, key: nextKey++ };
    set((s) => ({ plates: [...s.plates, inst], current: inst }));
    return inst;
  },
  settle: (key) => set((s) => ({ plates: s.plates.filter((p) => p.key === key) })),
}));
