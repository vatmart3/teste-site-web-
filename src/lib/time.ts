/**
 * Heure du jeu : l'heure réelle du joueur (Paris ou ailleurs) convertie en heure de New York,
 * affichée sur les horloges du cabinet.
 */
export interface ClockTime {
  hours: number;
  minutes: number;
  seconds: number;
  /** « 7 h 05 » */
  label: string;
  /** « 07:05 » */
  digital: string;
}

export function newYorkTime(date: Date = new Date()): ClockTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return clock(get("hour") % 24, get("minute"), get("second"));
}

export function clock(hours: number, minutes: number, seconds = 0): ClockTime {
  const mm = String(minutes).padStart(2, "0");
  return {
    hours,
    minutes,
    seconds,
    label: `${hours} h ${mm}`,
    digital: `${String(hours).padStart(2, "0")}:${mm}`,
  };
}

/** Angles des aiguilles (degrés, 0 = midi) pour une horloge murale. */
export function clockHands(t: ClockTime): { hour: number; minute: number; second: number } {
  return {
    hour: ((t.hours % 12) + t.minutes / 60) * 30,
    minute: (t.minutes + t.seconds / 60) * 6,
    second: t.seconds * 6,
  };
}
