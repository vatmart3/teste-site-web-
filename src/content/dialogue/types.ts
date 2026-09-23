export type Emotion = "neutre" | "froid" | "chaleureux" | "moqueur" | "grave" | "tendu" | "amusé" | "las";

export interface Line {
  id: string;
  /** Personnage (id de characters.ts), « player » pour le joueur, ou « narrator » / « sms ». */
  speaker: string;
  text: string;
  emotion: Emotion;
  /** Réplique doublée : fichier public/audio/vo-<id>. Faux pour le joueur, le narrateur et les SMS. */
  voiced: boolean;
}

/** Nom du fichier de voix d'une réplique. */
export function voiceFile(line: Line): string | undefined {
  return line.voiced ? `vo-${line.id}` : undefined;
}
