/**
 * Répliques de la séquence d'arrivée (plans 1 à 8). Texte = sous-titres ; les répliques « voiced »
 * sont à enregistrer (annexe D) sous public/audio/vo-<id>.mp3 — voir `npm run voices:csv`.
 * Pas d'import par alias ici : le fichier est aussi lu par tools/export-voices.ts.
 */
import type { Line } from "./types.ts";

export const ARRIVAL = {
  taxiNarration: { id: "arrival-taxi-narration", speaker: "narrator", text: "6 h 40. Manhattan. Premier jour.", emotion: "neutre", voiced: false },
  taxiSms: { id: "arrival-taxi-sms", speaker: "sms", text: "52e étage. 7 h 00. Ne sois pas en retard.", emotion: "froid", voiced: false },
  taxiDriver: { id: "arrival-taxi-driver", speaker: "narrator", text: "Le taxi s'arrête au pied de la tour. Le compteur affiche 23,40 $.", emotion: "neutre", voiced: false },

  guardName: { id: "guard-name", speaker: "guard", text: "Nouveau ? Votre nom ?", emotion: "las", voiced: true },
  guardPhoto: { id: "guard-photo", speaker: "guard", text: "Regardez l'objectif… Voilà. La photo est pas terrible, mais ça ira.", emotion: "amusé", voiced: true },
  guardWelcome: { id: "guard-welcome", speaker: "guard", text: "Bienvenue chez Harlow & Vance. Passez votre badge sur le lecteur.", emotion: "chaleureux", voiced: true },
  guardFloor: { id: "guard-floor", speaker: "guard", text: "Ascenseur panoramique, tout au fond. Cinquante-deuxième.", emotion: "neutre", voiced: true },

  voicemail1: { id: "harlow-voicemail-1", speaker: "harlow", text: "C'est Harlow. Je sais que vous êtes dans l'ascenseur, alors écoutez bien.", emotion: "grave", voiced: true },
  voicemail2: { id: "harlow-voicemail-2", speaker: "harlow", text: "Meridian Logistics. Quatre mille camions, une cotation au Nasdaq, et un fonds de pension pour ses chauffeurs.", emotion: "grave", voiced: true },
  voicemail3: { id: "harlow-voicemail-3", speaker: "harlow", text: "Ce fonds a perdu soixante millions de dollars en dix-huit mois. Les chauffeurs nous ont choisis pour les récupérer.", emotion: "grave", voiced: true },
  voicemail4: { id: "harlow-voicemail-4", speaker: "harlow", text: "Meridian jure que ses comptes sont propres. Les chiffres, eux, sont trop beaux pour être honnêtes.", emotion: "froid", voiced: true },
  voicemail5: { id: "harlow-voicemail-5", speaker: "harlow", text: "Trouvez-moi la fraude. Le reste, c'est de la plaidoirie.", emotion: "froid", voiced: true },

  noraWelcome: { id: "nora-welcome", speaker: "nora", text: "Il vous attend. Dernier bureau au fond. Et… bonne chance.", emotion: "chaleureux", voiced: true },

  mercerIntro: { id: "mercer-intro", speaker: "mercer", text: "C'est toi le stagiaire de Harlow ? Je parie que tu tiens pas une semaine.", emotion: "moqueur", voiced: true },
  playerRetort: { id: "player-retort", speaker: "player", text: "Une semaine ? Il m'en faudra moins pour avoir ton bureau.", emotion: "froid", voiced: false },
  mercerAfterIgnore: { id: "mercer-after-ignore", speaker: "mercer", text: "… Charmant. On verra si tu snobes aussi Harlow.", emotion: "tendu", voiced: true },
  mercerAfterRetort: { id: "mercer-after-retort", speaker: "mercer", text: "Ha. On en reparlera quand tu auras facturé ta première heure.", emotion: "moqueur", voiced: true },
  mercerAfterSmile: { id: "mercer-after-smile", speaker: "mercer", text: "Souris tant que tu peux. Le cinquante-deuxième, ça use.", emotion: "amusé", voiced: true },

  harlowStand: { id: "harlow-stand", speaker: "harlow", text: "Asseyez-vous. Non… restez debout. On réfléchit mieux debout.", emotion: "froid", voiced: true },
  harlowMessage: { id: "harlow-message", speaker: "harlow", text: "Vous avez écouté mon message. Bien.", emotion: "grave", voiced: true },
  harlowBriefing: { id: "harlow-briefing", speaker: "harlow", text: "Meridian publie ses comptes dans trois jours. Si la fraude existe, elle est dans ces pages.", emotion: "grave", voiced: true },
  harlowFolder: { id: "harlow-folder", speaker: "harlow", text: "États financiers, annexes, contrats. Tout ce qu'ils ont bien voulu nous donner.", emotion: "grave", voiced: true },
  harlowDeadline: { id: "harlow-deadline", speaker: "harlow", text: "Vous avez jusqu'à demain matin. Huit heures. Pas une minute de plus.", emotion: "froid", voiced: true },

  deskNarration: {
    id: "arrival-desk-narration",
    speaker: "narrator",
    text: "Votre bureau. Pas de fenêtre, un néon fatigué, une plante en plastique. Tout le monde commence quelque part.",
    emotion: "las",
    voiced: false,
  },
} satisfies Record<string, Line>;

export const ARRIVAL_LINES: Line[] = Object.values(ARRIVAL);
