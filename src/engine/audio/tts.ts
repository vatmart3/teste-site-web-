/**
 * Voix de synthèse (Web Speech API) : tant qu'une réplique n'a pas son fichier doublé (annexe D), le
 * personnage parle avec la meilleure voix française du système (voix « naturelles » de macOS, Windows,
 * Chrome…), avec un timbre propre (hauteur, débit). Les frontières de mots animent la bouche.
 *
 * Les voix enregistrées restent prioritaires : dès que `public/audio/vo-<id>.mp3` existe, il est joué.
 */
import type { CharacterId } from "@/content/characters";

export interface VoiceProfile {
  gender: "m" | "f";
  pitch: number;
  rate: number;
}

/** Timbre de chaque personnage (fiches de l'annexe D). */
export const VOICE_PROFILES: Record<CharacterId | "narrator" | "player" | "huissier", VoiceProfile> = {
  harlow: { gender: "m", pitch: 0.78, rate: 0.9 }, // grave, lent, posé
  huissier: { gender: "m", pitch: 0.8, rate: 0.95 },
  nora: { gender: "f", pitch: 1.08, rate: 1.04 }, // chaleureuse, vive
  mercer: { gender: "m", pitch: 1.05, rate: 1.14 }, // rapide, moqueur
  theo: { gender: "m", pitch: 1.12, rate: 1.08 },
  rourke: { gender: "m", pitch: 0.9, rate: 1.0 }, // défensif
  brandt: { gender: "f", pitch: 0.92, rate: 1.0 }, // froide, précise
  whitford: { gender: "f", pitch: 0.82, rate: 0.93 }, // sèche
  guard: { gender: "m", pitch: 0.72, rate: 0.95 }, // bourru
  narrator: { gender: "m", pitch: 0.95, rate: 0.98 },
  player: { gender: "m", pitch: 1.0, rate: 1.02 },
};

const FEMALE = /am[ée]lie|audrey|aur[ée]lie|marie|virginie|julie|c[ée]line|denise|hortense|sylvie|l[ée]a\b|charlotte|jos[ée]phine|brigitte|eloise|[ée]lo[iï]se|vivienne|coralie|jacqueline|google fran[çc]ais|female|femme/i;
const MALE = /thomas|daniel|nicolas|paul|henri|j[ée]r[ôo]me|yves|claude|mathieu|r[ée]mi|guillaume|antoine|jean|fabrice|gr[ée]goire|alain|male|homme/i;
const QUALITY = /natural|neural|premium|enhanced|online|google|siri/i;

function score(v: SpeechSynthesisVoice): number {
  let s = 0;
  if (/^fr[-_]FR/i.test(v.lang)) s += 4;
  else if (/^fr/i.test(v.lang)) s += 2;
  if (QUALITY.test(v.name)) s += 3;
  if (!v.localService) s += 1; // voix en ligne : souvent de meilleure qualité
  if (/compact|eloquence|espeak/i.test(v.name)) s -= 3;
  return s;
}

function genderOf(v: SpeechSynthesisVoice): "m" | "f" | null {
  if (FEMALE.test(v.name)) return "f";
  if (MALE.test(v.name)) return "m";
  return null;
}

let voices: SpeechSynthesisVoice[] = [];

function refresh(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  voices = window.speechSynthesis
    .getVoices()
    .filter((v) => /^fr/i.test(v.lang))
    .sort((a, b) => score(b) - score(a));
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refresh();
  window.speechSynthesis.addEventListener?.("voiceschanged", refresh);
}

export function ttsAvailable(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  if (!voices.length) refresh();
  return voices.length > 0;
}

/** Meilleure voix française du bon genre ; à défaut la meilleure voix française (le timbre compense). */
export function pickVoice(profile: VoiceProfile, list: SpeechSynthesisVoice[] = voices): SpeechSynthesisVoice | null {
  const same = list.filter((v) => genderOf(v) === profile.gender);
  return same[0] ?? list[0] ?? null;
}

/** État de la parole synthétique en cours (lu par la boucle : niveau de bouche). */
export const ttsState = { speaking: false, pulse: 0, charIndex: 0, length: 1 };

/** Nettoie un sous-titre pour la lecture (guillemets, points de suspension, didascalies). */
export function speakable(text: string): string {
  return text
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/[«»“”"]/g, "")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Dit une réplique. Résout à la fin (ou à l'annulation) ; `false` si la synthèse n'est pas disponible.
 * `volume` 0..1 (bus « voix » des réglages).
 */
export function speak(text: string, who: keyof typeof VOICE_PROFILES, volume: number, signal?: AbortSignal): Promise<boolean> {
  if (!ttsAvailable() || volume <= 0) return Promise.resolve(false);
  const profile = VOICE_PROFILES[who] ?? VOICE_PROFILES.narrator;
  const voice = pickVoice(profile);
  if (!voice) return Promise.resolve(false);
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(speakable(text));
  u.voice = voice;
  u.lang = voice.lang;
  // Si la voix n'est pas du bon genre, on pousse le timbre (hauteur) dans la bonne direction.
  const g = genderOf(voice);
  const shift = g && g !== profile.gender ? (profile.gender === "m" ? -0.22 : 0.22) : 0;
  u.pitch = Math.max(0.1, Math.min(2, profile.pitch + shift));
  u.rate = profile.rate;
  u.volume = Math.max(0, Math.min(1, volume));
  return new Promise<boolean>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      ttsState.speaking = false;
      clearTimeout(guard);
      resolve(true);
    };
    // Garde-fou : certains navigateurs n'émettent jamais `end` (onglet en arrière-plan…).
    const guard = setTimeout(finish, 2500 + text.length * 110);
    u.onstart = () => {
      ttsState.speaking = true;
      ttsState.charIndex = 0;
      ttsState.length = Math.max(1, u.text.length);
    };
    u.onboundary = (e) => {
      ttsState.pulse = 1;
      ttsState.charIndex = e.charIndex;
    };
    u.onend = finish;
    u.onerror = finish;
    signal?.addEventListener(
      "abort",
      () => {
        synth.cancel();
        finish();
      },
      { once: true },
    );
    synth.cancel();
    synth.speak(u);
  });
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  ttsState.speaking = false;
}
