"use client";
/** Le joueur : identité (badge, plaque), relations, progression de l'arrivée. Sauvegarde locale (mode invité). */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RelationId = "harlow" | "mercer" | "nora" | "theo";

export interface Profile {
  firstName: string;
  lastName: string;
  /** Portrait choisi (0 à 5) ou -1 = silhouette. */
  avatar: number;
  /** La séquence d'arrivée a été vue une fois (elle devient sautable). */
  arrivalSeen: boolean;
  /** −100 (hostile) … +100 (allié). */
  relations: Record<RelationId, number>;
  /** Choix narratifs marquants (id → valeur), relus par les scènes suivantes. */
  flags: Record<string, string>;
  setIdentity: (firstName: string, lastName: string, avatar: number) => void;
  adjustRelation: (id: RelationId, delta: number) => void;
  setFlag: (key: string, value: string) => void;
  markArrivalSeen: () => void;
  reset: () => void;
}

const initial = {
  firstName: "",
  lastName: "",
  avatar: -1,
  arrivalSeen: false,
  relations: { harlow: 0, mercer: 0, nora: 0, theo: 0 } as Record<RelationId, number>,
  flags: {} as Record<string, string>,
};

export function clampRelation(v: number): number {
  return Math.max(-100, Math.min(100, Math.round(v)));
}

/** Normalise une saisie de nom : espaces superflus, majuscule initiale, longueur bornée. */
export function normalizeName(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{M}' -]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24)
    .replace(/(^|[ '-])(\p{L})/gu, (_m, sep: string, c: string) => sep + c.toUpperCase());
}

export function displayName(p: Pick<Profile, "firstName" | "lastName">): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

export const useProfile = create<Profile>()(
  persist(
    (set) => ({
      ...initial,
      setIdentity: (firstName, lastName, avatar) => set({ firstName: normalizeName(firstName), lastName: normalizeName(lastName), avatar }),
      adjustRelation: (id, delta) => set((s) => ({ relations: { ...s.relations, [id]: clampRelation(s.relations[id] + delta) } })),
      setFlag: (key, value) => set((s) => ({ flags: { ...s.flags, [key]: value } })),
      markArrivalSeen: () => set({ arrivalSeen: true }),
      reset: () => set({ ...initial, relations: { ...initial.relations }, flags: {} }),
    }),
    { name: "bh-profile", version: 1 },
  ),
);
