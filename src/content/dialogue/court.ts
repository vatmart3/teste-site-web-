/** Répliques de l'affaire 2 (tableau d'enquête, tribunal, débrief). Lu aussi par tools/export-voices.mts. */
import type { Emotion, Line } from "./types.ts";
import { CROSS_EXAMINATION } from "../cases/crossExamination.ts";

const L = (id: string, speaker: string, text: string, emotion: Emotion, voiced = true): Line => ({ id, speaker, text, emotion, voiced });

export const COURT = {
  boardIntro: L("board-intro", "harlow", "L'audience est demain, neuf heures. Rourke va jurer que tout est propre. Mettez vos pièces au mur et reliez ce qui ne colle pas. Il me faut au moins deux contradictions solides.", "grave"),
  boardShort: L("board-short", "harlow", "Deux contradictions, pas moins. Retournez au tableau.", "froid"),
  boardReady: L("board-ready", "harlow", "Bien. Dormez. Demain, vous le regardez dans les yeux.", "grave"),
  taxi: L("court-taxi", "narrator", "Le lendemain. Tribunal fédéral du district sud de New York, 9 h 12.", "tendu", false),
  steps: L("court-steps", "narrator", "Les photographes attendent Rourke. Pour l'instant, personne ne sait qui vous êtes.", "tendu", false),
  allRise: L("court-all-rise", "huissier", "Veuillez vous lever. La cour, présidée par l'honorable Alma Whitford.", "neutre"),
  judgeOpen: L("court-judge-open", "whitford", "Asseyez-vous. Fonds de pension des chauffeurs contre Meridian Logistics. Maître Brandt, votre témoin.", "froid"),
  objectionTutorial: L("court-tuto-objection", "narrator", "Si une question de Brandt est irrégulière, cliquez OBJECTION pendant qu'elle la pose (touche O), puis choisissez le motif.", "neutre", false),
  playerObjection: L("court-player-objection", "player", "Objection, Votre Honneur !", "tendu", false),
  sustained: L("court-sustained", "whitford", "Retenue. Maître Brandt, reformulez ou passez à autre chose.", "froid"),
  brandtWithdraw: L("court-brandt-withdraw", "brandt", "Je retire la question.", "froid"),
  overruledWrongGround: L("court-overruled-ground", "whitford", "Rejetée. Ce n'est pas le bon motif, maître. Le témoin peut répondre.", "froid"),
  overruled: L("court-overruled", "whitford", "Rejetée. La question est parfaitement régulière. Ne me faites pas perdre mon temps.", "froid"),
  judgeCross: L("court-judge-cross", "whitford", "Contre-interrogatoire. Maître, le témoin est à vous.", "neutre"),
  crossTutorial: L("court-tuto-cross", "narrator", "Choisissez un sujet, posez une question. Quand Rourke affirme quelque chose de faux, faites glisser la bonne pièce vers lui.", "neutre", false),
  brandtObjects: L("court-brandt-objects", "brandt", "Objection ! Le conseil harcèle le témoin.", "froid"),
  sustainedAgainst: L("court-sustained-against", "whitford", "Retenue. Posez des questions, maître, pas des accusations.", "froid"),
  wrongPiece: L("court-wrong-piece", "whitford", "Maître, où voulez-vous en venir avec cette pièce ? Avancez.", "froid"),
  noContradiction: L("court-no-contradiction", "narrator", "Vous laissez passer. Le jury, lui, a entendu la réponse.", "neutre", false),
  patienceLow: L("court-patience-low", "whitford", "Dernier avertissement, maître. Ma patience a des limites.", "froid"),
  patienceOut: L("court-patience-out", "whitford", "Ça suffit. Le contre-interrogatoire est terminé. Asseyez-vous.", "froid"),
  noMore: L("court-no-more", "player", "Plus de questions, Votre Honneur.", "neutre", false),
  rourkeBreak1: L("court-rourke-break-1", "rourke", "… Arrêtez. Arrêtez.", "tendu"),
  rourkeBreak2: L("court-rourke-break-2", "rourke", "Orca, c'est Linda. Les factures de décembre, c'était pour tenir les objectifs. On m'a dit que personne ne regarderait jamais les dates.", "tendu"),
  gallery: L("court-gallery", "narrator", "Un murmure traverse la salle.", "tendu", false),
  judgeSilence: L("court-judge-silence", "whitford", "Silence ! Silence dans la salle.", "froid"),
  judgeRecess: L("court-judge-recess", "whitford", "La séance est suspendue. Maître Brandt, dans mon cabinet. Maintenant.", "froid"),
  judgeEndNoBreak: L("court-judge-end", "whitford", "Le témoin peut se retirer. La séance est suspendue jusqu'à quatorze heures.", "neutre"),
  harlowAsk: L("harlow-court-ask", "harlow", "J'étais au fond de la salle. Asseyez-vous.", "grave"),
  harlowS: L("harlow-court-s", "harlow", "Il a craqué devant le jury. Vingt-cinq ans que je fais ce métier : ce genre d'audience, on la raconte encore dix ans après.", "grave"),
  harlowA: L("harlow-court-a", "harlow", "Du bon travail. Rourke est sorti de la salle plus petit qu'il n'y est entré.", "grave"),
  harlowB: L("harlow-court-b", "harlow", "Vous l'avez fait transpirer. Il faudra le faire tomber, la prochaine fois.", "froid"),
  harlowC: L("harlow-court-c", "harlow", "Brandt vous a promené. Relisez vos pièces, et revenez quand vous saurez ce qu'elles prouvent.", "froid"),
  harlowObjections: L("harlow-court-objections", "harlow", "Et à l'interrogatoire principal, Brandt a soufflé les réponses à son témoin. Une objection bien placée vaut dix plaidoiries.", "froid"),
  harlowDismiss: L("harlow-court-dismiss", "harlow", "Brandt va vouloir négocier. Préparez-vous : elle ne lâche jamais rien sans qu'on le lui arrache.", "grave"),
} satisfies Record<string, Line>;

/** Répliques tirées des données de l'audience (interrogatoire principal, réponses de Rourke). */
export function courtDataLines(): Line[] {
  const def = CROSS_EXAMINATION;
  const direct = def.direct.map((l) => L(`court-${l.id}`, l.speaker, l.text, l.speaker === "brandt" ? "froid" : "tendu"));
  const topics = def.topics.flatMap((t) => [L(`court-${t.id}-claim`, "rourke", t.claim, "tendu"), L(`court-${t.id}-rebuttal`, "rourke", t.rebuttal, "tendu")]);
  return [...direct, ...topics];
}

export const COURT_LINES: Line[] = [...Object.values(COURT), ...courtDataLines()];

/** Réplique d'une ligne de l'interrogatoire principal. */
export function directLine(id: string): Line {
  return COURT_LINES.find((l) => l.id === `court-${id}`)!;
}

export function topicLine(topicId: string, kind: "claim" | "rebuttal"): Line {
  return COURT_LINES.find((l) => l.id === `court-${topicId}-${kind}`)!;
}
