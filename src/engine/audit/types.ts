/** Modèle de données du mini-jeu « audit forensique » (réutilisable par d'autres affaires). */

export interface AuditAnomaly {
  id: string;
  /** Libellé complet (post-it, mémo). */
  label: string;
  /** Libellé court écrit à la main sur le post-it. */
  short: string;
  /** Poids dans la note. */
  weight: number;
  /** Ce que Harlow en dit au débrief. */
  explanation: string;
  /** Leçon débloquée quand l'anomalie est trouvée. */
  lesson: string;
}

export type DocBlock =
  | { kind: "letterhead"; company: string; subtitle: string }
  | { kind: "title"; text: string }
  | { kind: "subtitle"; text: string }
  | { kind: "table"; columns: string[]; rows: { id?: string; label: string; values: string[]; bold?: boolean }[] }
  | { kind: "para"; id?: string; text: string; small?: boolean }
  | { kind: "spacer"; size: number }
  | { kind: "stamp"; text: string; color: string }
  | { kind: "signature"; name: string; role: string };

export interface AuditDoc {
  id: string;
  title: string;
  /** a4 = feuille US Letter ; note = demi-feuille (bon de livraison). */
  format: "letter" | "half";
  /** Plusieurs pages agrafées (annexes). */
  pages: DocBlock[][];
  /** Position et rotation sur le bureau (x, z en mètres ; rotation en radians). */
  desk: { x: number; z: number; rot: number };
}

export interface ClueDef {
  /** Anomalie prouvée par cette ligne ; null = fausse piste (ligne normale mais tentante). */
  anomaly: string | null;
  /** primary = preuve directe ; support = recoupement. */
  strength: "primary" | "support";
}

export interface AuditCaseDef {
  id: string;
  title: string;
  /** Heure de début et heure limite (minutes depuis minuit ; la limite peut dépasser 24 h). */
  startMinutes: number;
  deadlineMinutes: number;
  /** Durée réelle de la nuit en secondes (chrono diégétique). */
  realSeconds: number;
  /** Taux horaire facturé pour le stagiaire ($/h). */
  hourlyRate: number;
  docs: AuditDoc[];
  anomalies: AuditAnomaly[];
  clues: Record<string, ClueDef>;
}

/** Marque posée par le joueur : ligne surlignée + qualification choisie sur le post-it. */
export interface AuditMark {
  lineId: string;
  /** id d'anomalie, ou « none » (fausse alerte : le surlignage est retiré). */
  category: string;
  /** Heure du jeu (minutes) à laquelle la marque a été posée. */
  at: number;
}

export type Grade = "S" | "A" | "B" | "C";

export interface AuditResult {
  found: string[];
  corroborated: string[];
  missed: string[];
  falsePositives: number;
  /** Anomalies révélées par l'atout « Expert judiciaire » (crédit réduit). */
  assisted: string[];
  score: number;
  grade: Grade;
  minutesUsed: number;
  minutesLeft: number;
  billedHours: number;
  fees: number;
  reputation: number;
}
