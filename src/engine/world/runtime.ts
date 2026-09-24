/**
 * État du monde ouvert : partie mutable lue à chaque image (positions, portes, entrées) et store de l'interface
 * (lieu, invite d'interaction, menu de dialogue, mode décoration, argent...).
 */
import { create } from "zustand";
import type { FurnitureType } from "./layout";

export interface Agent {
  x: number;
  z: number;
  rot: number;
}

export const worldRuntime = {
  /** Joueur (position au sol, lacet). */
  player: { x: 4.2, z: -6.2, rot: Math.PI, speed: 0 } as Agent & { speed: number },
  /** Tous les personnages (joueur compris) : portes automatiques, évitement. */
  agents: new Map<string, Agent>(),
  doors: {} as Record<string, number>,
  /** Caméra orbitale (lacet, tangage, distance), pilotée à la souris / au doigt. */
  cam: { yaw: Math.PI, pitch: 0.28, dist: 2.9, first: false },
  /** Entrées (clavier, joystick). */
  input: { x: 0, z: 0, run: false },
  /** Le joueur ne se déplace pas (dialogue, séquence, bureau, décoration). */
  frozen: false,
  /** Cible regardée pendant une conversation (caméra en champ / contrechamp). */
  focus: null as null | { x: number; y: number; z: number },
};

export interface MenuOption {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export interface WorldUi {
  active: boolean;
  room: string;
  /** Invite d'interaction la plus proche. */
  prompt: { id: string; label: string; key: string } | null;
  /** Menu de dialogue ouvert (PNJ, objet). */
  menu: { title: string; subtitle?: string; options: MenuOption[] } | null;
  toast: { text: string; id: number } | null;
  /** Mode décoration du bureau. */
  edit: boolean;
  editSel: { mode: "new"; type: FurnitureType; v?: number } | { mode: "move"; id: string } | null;
  /** Café (bonus de concentration) : fin du bonus (ms). */
  coffeeUntil: number;
  /** Objectif affiché en haut de l'écran. */
  objective: string | null;
  /** Aide des commandes visible. */
  help: boolean;
  set: (p: Partial<Omit<WorldUi, "set">>) => void;
}

export const useWorld = create<WorldUi>()((set) => ({
  active: false,
  room: "",
  prompt: null,
  menu: null,
  toast: null,
  edit: false,
  editSel: null,
  coffeeUntil: 0,
  objective: null,
  help: true,
  set: (p) => set(p),
}));

export type WorldAction = { type: "interact"; id: string } | { type: "menu"; id: string } | { type: "close" } | { type: "edit"; on: boolean };

type L = (a: WorldAction) => void;
const listeners = new Set<L>();
export const worldBus = {
  emit(a: WorldAction) {
    for (const l of listeners) l(a);
  },
  on(l: L) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};

export function toast(text: string) {
  useWorld.getState().set({ toast: { text, id: Date.now() } });
}
