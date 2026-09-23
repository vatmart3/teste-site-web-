"use client";
/**
 * Labo de plans (/lab) : pour régler chaque plate (profondeur, pivot, mise au point, effets) et
 * vérifier les assets générés avec le kit, sans jouer la séquence.
 */
import { useEffect, useState } from "react";
import { SCENES, type SceneId } from "@/content/scenes";
import type { LightVariant, SceneDef } from "@/content/types";
import { audio } from "@/engine/audio/AudioEngine";
import { rig, resetRig } from "@/engine/camera/rig";
import { runSequence } from "@/engine/director/director";
import { EngineRoot } from "@/engine/EngineRoot";
import { fxOverrides } from "@/engine/plate/registry";
import { useUi } from "@/engine/state/ui";
import type { CharacterState } from "@/content/characters";
import { setCharacterState, cast } from "@/engine/characters/performance";
import { grantReputation, hubSequence } from "@/content/sequences/hub";
import { useProfile } from "@/engine/state/profile";
import { rankFor } from "@/engine/career/ranks";

type RigKey = "focus" | "aperture" | "dolly" | "panX" | "panY" | "roll" | "exposure" | "lift";
const RIG_SLIDERS: { key: RigKey; label: string; min: number; max: number }[] = [
  { key: "focus", label: "Mise au point", min: 0, max: 1 },
  { key: "aperture", label: "Ouverture (flou)", min: 0, max: 1.5 },
  { key: "dolly", label: "Poussée avant", min: 0, max: 1.5 },
  { key: "panX", label: "Panoramique X", min: -0.3, max: 0.3 },
  { key: "panY", label: "Panoramique Y", min: -0.4, max: 0.4 },
  { key: "roll", label: "Roulis (°)", min: -6, max: 6 },
  { key: "exposure", label: "Exposition", min: 0, max: 2 },
  { key: "lift", label: "Montée (ascenseur)", min: -0.2, max: 0.6 },
];

type FxKey = "rain" | "fog" | "flicker" | "shaft" | "dust";
const FX: { key: FxKey; label: string; max: number }[] = [
  { key: "rain", label: "Pluie sur la vitre", max: 1.5 },
  { key: "fog", label: "Buée", max: 1 },
  { key: "flicker", label: "Néon qui grésille", max: 1 },
  { key: "shaft", label: "Rayons de lumière", max: 1.5 },
  { key: "dust", label: "Poussière", max: 1.5 },
];

const SFX = ["sfx-badge-print", "sfx-camera-flash", "sfx-footsteps", "sfx-elevator-ding", "sfx-badge-beep", "sfx-phone-vibrate", "sfx-door-revolving", "sfx-paper-slide", "sfx-stamp", "sfx-gavel", "sfx-heartbeat", "sfx-car-door"];

