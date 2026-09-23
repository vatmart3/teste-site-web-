"use client";
/** État du tableau d'enquête interactif (dans le bureau, sur le liège 3D). */
import { create } from "zustand";
import type { BoardDef } from "./types";

export interface BoardState {
  active: boolean;
  def: BoardDef | null;
  /** Connexions justes établies (ids). */
  found: string[];
  /** Fils tirés à tort. */
  wrong: number;
  /** Pièce de départ choisie au clavier (accessibilité), ou pendant un tirage de fil. */
  selected: string | null;
  /** Dernier message (« Ça ne tient pas », titre de la connexion…). */
  toast: { text: string; good: boolean; id: number } | null;
  set: (patch: Partial<Omit<BoardState, "set">>) => void;
}

export const useBoard = create<BoardState>()((set) => ({
  active: false,
  def: null,
  found: [],
  wrong: 0,
  selected: null,
  toast: null,
  set: (patch) => set(patch),
}));

export type BoardInput = { type: "connect"; a: string; b: string } | { type: "done" };

type Handler = (e: BoardInput) => void;
const handlers = new Set<Handler>();
export const boardBus = {
  emit: (e: BoardInput) => {
    for (const h of [...handlers]) h(e);
  },
  on: (h: Handler) => {
    handlers.add(h);
    return () => {
      handlers.delete(h);
    };
  },
};

/** Surface de liège (repère monde du bureau) : centre, taille, plan z. */
export const BOARD_CORK = { cx: -0.48, cy: 0.16, w: 0.94, h: 0.6, z: -2.0 + 0.02 + 0.024 } as const;

/** Position (monde) d'une pièce à partir de ses fractions sur le liège. */
export function pieceWorld(at: { x: number; y: number }): [number, number, number] {
  return [BOARD_CORK.cx - BOARD_CORK.w / 2 + at.x * BOARD_CORK.w, BOARD_CORK.cy + BOARD_CORK.h / 2 - at.y * BOARD_CORK.h, BOARD_CORK.z];
}

/** Effets de la dernière connexion (lus par la scène 3D : fil qui se tend, éclair). */
export const boardFx = { flash: 0, lastLink: "" as string, lastWrong: { a: "", b: "", t: 0 } };
