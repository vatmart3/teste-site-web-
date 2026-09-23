/**
 * Carrière : rangs (Stagiaire → Associé-gérant) débloqués par la réputation, et bureau correspondant.
 */
export type RankId = "intern" | "associate" | "senior" | "partner" | "managing";

export interface RankDef {
  id: RankId;
  title: string;
  /** Titre sur la plaque de porte. */
  plaque: string;
  minReputation: number;
  /** Plan du bureau (voir scenes.ts). */
  office: "08-desk-intern-night" | "08-desk-associate" | "08-desk-senior" | "08-desk-partner";
}

export const RANKS: RankDef[] = [
  { id: "intern", title: "Stagiaire", plaque: "Stagiaire", minReputation: 0, office: "08-desk-intern-night" },
  { id: "associate", title: "Collaborateur", plaque: "Collaborateur", minReputation: 100, office: "08-desk-associate" },
  { id: "senior", title: "Collaborateur senior", plaque: "Collaborateur senior", minReputation: 300, office: "08-desk-senior" },
  { id: "partner", title: "Associé", plaque: "Associé", minReputation: 700, office: "08-desk-partner" },
  { id: "managing", title: "Associé-gérant", plaque: "Associé-gérant", minReputation: 1500, office: "08-desk-partner" },
];

export function rankIndexFor(reputation: number): number {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (reputation >= r.minReputation) idx = i;
  });
  return idx;
}

export function rankFor(reputation: number): RankDef {
  return RANKS[rankIndexFor(reputation)]!;
}

/** Progression vers le rang suivant (0..1) et réputation manquante ; null au dernier rang. */
export function nextRankProgress(reputation: number): { next: RankDef; progress: number; missing: number } | null {
  const i = rankIndexFor(reputation);
  const next = RANKS[i + 1];
  if (!next) return null;
  const cur = RANKS[i]!;
  const span = next.minReputation - cur.minReputation;
  return { next, progress: Math.max(0, Math.min(1, (reputation - cur.minReputation) / span)), missing: next.minReputation - reputation };
}

/** Honoraires en dollars, format « 12 450 $ ». */
export function formatDollars(v: number): string {
  return `${Math.round(v).toLocaleString("fr-FR").replace(/ | /g, " ")} $`;
}
