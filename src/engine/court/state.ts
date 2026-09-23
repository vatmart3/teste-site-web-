"use client";
/** État du tribunal (affaire 2) : phase, jauges, pièces en main, fenêtre d'objection, interactions en cours. */
import { create } from "zustand";
import type { CourtGauges, ObjectionGround } from "./types";
import { START_GAUGES } from "./rules";

export type CourtPhase = "off" | "direct" | "cross" | "verdict";

export interface CourtState {
  phase: CourtPhase;
  gauges: CourtGauges;
  /** Pièces présentables (établies sur le tableau d'enquête + pièces de base). */
  pieces: string[];
  /** Pièces de contradiction manquées sur le tableau (affichées grisées). */
  missing: string[];
  /** Pièces déjà opposées au témoin. */
  used: string[];
  /** Le bouton OBJECTION est proposé (Brandt parle). */
  objectionOpen: boolean;
  /** L'éventail des pièces est ouvert : glisser une carte vers le témoin. */
  presenting: boolean;
  /** Choix du motif après un « Objection ! ». */
  choosingGround: boolean;
  /** HUD visible (jauges). */
  hud: boolean;
  /** Tampon plein écran (CONTRADICTION, RETENUE…). */
  stamp: { text: string; tone: "red" | "brass" | "grey"; id: number } | null;
  set: (patch: Partial<Omit<CourtState, "set">>) => void;
}

export const useCourt = create<CourtState>()((set) => ({
  phase: "off",
  gauges: START_GAUGES,
  pieces: [],
  missing: [],
  used: [],
  objectionOpen: false,
  presenting: false,
  choosingGround: false,
  hud: false,
  stamp: null,
  set: (patch) => set(patch),
}));

export type CourtInput =
  | { type: "objection" }
  | { type: "ground"; ground: ObjectionGround | null }
  | { type: "present"; piece: string }
  | { type: "pass" };

type Handler = (e: CourtInput) => void;
const handlers = new Set<Handler>();
export const courtBus = {
  emit: (e: CourtInput) => {
    for (const h of [...handlers]) h(e);
  },
  on: (h: Handler) => {
    handlers.add(h);
    return () => {
      handlers.delete(h);
    };
  },
};

/** Progression (0..1) de la réplique en cours d'affichage : sert à juger le timing de l'objection. */
export const lineProgress = { value: 0 };
