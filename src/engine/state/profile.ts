"use client";
/** Le joueur : identité (badge, plaque), relations, progression de l'arrivée. Sauvegarde locale (mode invité). */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RelationId = "harlow" | "mercer" | "nora" | "theo";

export interface CaseRecord {
  completed: boolean;
  /** Meilleure note obtenue. */
  grade: "S" | "A" | "B" | "C" | null;
  bestScore: number;
  attempts: number;
}

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
  /** Réputation (débloque les rangs), honoraires facturés ($), intégrité (0..100). */
  reputation: number;
  billed: number;
  integrity: number;
  /** Rang dont le bureau a déjà été attribué (le déménagement se joue quand le rang dépasse celui-ci). */
  officeRank: number;
  /** Atouts à usage unique (id → quantité). */
  perks: Record<string, number>;
  /** Messages lus (ids). */
  readMessages: string[];
  /** Leçons débloquées (ids). */
  lessons: string[];
  /** Progression par affaire. */
  cases: Record<string, CaseRecord>;
  /** Tableaux d'enquête : connexions établies et fils tirés à tort. */
  boards: Record<string, { found: string[]; wrong: number }>;
  setIdentity: (firstName: string, lastName: string, avatar: number) => void;
  adjustRelation: (id: RelationId, delta: number) => void;
  setFlag: (key: string, value: string) => void;
  markArrivalSeen: () => void;
  addCareer: (patch: { reputation?: number; billed?: number; integrity?: number }) => void;
  setOfficeRank: (rank: number) => void;
  spendPerk: (id: string) => boolean;
  addPerk: (id: string, n?: number) => void;
  markRead: (id: string) => void;
  unlockLesson: (id: string) => void;
  recordCase: (id: string, grade: "S" | "A" | "B" | "C", score: number) => void;
  startCase: (id: string) => number;
  setBoard: (id: string, found: string[], wrong: number) => void;
  reset: () => void;
}

const initial = {
  firstName: "",
  lastName: "",
  avatar: -1,
  arrivalSeen: false,
  relations: { harlow: 0, mercer: 0, nora: 0, theo: 0 } as Record<RelationId, number>,
  flags: {} as Record<string, string>,
  reputation: 0,
  billed: 0,
  integrity: 100,
  officeRank: 0,
  perks: { "all-nighter": 1, expert: 1 } as Record<string, number>,
  readMessages: [] as string[],
  lessons: ["billable-hour"] as string[],
  cases: {} as Record<string, CaseRecord>,
  boards: {} as Record<string, { found: string[]; wrong: number }>,
};

const GRADE_RANK = { S: 4, A: 3, B: 2, C: 1 } as const;

/** Garde la meilleure note entre deux tentatives. */
export function bestGrade(a: CaseRecord["grade"], b: "S" | "A" | "B" | "C"): "S" | "A" | "B" | "C" {
  if (!a) return b;
  return GRADE_RANK[b] > GRADE_RANK[a] ? b : a;
}

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
      addCareer: (p) =>
        set((s) => ({
          reputation: Math.max(0, s.reputation + (p.reputation ?? 0)),
          billed: Math.max(0, s.billed + (p.billed ?? 0)),
          integrity: Math.max(0, Math.min(100, s.integrity + (p.integrity ?? 0))),
        })),
      setOfficeRank: (officeRank) => set({ officeRank }),
      spendPerk: (id) => {
        let ok = false;
        set((s) => {
          const n = s.perks[id] ?? 0;
          if (n <= 0) return {};
          ok = true;
          return { perks: { ...s.perks, [id]: n - 1 } };
        });
        return ok;
      },
      addPerk: (id, n = 1) => set((s) => ({ perks: { ...s.perks, [id]: (s.perks[id] ?? 0) + n } })),
      markRead: (id) => set((s) => (s.readMessages.includes(id) ? {} : { readMessages: [...s.readMessages, id] })),
      unlockLesson: (id) => set((s) => (s.lessons.includes(id) ? {} : { lessons: [...s.lessons, id] })),
      startCase: (id) => {
        let attempt = 0;
        set((s) => {
          const prev = s.cases[id] ?? { completed: false, grade: null, bestScore: 0, attempts: 0 };
          attempt = prev.attempts;
          return { cases: { ...s.cases, [id]: { ...prev, attempts: prev.attempts + 1 } } };
        });
        return attempt;
      },
      setBoard: (id, found, wrong) => set((s) => ({ boards: { ...s.boards, [id]: { found: [...found], wrong } } })),
      recordCase: (id, grade, score) =>
        set((s) => {
          const prev = s.cases[id] ?? { completed: false, grade: null, bestScore: 0, attempts: 1 };
          return { cases: { ...s.cases, [id]: { ...prev, completed: true, grade: bestGrade(prev.grade, grade), bestScore: Math.max(prev.bestScore, score) } } };
        }),
      reset: () =>
        set({
          ...initial,
          relations: { ...initial.relations },
          flags: {},
          perks: { ...initial.perks },
          readMessages: [],
          lessons: [...initial.lessons],
          cases: {},
        }),
    }),
    {
      name: "bh-profile",
      version: 3,
      // v1 → v2 : carrière, atouts, messages, leçons ; v2 → v3 : progression des affaires.
      migrate: (old) => ({ ...initial, ...(old as object) }) as Profile,
    },
  ),
);
