/** Modèle de données du contre-interrogatoire (tribunal) : témoignage, questions, objections, pièces. */
import type { CharacterState } from "@/content/characters";

/** Motifs d'objection proposés au joueur (Federal Rules of Evidence, vulgarisés). */
export type ObjectionGround = "leading" | "hearsay" | "speculation" | "argumentative" | "relevance";

export const GROUND_LABELS: Record<ObjectionGround, string> = {
  leading: "Question suggestive",
  hearsay: "Ouï-dire",
  speculation: "Spéculation",
  argumentative: "Question tendancieuse",
  relevance: "Hors sujet",
};

/** Réplique de l'interrogatoire principal (Brandt interroge son témoin). */
export interface DirectLine {
  id: string;
  speaker: "brandt" | "rourke" | "whitford";
  text: string;
  state?: CharacterState;
  /** Passage contestable : motif juste, et fenêtre de temps (fraction 0..1 du texte affiché). */
  objection?: { ground: ObjectionGround; from: number; to: number; why: string };
}

export type QuestionStyle = "precise" | "open" | "aggressive";

export interface QuestionCard {
  id: string;
  label: string;
  style: QuestionStyle;
}

export interface Topic {
  id: string;
  /** Titre de la fiche (éventail des sujets). */
  title: string;
  questions: QuestionCard[];
  /** Réponse de Rourke : l'affirmation à contredire. */
  claim: string;
  /** Pièce qui la contredit (null : affirmation vraie, rien à opposer). */
  contradictedBy: string | null;
  /** Rourke confronté à la pièce. */
  rebuttal: string;
  /** Ce que la contradiction établit (tampon, jury). */
  finding: string;
  pressure: number;
}

export interface CourtPiece {
  id: string;
  title: string;
  detail: string;
}

export interface CourtCaseDef {
  id: string;
  title: string;
  hourlyRate: number;
  /** Durée facturée de l'audience (heures) si tout va bien. */
  hearingHours: number;
  direct: DirectLine[];
  topics: Topic[];
  pieces: CourtPiece[];
  /** Pression à partir de laquelle Rourke craque. */
  breakAt: number;
}

export interface CourtGauges {
  /** Pression sur le témoin (0..100) : la caméra se rapproche, les micro-signes apparaissent. */
  pressure: number;
  /** Patience de la juge (0..100) : à 0, elle met fin au contre-interrogatoire. */
  patience: number;
  /** Conviction du jury (0..100). */
  jury: number;
}

export type CourtEvent =
  | { type: "question"; topic: string; style: QuestionStyle }
  | { type: "contradiction"; topic: string; piece: string }
  | { type: "wrong-piece"; topic: string; piece: string }
  | { type: "objection"; line: string; ground: ObjectionGround; correct: boolean }
  | { type: "missed-objection"; line: string }
  | { type: "bad-objection"; line: string }
  | { type: "sustained-against"; topic: string }
  | { type: "admission" };

export interface CourtResult {
  contradictions: string[];
  missedContradictions: string[];
  objectionsWon: number;
  objectionsLost: number;
  missedObjections: number;
  wrongPieces: number;
  admitted: boolean;
  score: number;
  grade: "S" | "A" | "B" | "C";
  billedHours: number;
  fees: number;
  reputation: number;
}
