/**
 * Boucle globale (gsap.ticker = un seul requestAnimationFrame) : avance la caméra, met à jour
 * l'auditeur audio et notifie les abonnés HTML (hotspots, plate CSS).
 */
import gsap from "gsap";
import { rig, stepRig } from "./camera/rig";
import { audio } from "./audio/AudioEngine";

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
    for (const s of subs) s(dt);
  });
}

export function onFrame(fn: Sub): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}
