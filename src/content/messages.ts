/**
 * Messagerie du cabinet (téléphone de bureau) : SMS et messages vocaux, débloqués selon la progression.
 */
import type { Line } from "./dialogue/types";
import { HUB } from "./dialogue/hub";

export interface MessageContext {
  flags: Record<string, string>;
  arrivalSeen: boolean;
}

export interface SmsMessage {
  id: string;
  kind: "sms";
  from: string;
  text: string;
  /** Heure affichée (heure fictive du jeu). */
  time: string;
  when: (c: MessageContext) => boolean;
}

export interface VoiceMessage {
  id: string;
  kind: "voicemail";
  from: string;
  lines: Line[];
  duration: string;
  time: string;
  when: (c: MessageContext) => boolean;
}

export type Message = SmsMessage | VoiceMessage;

const MERCER_SMS: Record<string, string> = {
  retort: "Ton bureau, hein ? Il n'a même pas de fenêtre. Bonne chance pour la vue.",
  ignore: "Tu snobes toujours les gens le premier jour ? Retiens la leçon : ici, on se souvient de tout.",
  smile: "Premier conseil gratuit : Harlow déteste les fautes de frappe. Le deuxième te coûtera un déjeuner.",
};

export const MESSAGES: Message[] = [
  {
    id: "vm-harlow-desk",
    kind: "voicemail",
    from: "Robert Harlow",
    lines: [HUB.harlowVoicemail],
    duration: "0:07",
    time: "7:12",
    when: (c) => c.arrivalSeen,
  },
  {
    id: "vm-theo-welcome",
    kind: "voicemail",
    from: "Theo Park",
    lines: [HUB.theoVoicemail1, HUB.theoVoicemail2],
    duration: "0:11",
    time: "7:26",
    when: (c) => c.arrivalSeen,
  },
  {
    id: "sms-nora-coffee",
    kind: "sms",
    from: "Nora Ellis",
    text: "Bienvenue au 52 ! Petit secret : le café de la kitchenette est imbuvable. Celui du 51 est bien meilleur. — N.",
    time: "7:31",
    when: (c) => c.arrivalSeen,
  },
  {
    id: "sms-mercer-intro",
    kind: "sms",
    from: "Grant Mercer",
    text: "",
    time: "7:40",
    when: (c) => c.arrivalSeen && !!c.flags.mercer_intro,
  },
];

/** Messages visibles pour ce joueur (texte personnalisé selon ses choix). */
export function inbox(c: MessageContext): Message[] {
  return MESSAGES.filter((m) => m.when(c)).map((m) =>
    m.id === "sms-mercer-intro" && m.kind === "sms" ? { ...m, text: MERCER_SMS[c.flags.mercer_intro ?? "smile"] ?? MERCER_SMS.smile! } : m,
  );
}

export function unreadCount(c: MessageContext, read: string[]): number {
  return inbox(c).filter((m) => !read.includes(m.id)).length;
}
