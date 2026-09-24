"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { arrival, resetArrivalState } from "@/content/sequences/arrival";
import { grantReputation } from "@/content/sequences/hub";
import { worldSequence } from "@/content/sequences/world";
import { useWorld, worldBus, worldRuntime } from "@/engine/world/runtime";
import { worldSys } from "@/engine/world/system";
import { audio } from "@/engine/audio/AudioEngine";
import { runSequence, type ShowOptions } from "@/engine/director/director";
import type { SceneId } from "@/content/scenes";
import { rig } from "@/engine/camera/rig";
import { EngineRoot, requestGyro } from "@/engine/EngineRoot";
import { isMobileViewport } from "@/engine/device";
import { useProfile } from "@/engine/state/profile";
import { useSettings } from "@/engine/state/settings";
import { propAnchors, useProps } from "@/engine/props/model";
import { useStage } from "@/engine/state/stage";
import { useRender } from "@/engine/state/render";
import { boardBus, useBoard } from "@/engine/board/state";
import { courtBus, useCourt } from "@/engine/court/state";
import { useUi } from "@/engine/state/ui";
import { roomAnchors } from "@/engine/room/anchors";
import { hubBus, useHub } from "@/engine/hub/state";
import { auditBus, useAudit } from "@/engine/audit/state";
import { useDebrief } from "@/engine/audit/DebriefOverlay";
import { TitleScreen, type TitleChoice } from "./TitleScreen";

export default function Game() {
  const [started, setStarted] = useState(false);

  // Accès de débogage (tests automatisés) : /?debug
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("debug")) {
      (window as unknown as { __game: unknown }).__game = { useProps, useProfile, useStage, useHub, hubBus, grantReputation, propAnchors, useAudit, auditBus, useDebrief, useRender, roomAnchors, rig, useBoard, boardBus, useCourt, courtBus, useUi, useSettings, useWorld, worldRuntime, worldSys, worldBus, show: (id: SceneId, opts: ShowOptions = {}) => runSequence(async (d) => { await d.show(id, opts); await d.hold(); }) };
    }
  }, []);

  const start = useCallback(async (choice: TitleChoice) => {
    setStarted(true);
    await audio.unlock();
    if (isMobileViewport() && (await requestGyro())) useSettings.getState().set({ gyro: true });
    if (choice === "new") useProfile.getState().reset();
    if (choice !== "continue") {
      // L'arrivée n'est sautable qu'une fois vue en entier.
      const r = await runSequence(arrival, { skippable: useProfile.getState().arrivalSeen, onSkip: resetArrivalState });
      if (r === "aborted") return;
    }
    await runSequence(worldSequence);
  }, []);

  // Débogage : /?debug&world entre directement dans l'étage (une seule fois, même en mode strict).
  const autostart = useRef(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (autostart.current || !q.has("debug") || !q.has("world")) return;
    autostart.current = true;
    void start("continue");
  }, [start]);

  return (
    <EngineRoot>
      {!started && <TitleScreen onStart={(c) => void start(c)} />}
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
