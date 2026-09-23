/**
 * Repère du bureau : caméra à l'origine (hauteur des yeux, assis), inclinée vers le plateau.
 * Le plateau est à 42 cm sous les yeux et va de ~35 cm à ~1,15 m devant soi ; ces valeurs calent
 * la perspective des objets 3D sur le plateau peint des plates « 08-desk-* » (bord arrière à 40 % de l'écran).
 */
export const DESK_Y = -0.42;
export const DESK_PITCH = 0.28;
export const DESK_NEAR = -0.35;
export const DESK_FAR = -1.15;

export const DESK_SPOTS = {
  cases: [-0.3, DESK_Y, -0.9] as const,
  briefcase: [-0.58, DESK_Y, -1.02] as const,
  cup: [0.17, DESK_Y, -0.88] as const,
  phone: [0.43, DESK_Y, -0.95] as const,
  stamp: [-0.04, DESK_Y, -0.86] as const,
  pen: [0.04, DESK_Y, -1.0] as const,
  ball: [0.26, DESK_Y, -1.06] as const,
};

/** Variante de lumière du bureau selon l'heure réelle de New York. */
export function officeVariant(nyHour: number): "day" | "dusk" | "night" {
  if (nyHour >= 7 && nyHour < 17) return "day";
  if (nyHour >= 17 && nyHour < 20) return "dusk";
  return "night";
}
