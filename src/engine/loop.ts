/**
 * Boucle globale (gsap.ticker = un seul requestAnimationFrame) : avance la caméra, met à jour
 * l'auditeur audio et notifie les abonnés HTML (hotspots, plate CSS).
 */
import gsap from "gsap";
import { rig, stepRig } from "./camera/rig";
import { audio } from "./audio/AudioEngine";
import { cast, syntheticSpeech } from "./characters/performance";

type Sub = (dt: number) => void;
const subs = new Set<Sub>();
let installed = false;

export function installLoop(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  // Accès de débogage (tests automatisés, console) : /?debug
  if (new URLSearchParams(window.location.search).has("debug")) {
    (window as unknown as { __bh: unknown }).__bh = { rig, gsap, audio };
  }
  gsap.ticker.lagSmoothing(500, 33);
  gsap.ticker.add((_time, deltaMs) => {
    const dt = Math.min(0.1, deltaMs / 1000);
    stepRig(rig, dt);
    audio.updateListener(rig);
    // Niveau de parole du personnage qui parle : voix réelle, sinon enveloppe pendant la frappe.
    const target = audio.voiceActive ? audio.voiceLevel() : cast.typing ? syntheticSpeech(rig.time) * 0.7 : 0;
    cast.level += (target - cast.level) * Math.min(1, dt * 18);
    for (const s of subs) s(dt);
  });
}

export function onFrame(fn: Sub): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}
