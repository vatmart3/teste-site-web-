/** Répliques de l'affaire 1 (nuit d'audit + débrief). Lu aussi par tools/export-voices.mts. */
import type { Line } from "./types.ts";

export const AUDIT = {
  intro1: { id: "audit-intro-1", speaker: "narrator", text: "23 h 00. Le cabinet s'est vidé. Il reste vous, la lampe verte, et les comptes de Meridian.", emotion: "las", voiced: false },
  intro2: { id: "audit-intro-2", speaker: "theo", text: "Je vous ai laissé le bilan, le compte de résultat, les annexes et un ordre de mission. Café frais. Bon courage.", emotion: "chaleureux", voiced: true },
  tutorial: {
    id: "audit-tutorial",
    speaker: "narrator",
    text: "Prenez une feuille. Surlignez chaque ligne suspecte, puis dites ce qui cloche. La loupe lit les petits caractères.",
    emotion: "neutre",
    voiced: false,
  },
  coffeeCold: { id: "audit-coffee-cold", speaker: "narrator", text: "3 h 00. Le café est froid.", emotion: "las", voiced: false },
  oneHour: { id: "audit-one-hour", speaker: "narrator", text: "7 h 00. Plus qu'une heure.", emotion: "tendu", voiced: false },
  dawn: { id: "audit-dawn", speaker: "narrator", text: "8 h 00. Le soleil se lève sur Manhattan. Harlow attend.", emotion: "tendu", voiced: false },
  submitAsk: { id: "audit-submit-ask", speaker: "narrator", text: "Rendre le mémo maintenant ? Vous ne pourrez plus rien ajouter.", emotion: "neutre", voiced: false },
  expert: { id: "audit-expert", speaker: "narrator", text: "L'expert judiciaire a entouré une ligne au crayon rouge.", emotion: "neutre", voiced: false },
  allNighter: { id: "audit-all-nighter", speaker: "narrator", text: "Nuit blanche : un quatrième café, un peu plus de temps.", emotion: "neutre", voiced: false },

  harlowAsk: { id: "harlow-audit-ask", speaker: "harlow", text: "Alors ? Montrez-moi ce que Meridian ne voulait pas qu'on voie.", emotion: "froid", voiced: true },
  harlowS: { id: "harlow-audit-s", speaker: "harlow", text: "Tout. Vous avez tout vu, et vous l'avez prouvé. Je ne dis pas ça souvent : impeccable.", emotion: "grave", voiced: true },
  harlowA: { id: "harlow-audit-a", speaker: "harlow", text: "Solide. Il manque peu de chose. Avec ça, Meridian va passer une mauvaise semaine.", emotion: "grave", voiced: true },
  harlowB: { id: "harlow-audit-b", speaker: "harlow", text: "Correct. Correct n'a jamais gagné un procès, mais c'est un début.", emotion: "froid", voiced: true },
  harlowC: { id: "harlow-audit-c", speaker: "harlow", text: "C'est tout ? Les chauffeurs ont perdu soixante millions. Recommencez.", emotion: "froid", voiced: true },
  harlowFalse: { id: "harlow-audit-false", speaker: "harlow", text: "Et évitez d'accuser ce qui est propre. Une fausse accusation, et la partie adverse ne lit plus le reste.", emotion: "froid", voiced: true },
  harlowDismiss: { id: "harlow-audit-dismiss", speaker: "harlow", text: "Vos heures sont facturées. Allez dormir deux heures. Ensuite, on va chercher Rourke.", emotion: "grave", voiced: true },
} satisfies Record<string, Line>;

export const AUDIT_LINES: Line[] = Object.values(AUDIT);

/** Réplique de Harlow sur une anomalie trouvée ou manquée (texte = explication de l'affaire). */
export function harlowOnAnomaly(anomalyId: string, explanation: string, found: boolean): Line {
  return {
    id: `harlow-audit-${found ? "found" : "missed"}-${anomalyId}`,
    speaker: "harlow",
    text: `${found ? "Bien vu. " : "Et vous avez raté ceci : "}${explanation}`,
    emotion: found ? "grave" : "froid",
    voiced: true,
  };
}
