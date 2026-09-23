/**
 * Le directeur : exécute des « séquences » écrites comme des fonctions async, avec des helpers
 * de mise en scène (plans, mouvements de caméra GSAP, lettres cinéma, dialogues, hotspots, son).
 * Chaque séquence est annulable (sautable) proprement : toutes les attentes se débloquent et les
 * tweens en cours sont tués.
 */
import gsap from "gsap";
import { getScene, type SceneId } from "@/content/scenes";
import type { LightVariant } from "@/content/types";
import { audio } from "../audio/AudioEngine";
import { rig, resetRig, type CameraRig } from "../camera/rig";
import { preloadPlate, loadPlateTextures } from "../plate/textures";
import { whenPlateReady } from "../plate/registry";
import { useStage, type Transition } from "../state/stage";
import { useUi } from "../state/ui";
import { advanceBus, hotspotBus, panelBus, skipBus } from "./events";
import { CHARACTERS, type CharacterId, type CharacterState } from "@/content/characters";
import { voiceFile, type Line } from "@/content/dialogue/types";
import { cast, setCharacterState, stateOf } from "../characters/performance";
import { displayName, useProfile } from "../state/profile";
import type { Panel } from "../state/ui";

export class Aborted extends Error {
  constructor() {
    super("séquence interrompue");
  }
}

type RigVars = Partial<Pick<CameraRig, "panX" | "panY" | "dolly" | "dollyX" | "dollyY" | "roll" | "lift" | "focus" | "aperture" | "shake" | "exposure" | "lookAmount">>;

export interface ShowOptions {
  variant?: LightVariant;
  transition?: Transition;
  duration?: number;
  /** Change aussi l'ambiance sonore / la réverbération (défaut : oui). */
  sound?: boolean;
  soundFade?: number;
  /** Position de caméra à appliquer au moment où le plan apparaît. */
  camera?: RigVars;
}

export interface SayOptions {
  /** Fichier de voix (annexe D), sans extension. */
  voice?: string;
  /** Durée minimale d'affichage en secondes (sinon calculée d'après la longueur du texte). */
  hold?: number;
}

/** Temps de lecture confortable pour un sous-titre. */
export function readingTime(text: string): number {
  return Math.min(9, 1.4 + text.length * 0.055);
}

export class Director {
  private tweens = new Set<gsap.core.Animation>();
  private cleanup = new Set<() => void>();
  constructor(readonly signal: AbortSignal) {}

