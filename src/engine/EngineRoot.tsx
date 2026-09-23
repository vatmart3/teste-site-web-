"use client";
/**
 * Racine du moteur : choisit le rendu (WebGL cinéma / WebGL équilibré / CSS), branche la souris,
 * le doigt et le gyroscope sur la caméra, synchronise les réglages avec l'audio, et pose les
 * surcouches (lettres cinéma, sous-titres, hotspots, contrôles).
 */
import { useEffect, useState, type ReactNode } from "react";
import { audio } from "./audio/AudioEngine";
import { pointerToLook, rig } from "./camera/rig";
import { CssStage } from "./CssStage";
import { prefersReducedMotion, resolveQuality, type Quality } from "./device";
import { installLoop } from "./loop";
import { StageCanvas } from "./StageCanvas";
import { useSettings } from "./state/settings";
import { Controls } from "./ui/Controls";
import { Hotspots } from "./ui/Hotspots";
import { Letterbox } from "./ui/Letterbox";
import { Prompt } from "./ui/Prompt";
import { Subtitles } from "./ui/Subtitles";

function useInput(gyro: boolean) {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch" && gyro) return;
      const p = pointerToLook(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
      rig.targetX = p.x;
      rig.targetY = p.y;
    };
    const leave = () => {
      rig.targetX = 0;
      rig.targetY = 0;
    };
    let baseBeta: number | null = null;
    const orient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      baseBeta ??= e.beta;
      const landscape = window.innerWidth > window.innerHeight;
      const x = landscape ? (e.beta - baseBeta) / 20 : e.gamma / 20;
      const y = landscape ? -e.gamma / 25 : -(e.beta - baseBeta) / 25;
      rig.targetX = Math.max(-1, Math.min(1, x));
      rig.targetY = Math.max(-1, Math.min(1, y));
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    if (gyro) window.addEventListener("deviceorientation", orient);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("deviceorientation", orient);
    };
  }, [gyro]);
}

/** Demande l'autorisation du gyroscope (iOS) — doit être appelée dans un geste utilisateur. */
export async function requestGyro(): Promise<boolean> {
  const D = (globalThis as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  if (D?.requestPermission) {
    try {
      return (await D.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return true;
}

export function EngineRoot({ children }: { children?: ReactNode }) {
  const settings = useSettings();
  const [quality, setQuality] = useState<Quality | null>(null);

  useEffect(() => {
    installLoop();
  }, []);

  useEffect(() => {
    setQuality(resolveQuality(settings.quality));
  }, [settings.quality]);

  useEffect(() => {
    rig.reducedMotion = prefersReducedMotion(settings.motion);
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => (rig.reducedMotion = prefersReducedMotion(useSettings.getState().motion));
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [settings.motion]);

  useEffect(() => {
    audio.setVolumes({ master: settings.master, music: settings.music, voice: settings.voice, sfx: settings.sfx, muted: settings.muted });
  }, [settings.master, settings.music, settings.voice, settings.sfx, settings.muted]);

  useInput(settings.gyro);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05070c] select-none">
      {quality === "css" ? <CssStage /> : quality ? <StageCanvas quality={quality} /> : null}
      <Hotspots />
      <Letterbox />
      <Subtitles />
      <Prompt />
      {children}
      <Controls />
    </div>
  );
}
