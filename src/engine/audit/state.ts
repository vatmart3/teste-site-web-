"use client";
/** État de l'audit en cours (documents, outil, marques, heure du jeu). */
import { create } from "zustand";
import type { AuditCaseDef, AuditMark } from "./types";

export type AuditTool = "hand" | "highlighter" | "loupe";

export interface AuditState {
  active: boolean;
  def: AuditCaseDef | null;
  variantKey: string;
  /** Document tenu en main (null = tous sur le bureau). */
  reading: string | null;
  /** Page affichée de chaque document agrafé. */
  pages: Record<string, number>;
  tool: AuditTool;
  zoom: number;
  marks: AuditMark[];
  /** Heure du jeu (minutes depuis minuit, peut dépasser 24 h) et heure limite. */
  minutes: number;
  deadline: number;
  running: boolean;
  /** Anomalies révélées par l'expert, et lignes entourées au crayon rouge. */
  assisted: string[];
  hints: string[];
  /** Ligne surlignée qui attend sa qualification (post-it). */
  pending: { docId: string; lineId: string } | null;
  set: (patch: Partial<Omit<AuditState, "set">>) => void;
}

export const useAudit = create<AuditState>()((set) => ({
  active: false,
  def: null,
  variantKey: "0",
  reading: null,
  pages: {},
  tool: "hand",
  zoom: 1,
  marks: [],
  minutes: 0,
  deadline: 0,
  running: false,
  assisted: [],
  hints: [],
  pending: null,
  set: (patch) => set(patch),
}));

export type AuditEvent =
  | { type: "highlight"; docId: string; lineId: string }
  | { type: "perk"; id: "all-nighter" | "expert" }
  | { type: "submit" }
  | { type: "timeup" }
  | { type: "cue"; id: "coffee" | "hour" };

type Handler = (e: AuditEvent) => void;
const handlers = new Set<Handler>();
export const auditBus = {
  emit: (e: AuditEvent) => {
    for (const h of [...handlers]) h(e);
  },
  on: (h: Handler) => {
    handlers.add(h);
    return () => {
      handlers.delete(h);
    };
  },
};

/** Heure du jeu → « 3 h 07 ». */
export function formatGameTime(minutes: number): string {
  const m = Math.floor(minutes) % (24 * 60);
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}
