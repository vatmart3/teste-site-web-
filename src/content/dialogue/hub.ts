/** Répliques du bureau (messagerie, visites). Pas d'import par alias : lu aussi par tools/export-voices.mts. */
import type { Line } from "./types.ts";

export const HUB = {
  theoVoicemail1: {
    id: "theo-voicemail-welcome-1",
    speaker: "theo",
    text: "Salut, c'est Theo, l'assistant du pôle contentieux. Si vous avez besoin de photocopies à trois heures du matin, je suis votre homme.",
    emotion: "chaleureux",
    voiced: true,
  },
  theoVoicemail2: { id: "theo-voicemail-welcome-2", speaker: "theo", text: "Enfin… traitez-moi bien, et je suis votre homme.", emotion: "amusé", voiced: true },
  harlowVoicemail: { id: "harlow-voicemail-desk", speaker: "harlow", text: "Le dossier Meridian est sur votre bureau. Huit heures, demain matin. Je ne rappellerai pas.", emotion: "froid", voiced: true },
  harlowVisit: { id: "harlow-visit", speaker: "harlow", text: "Vous n'avez pas un dossier à lire ?", emotion: "froid", voiced: true },
  harlowVisitLate: { id: "harlow-visit-late", speaker: "harlow", text: "Il est tard. Soit vous avez trouvé quelque chose, soit vous perdez mon temps.", emotion: "froid", voiced: true },
  deskPromotion: { id: "desk-promotion", speaker: "narrator", text: "Nouveau bureau. Nouvelle plaque. Les mêmes dossiers, en plus gros.", emotion: "neutre", voiced: false },
} satisfies Record<string, Line>;

export const HUB_LINES: Line[] = Object.values(HUB);
