/** État mutable des pièces 3D (lu à chaque frame). */
export const roomClock = {
  /** « ny » = heure réelle de New York ; « game » = heure du jeu (chrono diégétique de l'audit). */
  mode: "ny" as "ny" | "game",
  /** Minutes depuis minuit (mode « game »). */
  minutes: 23 * 60,
};

export const roomState = {
  /** Lampe de banquier allumée. */
  lamp: 1,
  /** Intensité du néon (stagiaire) ; le grésillement s'y ajoute. */
  neon: 1,
  /** Vapeur du café (1 = brûlant, 0 = froid). */
  coffeeHeat: 1,
  /** Passage d'un collègue derrière la porte : position x (−1..1) et visibilité. */
  passerby: { x: -2, visible: false },
};

/** Caméra des pièces 3D : champ plus large et regard moins plongeant que pour les plates. */
export const ROOM_CAMERA = { fov: 50, pitch: 0.17, eye: [0, 0.04, 0.16] as [number, number, number] };

/** Géométrie commune des bureaux (mètres ; œil à l'origine, regard vers −z). */
export const ROOM = {
  floorY: -1.17,
  ceilingY: 1.45,
  backZ: -2.0,
  sideX: 1.9,
  desk: { y: -0.42, x0: -0.8, x1: 0.8, z0: -0.3, z1: -1.12, thickness: 0.04 },
} as const;

/** Harlow se retourne dans son bureau d'angle (0 = dos à la pièce, 1 = face à la caméra). Animé par le directeur. */
export const harlowTurn = { value: 1 };
