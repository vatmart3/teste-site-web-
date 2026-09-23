"use client";
/** Ce que la scène WebGL affiche en ce moment (pièce 3D ou plate 2,5D). */
import { create } from "zustand";
import type { RoomKind } from "@/content/types";

export interface RenderState {
  /** Pièce entièrement en 3D affichée (quand aucune vraie plate n'existe pour ce plan). */
  room: RoomKind | null;
  /** Position de caméra dans la pièce (la caméra y glisse quand elle change). */
  station: string;
  variant: "day" | "dusk" | "night";
  /** Durée (s) du glissement de caméra vers la nouvelle station (0 = coupe franche). */
  glide: number;
  /** Caméra de la pièce figée (une plate est en train de se révéler par-dessus). */
  frozen: boolean;
  set: (patch: Partial<Omit<RenderState, "set">>) => void;
}

export const useRender = create<RenderState>()((set) => ({
  room: null,
  station: "",
  variant: "night",
  glide: 0,
  frozen: false,
  set: (patch) => set(patch),
}));