  private guard<T>(p: Promise<T>): Promise<T> {
    if (this.signal.aborted) return Promise.reject(new Aborted());
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(new Aborted());
      this.signal.addEventListener("abort", onAbort, { once: true });
      p.then(
        (v) => {
          this.signal.removeEventListener("abort", onAbort);
          resolve(v);
        },
        (e) => {
          this.signal.removeEventListener("abort", onAbort);
          reject(e);
        },
      );
    });
  }

  /** Libère tout ce que la séquence a lancé (appelé à la fin ou à l'interruption). */
  dispose(): void {
    for (const t of this.tweens) t.kill();
    this.tweens.clear();
    for (const c of this.cleanup) c();
    this.cleanup.clear();
  }

  private track<T extends gsap.core.Animation>(t: T): Promise<void> {
    this.tweens.add(t);
    return this.guard(
      new Promise<void>((resolve) => {
        t.eventCallback("onComplete", () => {
          this.tweens.delete(t);
          resolve();
        });
      }),
    );
  }

  wait(seconds: number): Promise<void> {
    return this.track(gsap.delayedCall(seconds, () => undefined));
  }

  /** Attend indéfiniment (jusqu'à l'interruption de la séquence) : le joueur a la main. */
  hold(): Promise<never> {
    return this.guard(new Promise<never>(() => undefined));
  }

  /** Anime la caméra. `duration` en secondes, `ease` GSAP (défaut : power2.inOut). */
  cam(vars: RigVars, duration = 1.5, ease = "power2.inOut"): Promise<void> {
    if (duration <= 0) {
      Object.assign(rig, vars);
      return Promise.resolve();
    }
    return this.track(gsap.to(rig, { ...vars, duration, ease, overwrite: "auto" }));
  }

  /** Mouvement de caméra sans attendre sa fin. */
  camAsync(vars: RigVars, duration = 1.5, ease = "power2.inOut"): void {
    void this.cam(vars, duration, ease).catch(() => undefined);
  }

  /** Mise au point qui glisse vers une profondeur (vers le personnage qui parle). */
  focus(depth: number, duration = 0.9, aperture?: number): Promise<void> {
    return this.cam(aperture === undefined ? { focus: depth } : { focus: depth, aperture }, duration, "power2.out");
  }

  shake(amount = 0.6): void {
    rig.shake = Math.max(rig.shake, amount);
  }

  preload(id: SceneId, variant?: LightVariant): void {
    preloadPlate(getScene(id), variant);
  }

  /** Affiche un plan avec transition (cut, fondu, fondu de profondeur : le proche apparaît d'abord). */
  async show(id: SceneId, opts: ShowOptions = {}): Promise<void> {
    const scene = getScene(id);
    const transition = opts.transition ?? "depth";
    const duration = opts.duration ?? 1.4;
    await this.guard(loadPlateTextures(scene, opts.variant));
    const inst = useStage.getState().push({ sceneId: id, variant: opts.variant, transition });
    const h = await this.guard(whenPlateReady(inst.key));
    if (opts.camera) Object.assign(rig, opts.camera);
    if (opts.sound !== false) void audio.setPlace(scene.reverb, scene.ambience, scene.sounds, opts.soundFade ?? duration);
    try {
      if (transition === "fade") await this.track(gsap.to(h.uniforms.uOpacity, { value: 1, duration, ease: "power1.inOut" }));
      else if (transition === "depth") await this.track(gsap.to(h.uniforms.uReveal, { value: 1, duration, ease: "power2.inOut" }));
      else if (transition === "doors") await this.track(gsap.to(h.uniforms.uReveal, { value: 1, duration, ease: "power3.inOut" }));
    } finally {
      h.uniforms.uOpacity.value = 1;
      h.uniforms.uReveal.value = 1;
      useStage.getState().settle(inst.key);
    }
  }

  /** Ferme (true) ou ouvre (false) les bandes noires 2,35:1. */
  letterbox(on: boolean): Promise<void> {
    useUi.getState().set({ letterbox: on });
    return this.wait(0.9);
  }

  /** Fondu au noir (1) / depuis le noir (0). */
  fadeBlack(to: 0 | 1, duration = 0.8): Promise<void> {
    return this.cam({ exposure: to === 1 ? 0 : 1 }, duration, "power1.inOut");
  }

  prompt(text: string | null): void {
    useUi.getState().set({ prompt: text });
  }

  /** Réplique sous-titrée (et doublée si le fichier de voix existe). Clic = passer. */
  async say(speaker: string | undefined, text: string, opts: SayOptions = {}): Promise<void> {
    const id = Date.now() + Math.random();
    useUi.getState().set({ subtitle: { id, speaker, text } });
    const ctrl = new AbortController();
    const voice = opts.voice ? audio.voice(opts.voice, ctrl.signal) : Promise.resolve(null);
    const timed = voice.then((r) => (r === null ? this.wait(opts.hold ?? readingTime(text)) : undefined));
    let off: () => void = () => undefined;
    const advanced = new Promise<void>((resolve) => {
      off = advanceBus.on(() => resolve());
    });
    try {
      await this.guard(Promise.race([timed, advanced]));
    } finally {
      off();
      ctrl.abort();
      if (useUi.getState().subtitle?.id === id) useUi.getState().set({ subtitle: null });
    }
  }

  /** Anime n'importe quel objet mutable (accessoire 3D, uniform…) et attend la fin. */
  tween<T extends object>(target: T, vars: gsap.TweenVars, duration = 1, ease = "power2.inOut"): Promise<void> {
    return this.track(gsap.to(target, { ...vars, duration, ease }));
  }

  /** Anime sans attendre (l'animation est tout de même annulée si la séquence est interrompue). */
  tweenAsync<T extends object>(target: T, vars: gsap.TweenVars, duration = 1, ease = "power2.inOut"): Promise<void> {
    const p = this.tween(target, vars, duration, ease);
    p.catch(() => undefined);
    return p;
  }

  /** Change l'état de jeu d'un personnage (fondu enchaîné de sa vidéo, micro-signes). */
  mood(id: CharacterId, state: CharacterState): void {
    setCharacterState(id, state);
  }

  /** Réplique écrite dans /content : nom affiché, voix, et le personnage passe en état « talk ». */
  async line(l: Line, opts: { state?: CharacterState; after?: CharacterState; hold?: number } = {}): Promise<void> {
    const id = l.speaker in CHARACTERS ? (l.speaker as CharacterId) : null;
    const before = id ? stateOf(id) : "idle";
    if (id) {
      cast.speaker = id;
      setCharacterState(id, opts.state ?? "talk");
    }
    try {
      await this.say(speakerLabel(l.speaker), fillTemplate(l.text), { voice: voiceFile(l), hold: opts.hold });
    } finally {
      if (id) {
        setCharacterState(id, opts.after ?? (before === "talk" ? "idle" : before));
        if (cast.speaker === id) cast.speaker = null;
      }
    }
  }

  /** Attend le prochain événement d'un bus (actions du bureau…). */
  async waitBus<T>(on: (h: (v: T) => void) => () => void): Promise<T> {
    let off: () => void = () => undefined;
    try {
      return await this.guard(
        new Promise<T>((resolve) => {
          off = on(resolve);
        }),
      );
    } finally {
      off();
    }
  }

  /** Ouvre un panneau d'interaction (identité, choix, geste) et attend la réponse du joueur. */
  async panel<T>(panel: Panel): Promise<T> {
    useUi.getState().set({ panel });
    let off: () => void = () => undefined;
    try {
      return await this.guard(
        new Promise<T>((resolve) => {
          off = panelBus.on((v) => resolve(v as T));
        }),
      );
    } finally {
      off();
      useUi.getState().set({ panel: null });
    }
  }

  /** Propose un ou plusieurs hotspots du plan courant et attend le clic du joueur. */
  async waitForHotspot(ids: string | string[], prompt?: string): Promise<string> {
    const list = Array.isArray(ids) ? ids : [ids];
    const ui = useUi.getState();
    ui.set({ activeHotspots: list, prompt: prompt ?? null });
    let off: () => void = () => undefined;
    try {
      return await this.guard(
        new Promise<string>((resolve) => {
          off = hotspotBus.on((id) => {
            if (list.includes(id)) resolve(id);
          });
        }),
      );
    } finally {
      off();
      useUi.getState().set({ activeHotspots: [], prompt: null });
    }
  }

  sfx(name: string, opts?: Parameters<typeof audio.sfx>[1]): void {
    void audio.sfx(name, opts);
  }

  readonly music = {
    start: () => void audio.startMusic(),
    intensity: (i: number, fade?: number) => audio.setIntensity(i, fade),
    cut: () => audio.cutMusic(),
    resume: (fade?: number) => audio.resumeMusic(fade),
    /** 20000 = ouvert ; ~1400 = haut-parleur d'ascenseur. */
    filter: (freq: number, seconds?: number) => audio.setMusicFilter(freq, seconds),
  };
}

