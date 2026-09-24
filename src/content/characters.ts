/**
 * Casting original (annexe B). Aucun lien avec une série ou un acteur réel.
 * `name` = nom affiché dans les sous-titres ; les vidéos d'états sont `characters/<id>-<état>.webm|mp4`.
 */
export type CharacterId = "harlow" | "nora" | "mercer" | "theo" | "rourke" | "brandt" | "whitford" | "guard" | "vivian" | "sam" | "lena" | "priya" | "marcus";
export type CharacterState = "idle" | "talk" | "pleased" | "tense" | "break";

export interface CharacterDef {
  id: CharacterId;
  name: string;
  role: string;
  /** Description pour les prompts de génération (anglais, sans nom d'acteur). */
  prompt: string;
  voice: string;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  harlow: {
    id: "harlow",
    name: "Robert Harlow",
    role: "Associé-gérant",
    prompt: "Man around 60, silver swept-back hair, trimmed grey beard, piercing calm eyes, navy three-piece suit, gold cufflinks, commanding and unreadable",
    voice: "grave, lent, posé",
  },
  nora: {
    id: "nora",
    name: "Nora Ellis",
    role: "Réceptionniste",
    prompt: "Woman around 30, dark curly hair in a low bun, warm but sharp expression, cream silk blouse, small gold earrings",
    voice: "chaleureuse, vive",
  },
  mercer: {
    id: "mercer",
    name: "Grant Mercer",
    role: "Collaborateur, rival",
    prompt: "Man around 32, sandy blond hair perfectly styled, slim charcoal suit, no tie, arrogant half-smile",
    voice: "rapide, moqueur",
  },
  theo: {
    id: "theo",
    name: "Theo Park",
    role: "Assistant",
    prompt: "Young man around 25, round glasses, rolled-up shirt sleeves, loosened tie, tired but eager",
    voice: "enthousiaste, fatigué",
  },
  rourke: {
    id: "rourke",
    name: "Daniel Rourke",
    role: "Directeur financier de Meridian",
    prompt: "Man around 50, receding dark hair, heavy jaw, expensive grey suit slightly too tight, sweat on forehead under pressure",
    voice: "défensif, qui s'effrite",
  },
  brandt: {
    id: "brandt",
    name: "Celia Brandt",
    role: "Avocate adverse",
    prompt: "Woman around 45, sleek black bob, black tailored suit, red lipstick, cold confident gaze",
    voice: "froide, précise",
  },
  whitford: {
    id: "whitford",
    name: "Juge Alma Whitford",
    role: "Juge fédérale",
    prompt: "Woman around 65, short white hair, black judicial robe, reading glasses on a chain, stern",
    voice: "sèche",
  },
  guard: {
    id: "guard",
    name: "Le vigile",
    role: "Sécurité du hall",
    prompt: "Security guard around 55, broad shoulders, grey crew cut, dark navy uniform with a brass badge, tired kind eyes",
    voice: "bourru, bienveillant",
  },
  vivian: {
    id: "vivian",
    name: "Vivian Cole",
    role: "Assistante de R. Harlow",
    prompt: "Woman around 40, auburn bob, burgundy skirt suit, knowing half-smile, sees everything",
    voice: "vive, ironique, sûre d'elle",
  },
  sam: {
    id: "sam",
    name: "Sam Okafor",
    role: "Collaborateur",
    prompt: "Man around 30, close-cropped hair, checked grey suit, green tie, easy grin",
    voice: "chaleureux, rapide",
  },
  lena: {
    id: "lena",
    name: "Lena Fischer",
    role: "Collaboratrice",
    prompt: "Woman around 30, blonde ponytail, navy trouser suit, focused",
    voice: "posée, précise",
  },
  priya: {
    id: "priya",
    name: "Priya Nair",
    role: "Collaboratrice, recherche",
    prompt: "Woman around 28, long dark hair, slate skirt suit, bright eyes",
    voice: "curieuse, enjouée",
  },
  marcus: {
    id: "marcus",
    name: "Marcus Bell",
    role: "Courrier et reprographie",
    prompt: "Man around 45, heavyset, light-blue shirt, friendly",
    voice: "jovial",
  },
};
