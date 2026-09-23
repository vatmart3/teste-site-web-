"use client";
/** Ce que la scène WebGL affiche en ce moment (pièce 3D ou plate 2,5D). */
import { create } from "zustand";
import type { RoomKind } from "@/content/types";

export interface RenderState {
  /** Pièce entièrement en 3D affichée (quand aucune vraie plate n'existe pour ce plan). */
  room: RoomKind | null;
  set: (patch: Partial<Omit<RenderState, "set">>) => void;
}

export const useRender = create<RenderState>()((set) => ({
  room: null,
  set: (patch) => set(patch),
}));
