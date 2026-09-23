"use client";
import { useCallback, useState } from "react";
import { engineDemo, engineDemoEnd } from "@/content/sequences/engineDemo";
import { audio } from "@/engine/audio/AudioEngine";
import { runSequence } from "@/engine/director/director";
import { EngineRoot, requestGyro } from "@/engine/EngineRoot";
import { isMobileViewport } from "@/engine/device";
import { useSettings } from "@/engine/state/settings";
import { TitleScreen } from "./TitleScreen";

export default function Game() {
  const [started, setStarted] = useState(false);

  const start = useCallback(async () => {
    setStarted(true);
    await audio.unlock();
    if (isMobileViewport() && (await requestGyro())) useSettings.getState().set({ gyro: true });
    // La démo boucle : « Recommencer » relance la séquence.
    for (;;) {
      let r = await runSequence(engineDemo, { skippable: true });
      if (r === "skipped") r = await runSequence(engineDemoEnd);
      if (r === "aborted") break;
    }
  }, []);

  return (
    <EngineRoot>
      {!started && <TitleScreen onStart={() => void start()} />}
      <RotateHint />
    </EngineRoot>
  );
}

/** Invitation à tourner le téléphone (le jeu se joue de préférence en paysage). */
function RotateHint() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-40 hidden justify-center portrait:max-md:flex">
      <p className="rounded-full bg-black/50 px-4 py-2 font-sans text-[0.65rem] uppercase tracking-[0.3em] text-ivory/70">Tournez votre téléphone ↻</p>
    </div>
  );
}
