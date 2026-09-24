"use client";
/** État du bureau (hub) : vue ouverte, objet survolé, notification en cours. */
import { create } from "zustand";

export type HubView = "cases" | "phone" | "terminal" | "board" | "briefcase" | "library" | "door";

export type HubAction =
  | { type: "open"; view: HubView }
  | { type: "close" }
  | { type: "play"; messageId: string }
  | { type: "visit"; place: "harlow" }
  | { type: "case"; id: string }
  /** Se lever du bureau (retour à l'étage, monde ouvert). */
  | { type: "stand" };

export interface HubState {
  /** Le bureau est affiché et interactif. */
  active: boolean;
  view: HubView | null;
  hovered: string | null;
  /** Affaire sélectionnée dans la vue « chemises ». */
  selectedCase: string | null;
  notification: { from: string; text: string; id: number } | null;
  /** Déménagement en cours (cartons, plaque). */
  moving: boolean;
  set: (patch: Partial<Omit<HubState, "set">>) => void;
}

export const useHub = create<HubState>()((set) => ({
  active: false,
  view: null,
  hovered: null,
  selectedCase: null,
  notification: null,
  moving: false,
  set: (patch) => set(patch),
}));

type Handler = (a: HubAction) => void;
const handlers = new Set<Handler>();
export const hubBus = {
  emit: (a: HubAction) => {
    for (const h of [...handlers]) h(a);
  },
  on: (h: Handler) => {
    handlers.add(h);
    return () => {
      handlers.delete(h);
    };
  },
};

/** Libellés des objets du bureau (accessibilité, infobulles). */
export const HUB_OBJECTS: Record<HubView, string> = {
  cases: "Les affaires",
  phone: "Téléphone — messages",
  terminal: "H&V Terminal",
  board: "Tableau d'enquête",
  briefcase: "Mallette — atouts",
  library: "Bibliothèque de leçons",
  door: "Couloir",
};