export default function Lab() {
  const [sceneId, setSceneId] = useState<SceneId>("06a-openspace");
  const [variant, setVariant] = useState<LightVariant>("day");
  const [, force] = useState(0);
  const [fx, setFx] = useState<Record<FxKey, number | null>>({ rain: null, fog: null, flicker: null, shaft: null, dust: null });
  const [intensity, setIntensity] = useState(0);
  const letterbox = useUi((s) => s.letterbox);
  const scene: SceneDef = SCENES[sceneId];

  useEffect(() => {
    void runSequence(async (d) => {
      await d.show(sceneId, { variant, transition: "depth", duration: 1, camera: { focus: scene.focus, aperture: scene.aperture, dolly: 0, panX: 0, panY: 0, roll: 0, exposure: 1 } });
      force((n) => n + 1);
      await d.waitForHotspot((scene.hotspots ?? []).map((h) => h.id));
    });
  }, [sceneId, variant, scene]);

  useEffect(() => {
    fxOverrides.rain = fx.rain;
    fxOverrides.fog = fx.fog;
    fxOverrides.flicker = fx.flicker;
    fxOverrides.shaft = fx.shaft;
    fxOverrides.dust = fx.dust;
  }, [fx]);

  return (
    <EngineRoot>
      <details open className="group fixed left-3 top-3 z-50 max-h-[calc(100dvh-1.5rem)] w-72 overflow-y-auto rounded-md border border-brass/30 bg-navy/85 p-4 font-sans text-xs text-ivory backdrop-blur">
        <summary className="cursor-pointer list-none font-serif text-lg text-brass">Labo de plans <span className="text-xs text-ivory/50 group-open:hidden">▸</span></summary>
        <label className="mt-3 block">
          Plan
          <select className="mt-1 w-full rounded bg-black/40 p-1" value={sceneId} onChange={(e) => setSceneId(e.target.value as SceneId)}>
            {Object.values(SCENES).map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.title}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-2 block">
          Lumière
          <select className="mt-1 w-full rounded bg-black/40 p-1" value={variant} onChange={(e) => setVariant(e.target.value as LightVariant)}>
            <option value="day">Jour</option>
            <option value="dusk">Crépuscule</option>
            <option value="night">Nuit</option>
          </select>
        </label>

        {scene.character && (
          <label className="mt-2 block">
            Personnage ({scene.character.id})
            <select
              className="mt-1 w-full rounded bg-black/40 p-1"
              defaultValue="idle"
              key={sceneId}
              onChange={(e) => {
                const st = e.target.value as CharacterState;
                setCharacterState(scene.character!.id, st);
                // « talk » sans voix : on simule la parole pour voir les mouvements de tête.
                cast.speaker = st === "talk" ? scene.character!.id : null;
                cast.typing = st === "talk";
              }}
            >
              {(["idle", "talk", "pleased", "tense", "break"] as const).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
        )}

        <h2 className="mt-4 text-[0.65rem] uppercase tracking-[0.25em] text-brass/80">Caméra</h2>
        {RIG_SLIDERS.map((s) => (
          <label key={s.key} className="mt-1 flex items-center justify-between gap-2">
            <span>{s.label}</span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={0.01}
              defaultValue={rig[s.key]}
              key={`${sceneId}-${s.key}`}
              onChange={(e) => (rig[s.key] = Number(e.target.value))}
              className="w-28 accent-brass"
            />
          </label>
        ))}
        <div className="mt-2 flex flex-wrap gap-1">
          <button className="rounded border border-brass/40 px-2 py-1" onClick={() => (rig.shake = 1)}>
            Secousse
          </button>
          <button className="rounded border border-brass/40 px-2 py-1" onClick={() => useUi.getState().set({ letterbox: !letterbox })}>
            Bandes cinéma
          </button>
          <button
            className="rounded border border-brass/40 px-2 py-1"
            onClick={() => {
              resetRig();
              rig.focus = scene.focus;
              rig.aperture = scene.aperture;
              force((n) => n + 1);
            }}
          >
            Réinitialiser
          </button>
        </div>

        <h2 className="mt-4 text-[0.65rem] uppercase tracking-[0.25em] text-brass/80">Effets (surcharge)</h2>
        {FX.map((f) => (
          <label key={f.key} className="mt-1 flex items-center justify-between gap-2">
            <span>
              <input type="checkbox" className="mr-1 accent-brass" checked={fx[f.key] !== null} onChange={(e) => setFx({ ...fx, [f.key]: e.target.checked ? 0.5 : null })} />
              {f.label}
            </span>
            <input
              type="range"
              min={0}
              max={f.max}
              step={0.01}
              disabled={fx[f.key] === null}
              value={fx[f.key] ?? 0}
              onChange={(e) => setFx({ ...fx, [f.key]: Number(e.target.value) })}
              className="w-24 accent-brass"
            />
          </label>
        ))}

        <h2 className="mt-4 text-[0.65rem] uppercase tracking-[0.25em] text-brass/80">Bureau (hub)</h2>
        <HubControls />

        <h2 className="mt-4 text-[0.65rem] uppercase tracking-[0.25em] text-brass/80">Son</h2>
        <button className="mt-1 w-full rounded border border-brass/40 px-2 py-1" onClick={() => void audio.unlock().then(() => audio.startMusic())}>
          Activer le son + musique
        </button>
        <label className="mt-2 flex items-center justify-between gap-2">
          <span>Tension musicale</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={intensity}
            onChange={(e) => {
              setIntensity(Number(e.target.value));
              audio.setIntensity(Number(e.target.value), 0.5);
            }}
            className="w-28 accent-brass"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1">
          <button className="rounded border border-brass/40 px-2 py-1" onClick={() => audio.cutMusic()}>
            Coupure choc
          </button>
          <button className="rounded border border-brass/40 px-2 py-1" onClick={() => audio.resumeMusic()}>
            Reprise
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {SFX.map((s) => (
            <button key={s} className="truncate rounded bg-black/30 px-1 py-1 text-left" onClick={() => void audio.unlock().then(() => audio.sfx(s, { at: { x: Math.random(), y: 0.6 }, depth: 0.6 }))}>
              {s.replace("sfx-", "")}
            </button>
          ))}
        </div>
      </details>
    </EngineRoot>
  );
}

function HubControls() {
  const rep = useProfile((s) => s.reputation);
  return (
    <div className="mt-1 space-y-1">
      <p className="text-ivory/70">
        Réputation {rep} · {rankFor(rep).title}
      </p>
      <div className="flex flex-wrap gap-1">
        <button className="rounded border border-brass/40 px-2 py-1" onClick={() => void audio.unlock().then(() => runSequence(hubSequence))}>
          Ouvrir le bureau
        </button>
        <button className="rounded border border-brass/40 px-2 py-1" onClick={() => grantReputation(100)}>
          +100 réputation
        </button>
        <button className="rounded border border-brass/40 px-2 py-1" onClick={() => useProfile.getState().reset()}>
          Réinitialiser le profil
        </button>
      </div>
    </div>
  );
}
