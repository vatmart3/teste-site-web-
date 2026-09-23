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
  cases: [-0.14, DESK_Y, -0.76] as const,
  briefcase: [-0.5, DESK_Y, -0.72] as const,
  cup: [0.46, DESK_Y, -0.74] as const,
  phone: [0.62, DESK_Y, -0.9] as const,
  stamp: [0.12, DESK_Y, -0.66] as const,
  pen: [0.24, DESK_Y, -0.68] as const,
  ball: [0.64, DESK_Y, -0.66] as const,
};

/** Variante de lumière du bureau selon l'heure réelle de New York. */
export function officeVariant(nyHour: number): "day" | "dusk" | "night" {
  if (nyHour >= 7 && nyHour < 17) return "day";
  if (nyHour >= 17 && nyHour < 20) return "dusk";
  return "night";
}
