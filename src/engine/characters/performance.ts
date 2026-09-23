/**
 * « Jeu d'acteur » des personnages : état courant (idle, talk, pleased, tense, break), niveau de parole
 * (amplitude de la voix, ou enveloppe synthétique pendant la frappe des sous-titres) et micro-mouvements
 * appliqués par le shader (respiration, tête). Objet mutable lu à chaque frame.
 */
import type { CharacterId, CharacterState } from "@/content/characters";

export const cast: {
  states: Partial<Record<CharacterId, CharacterState>>;
  /** Qui parle en ce moment (id de personnage) et à quel volume (0..1, lissé). */
  speaker: CharacterId | null;
  level: number;
  /** Frappe des sous-titres en cours (sert d'enveloppe quand il n'y a pas de voix). */
  typing: boolean;
} = { states: {}, speaker: null, level: 0, typing: false };

export function stateOf(id: CharacterId): CharacterState {
  return cast.states[id] ?? "idle";
}

export function setCharacterState(id: CharacterId, state: CharacterState): void {
  cast.states[id] = state;
}

/**
 * Micro-mouvements (en uv image) : [étirement de respiration, tête x, tête y].
 * Chaque état a sa signature lisible : la nervosité respire vite et bouge, l'effondrement s'affaisse.
 */
export function characterMotion(state: CharacterState, t: number, talk: number): [number, number, number] {
  const cfg = {
    idle: { rate: 1.2, depth: 0.0035, sway: 1, slump: 0 },
    talk: { rate: 1.4, depth: 0.004, sway: 1.2, slump: 0 },
    pleased: { rate: 1.1, depth: 0.004, sway: 0.8, slump: -0.002 },
    tense: { rate: 2.3, depth: 0.005, sway: 2.2, slump: 0.001 },
    break: { rate: 0.9, depth: 0.006, sway: 0.5, slump: 0.008 },
  }[state];
  const breathe = Math.sin(t * cfg.rate * 2 * Math.PI * 0.35) * cfg.depth;
  let hx = (Math.sin(t * 0.37) * 0.0018 + Math.sin(t * 1.13) * 0.0006) * cfg.sway;
  let hy = Math.sin(t * 0.53 + 1.1) * 0.0012 * cfg.sway - cfg.slump;
  if (state === "tense") hx += Math.sin(t * 7.3) * 0.0006; // regard qui fuit
  // Parole : hochements rapides modulés par le volume de la voix.
  hy += talk * (Math.sin(t * 9.1) * 0.0022 + Math.sin(t * 5.3) * 0.0012);
  hx += talk * Math.sin(t * 3.7) * 0.001;
  return [breathe, hx, hy];
}

/** Enveloppe de parole synthétique (syllabes) quand il n'y a pas de fichier de voix. */
export function syntheticSpeech(t: number): number {
  const syl = Math.max(0, Math.sin(t * 13.0) * 0.6 + Math.sin(t * 5.1) * 0.4);
  return Math.min(1, syl * 1.2);
}
