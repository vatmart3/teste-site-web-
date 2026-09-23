/** Modèle de données du mini-jeu « tableau d'enquête » (réutilisable par d'autres affaires). */

export type PieceKind = "document" | "photo" | "quote" | "note";

export interface BoardPiece {
  id: string;
  kind: PieceKind;
  /** Titre court (en capitales sur la carte). */
  title: string;
  /** Contenu lisible sur la carte (2 à 4 lignes). */
  lines: string[];
  /** Source ou date, en petit. */
  source: string;
  /** Position sur le liège (fractions 0..1 du panneau, depuis le haut à gauche) et rotation (radians). */
  at: { x: number; y: number };
  rot: number;
  /** Pièce trouvée pendant l'affaire 1 (indice lumineux si l'anomalie a été relevée). */
  fromAnomaly?: string;
}

export interface BoardLink {
  id: string;
  /** Les deux pièces reliées (ordre indifférent). */
  a: string;
  b: string;
  /** Ce que la connexion révèle (fiche bristol épinglée sur le fil). */
  title: string;
  insight: string;
  /** Contradiction utilisable au tribunal (id de pièce à présenter) ; null = connexion utile mais pas une contradiction. */
  courtEvidence: string | null;
  weight: number;
  lesson?: string;
}

export interface BoardDef {
  id: string;
  title: string;
  pieces: BoardPiece[];
  links: BoardLink[];
  /** Connexions requises avant de pouvoir partir au tribunal. */
  required: number;
}

export interface BoardResult {
  found: string[];
  wrong: number;
  score: number;
}
