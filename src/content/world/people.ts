/** Qui travaille à l'étage, où, et à quoi occupe-t-il sa journée. */
import type { NpcDef } from "@/engine/world/npcs";

export const NPCS: NpcDef[] = [
  {
    id: "harlow",
    name: "Robert Harlow",
    home: "harlow-seat",
    routine: [
      { spot: "harlow-seat", dur: [40, 80], weight: 3 },
      { spot: "harlow-window", dur: [14, 24], weight: 1 },
    ],
  },
  {
    id: "vivian",
    name: "Vivian Cole",
    home: "vivian-seat",
    routine: [
      { spot: "vivian-seat", dur: [40, 90], weight: 5 },
      { spot: "coffee", dur: [10, 16], weight: 1 },
      { spot: "archive", dur: [8, 14], weight: 1 },
    ],
    greet: ["Il a tout vu, vous savez. Il voit toujours tout.", "Vous avez l'air d'avoir besoin d'un café. Demandez à Theo.", "Bonjour, maître."],
  },
  {
    id: "theo",
    name: "Theo Park",
    home: "theo-seat",
    routine: [
      { spot: "theo-seat", dur: [40, 90], weight: 6 },
      { spot: "copier", dur: [10, 18], weight: 1 },
      { spot: "archive-2", dur: [8, 14], weight: 1 },
    ],
    greet: ["Besoin de quelque chose ?", "Je suis là si vous avez besoin."],
  },
  {
    id: "nora",
    name: "Nora Ellis",
    home: "nora-seat",
    routine: [{ spot: "nora-seat", dur: [60, 120], weight: 1 }],
    greet: ["Bonjour ! Belle journée pour facturer.", "Harlow & Vance, bonjour… Ah, c'est vous."],
  },
  {
    id: "mercer",
    name: "Grant Mercer",
    home: "mercer-seat",
    routine: [
      { spot: "mercer-seat", dur: [40, 80], weight: 3 },
      { spot: "coffee-2", dur: [10, 18], weight: 1 },
      { spot: "bullpen-chat-1", dur: [12, 20], weight: 1 },
      { spot: "window-n", dur: [12, 22], weight: 1 },
    ],
    greet: ["Tiens, le petit nouveau. Toujours en vie ?", "Ne vous perdez pas en chemin vers la photocopieuse."],
  },
  {
    id: "sam",
    name: "Sam Okafor",
    home: "pod-0-0-a",
    routine: [
      { spot: "pod-0-0-a", dur: [40, 90], weight: 4 },
      { spot: "coffee", dur: [10, 16], weight: 1 },
      { spot: "lounge-1", dur: [15, 25], weight: 1 },
      { spot: "archive-2", dur: [8, 14], weight: 1 },
    ],
    greet: ["Salut ! Tu survis ?", "Mercer m'a encore piqué mon café."],
  },
  {
    id: "lena",
    name: "Lena Fischer",
    home: "pod-2-1-b",
    routine: [
      { spot: "pod-2-1-b", dur: [40, 90], weight: 4 },
      { spot: "break-t1", dur: [15, 25], weight: 1 },
      { spot: "bullpen-chat-2", dur: [12, 20], weight: 1 },
    ],
    greet: ["Bonjour !", "Tu as vu la tête de Mercer ce matin ?"],
  },
  {
    id: "priya",
    name: "Priya Nair",
    home: "pod-3-0-a",
    routine: [
      { spot: "pod-3-0-a", dur: [40, 90], weight: 4 },
      { spot: "archive", dur: [8, 14], weight: 1 },
      { spot: "lounge-2", dur: [15, 25], weight: 1 },
      { spot: "break-t2", dur: [15, 25], weight: 1 },
    ],
    greet: ["Les archives sont un labyrinthe, je te jure.", "Salut."],
  },
  {
    id: "marcus",
    name: "Marcus Bell",
    home: "mail",
    routine: [
      { spot: "mail", dur: [15, 30], weight: 2 },
      { spot: "copier", dur: [10, 20], weight: 1 },
      { spot: "reception-front", dur: [6, 10], weight: 1 },
    ],
    greet: ["Courrier ! Enfin, pas pour vous. Pas encore.", "Salut, maître."],
  },
  {
    id: "guard",
    name: "Le vigile",
    home: "guard",
    routine: [{ spot: "guard", dur: [60, 120], weight: 1 }],
    greet: ["Bonsoir."],
  },
  { id: "extra-1", name: "Collaborateur", home: "pod-1-0-b", routine: [{ spot: "pod-1-0-b", dur: [50, 120], weight: 5 }, { spot: "coffee-2", dur: [10, 15], weight: 1 }] },
  { id: "extra-2", name: "Assistante", home: "mercer-assist", routine: [{ spot: "mercer-assist", dur: [60, 120], weight: 6 }, { spot: "copier", dur: [10, 15], weight: 1 }] },
  { id: "extra-3", name: "Associé", home: "pod-4-1-a", routine: [{ spot: "pod-4-1-a", dur: [50, 120], weight: 4 }, { spot: "lounge-2", dur: [15, 25], weight: 1 }] },
  { id: "extra-4", name: "Collaboratrice", home: "pod-1-1-a", routine: [{ spot: "pod-1-1-a", dur: [50, 120], weight: 4 }, { spot: "break-t2", dur: [12, 20], weight: 1 }] },
  { id: "extra-5", name: "Stagiaire", home: "pod-3-1-b", routine: [{ spot: "pod-3-1-b", dur: [40, 90], weight: 3 }, { spot: "archive", dur: [8, 12], weight: 1 }, { spot: "coffee", dur: [8, 12], weight: 1 }] },
  { id: "extra-6", name: "Collaboratrice", home: "pod-4-0-b", routine: [{ spot: "pod-4-0-b", dur: [50, 120], weight: 4 }, { spot: "lounge-1", dur: [12, 20], weight: 1 }] },
];

export const NPC_NAMES: Record<string, string> = Object.fromEntries(NPCS.map((n) => [n.id, n.name]));
