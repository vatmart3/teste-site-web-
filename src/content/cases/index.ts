/**
 * Saison 1 « L'affaire Meridian » : fiches des 6 affaires (le contenu jouable arrive en phase 4+).
 * Les 3 premières sont gratuites ; 4 à 6 sont visibles mais « sous scellés ».
 */
export type CaseGrade = "S" | "A" | "B" | "C";

export interface CaseMeta {
  id: string;
  number: number;
  title: string;
  kind: string;
  summary: string;
  /** Couleur de l'onglet de la chemise. */
  tab: string;
  free: boolean;
  /** Dans quelle livraison l'affaire devient jouable (affiché honnêtement tant qu'elle ne l'est pas). */
  availableInPhase: number;
}

export const CASES: CaseMeta[] = [
  {
    id: "midnight-audit",
    number: 1,
    title: "L'audit de minuit",
    kind: "Audit forensique",
    summary: "Une nuit, une lampe verte et les états financiers de Meridian. Trouver ce que les chiffres cachent avant 8 heures.",
    tab: "#b8322a",
    free: true,
    availableInPhase: 4,
  },
  {
    id: "cross-examination",
    number: 2,
    title: "Le contre-interrogatoire",
    kind: "Tribunal",
    summary: "Daniel Rourke, directeur financier, à la barre. Chaque contradiction compte, chaque objection se joue à la seconde.",
    tab: "#2f5d8a",
    free: true,
    availableInPhase: 5,
  },
  {
    id: "final-number",
    number: 3,
    title: "Le chiffre final",
    kind: "Négociation",
    summary: "Celia Brandt, salle de conférence, coucher de soleil. Trente millions au minimum, et chaque silence a un prix.",
    tab: "#c9a24a",
    free: true,
    availableInPhase: 6,
  },
  {
    id: "hostile-takeover",
    number: 4,
    title: "OPA hostile",
    kind: "Fusions-acquisitions",
    summary: "Quelqu'un rachète Meridian en secret. Qui, et avec quel argent ?",
    tab: "#4a6b3a",
    free: false,
    availableInPhase: 7,
  },
  {
    id: "carousel",
    number: 5,
    title: "Le carrousel",
    kind: "Fraude à la TVA",
    summary: "Des camions qui traversent l'Atlantique sans jamais bouger. Une fraude intracommunautaire en boucle.",
    tab: "#6b3a5a",
    free: false,
    availableInPhase: 7,
  },
  {
    id: "verdict",
    number: 6,
    title: "Le verdict",
    kind: "Plaidoirie devant jury",
    summary: "Douze jurés, une pièce obtenue illégalement, et une décision qui vous suivra toute votre carrière.",
    tab: "#1f1f24",
    free: false,
    availableInPhase: 7,
  },
];

export interface CaseProgress {
  grade: CaseGrade | null;
  completed: boolean;
}

/** État affiché d'une affaire dans la pile de chemises. */
export function caseStatus(meta: CaseMeta, progress: CaseProgress | undefined, owned: boolean, currentPhase: number): "completed" | "available" | "soon" | "sealed" {
  if (progress?.completed) return "completed";
  if (!meta.free && !owned) return "sealed";
  if (meta.availableInPhase > currentPhase) return "soon";
  return "available";
}

/** Livraison actuelle du jeu (sert à afficher « bientôt » honnêtement). */
export const CURRENT_PHASE = 5;