/** Nom affiché dans les sous-titres. */
export function speakerLabel(speaker: string): string | undefined {
  if (speaker === "narrator") return undefined;
  if (speaker === "sms") return "SMS — R. Harlow";
  if (speaker === "player") return displayName(useProfile.getState()) || "Vous";
  return CHARACTERS[speaker as CharacterId]?.name ?? speaker;
}

/** Remplace {firstName}, {lastName}, {fullName} par l'identité du joueur. */
export function fillTemplate(text: string, p = useProfile.getState()): string {
  return text
    .replace(/\{firstName\}/g, p.firstName || "vous")
    .replace(/\{lastName\}/g, p.lastName)
    .replace(/\{fullName\}/g, displayName(p) || "vous");
}

export type Sequence = (d: Director) => Promise<void>;

export interface RunOptions {
  /** Affiche le bouton « Passer » ; `onSkip` doit amener l'état final de la séquence. */
  skippable?: boolean;
  onSkip?: () => void | Promise<void>;
}

let current: AbortController | null = null;

/** Lance une séquence (en interrompant la précédente). Résout à la fin, qu'elle soit jouée ou sautée. */
export async function runSequence(seq: Sequence, opts: RunOptions = {}): Promise<"done" | "skipped" | "aborted"> {
  current?.abort();
  const ctrl = new AbortController();
  current = ctrl;
  const d = new Director(ctrl.signal);
  let skipped = false;
  const offSkip = opts.skippable
    ? skipBus.on(() => {
        skipped = true;
        ctrl.abort();
      })
    : () => undefined;
  useUi.getState().set({ skippable: !!opts.skippable });
  try {
    await seq(d);
    return "done";
  } catch (e) {
    if (!(e instanceof Aborted)) throw e;
    if (skipped) {
      d.dispose();
      useUi.getState().set({ subtitle: null, activeHotspots: [], prompt: null });
      resetRig();
      await opts.onSkip?.();
      return "skipped";
    }
    return "aborted";
  } finally {
    offSkip();
    d.dispose();
    if (current === ctrl) {
      current = null;
      useUi.getState().set({ skippable: false });
    }
  }
}
