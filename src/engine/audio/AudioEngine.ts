/**
 * Moteur audio : Web Audio API.
 * - Bus : master → (musique, voix, effets, ambiance) avec réglages de volume.
 * - Réverbération par lieu (convolution, réponses impulsionnelles synthétiques) en fondu croisé.
 * - Sources spatialisées (PannerNode HRTF) placées dans la plate ; l'auditeur suit la caméra.
 * - Musique adaptative en stems synchronisés.
 * - Chaque son nommé se charge depuis /public/audio (cf. manifeste) ou retombe sur un son synthétisé.
 *
 * Choix : pas de Howler ici — le routage (bus, envois de réverbération, panners) demande l'accès direct
 * aux nœuds Web Audio, et Howler n'apporterait qu'une couche de plus.
 */
import type { ReverbPreset, SpatialSoundDef } from "@/content/types";
import type { CameraRig } from "../camera/rig";
import { loadManifest, resolveAudio } from "../assets/manifest";
import { impulseResponse, synthBuffer } from "./synth";

export interface Volumes {
  master: number;
  music: number;
  voice: number;
  sfx: number;
  muted: boolean;
}

interface ReverbSpec {
  seconds: number;
  decay: number;
  damp: number;
  wet: number;
}

export const REVERBS: Record<ReverbPreset, ReverbSpec> = {
  none: { seconds: 0.05, decay: 4, damp: 0.5, wet: 0 },
  car: { seconds: 0.25, decay: 5, damp: 0.9, wet: 0.08 },
  street: { seconds: 1.4, decay: 3, damp: 0.5, wet: 0.15 },
  marble: { seconds: 3.6, decay: 2.2, damp: 0.2, wet: 0.35 },
  elevator: { seconds: 0.4, decay: 4, damp: 0.7, wet: 0.12 },
  office: { seconds: 0.6, decay: 4, damp: 0.85, wet: 0.1 },
  openspace: { seconds: 1.1, decay: 3.5, damp: 0.7, wet: 0.16 },
  court: { seconds: 1.8, decay: 2.8, damp: 0.6, wet: 0.24 },
  conference: { seconds: 0.8, decay: 3.8, damp: 0.75, wet: 0.12 },
};

/** Profondeur de plate (0 = infini, 1 = contre l'objectif) → distance en mètres fictifs. */
export function depthToMeters(depth: number): number {
  return 0.6 + (1 - Math.max(0, Math.min(1, depth))) * 14;
}

/** Position 3D (repère auditeur) d'un point de la plate. */
export function platePointTo3D(at: { x: number; y: number }, depth: number): [number, number, number] {
  const z = depthToMeters(depth);
  // Champ horizontal ≈ 60° : l'écart latéral grandit avec la distance.
  return [(at.x - 0.5) * 2 * z * 0.58, (0.5 - at.y) * 2 * z * 0.33, -z];
}

interface Playing {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

export type MusicLayer = "base" | "bass" | "drums";
const STEMS: Record<MusicLayer, string> = { base: "mus-office-base", bass: "mus-tension-bass", drums: "mus-tension-drums" };

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses!: Record<"music" | "voice" | "sfx" | "amb", GainNode>;
  private reverbA!: { conv: ConvolverNode; send: GainNode };
  private reverbB!: { conv: ConvolverNode; send: GainNode };
  private reverbInput!: GainNode;
  private activeReverb: "A" | "B" = "A";
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private ambiences = new Map<string, Playing>();
  private spatial = new Map<string, Playing & { panner: PannerNode }>();
  private music: Partial<Record<MusicLayer, Playing>> = {};
  private musicGains: Record<MusicLayer, number> = { base: 0, bass: 0, drums: 0 };
  private musicCut = false;
  private volumes: Volumes = { master: 0.9, music: 0.6, voice: 1, sfx: 0.9, muted: false };
  private listeners = new Set<() => void>();
  private voiceAnalyser: AnalyserNode | null = null;
  private voiceBuf: Float32Array<ArrayBuffer> | null = null;
  private voicesPlaying = 0;
  private musicFilter: BiquadFilterNode | null = null;

  get unlocked(): boolean {
    return !!this.ctx && this.ctx.state === "running";
  }

  /** À appeler dans un geste utilisateur (clic) : les navigateurs bloquent l'audio sinon. */
  async unlock(): Promise<void> {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor({ latencyHint: "interactive" });
      this.ctx = ctx;
      this.master = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.buses = {
        music: ctx.createGain(),
        voice: ctx.createGain(),
        sfx: ctx.createGain(),
        amb: ctx.createGain(),
      };
      for (const b of Object.values(this.buses)) b.connect(this.master);
      // Musique : filtre passe-bas (haut-parleur d'ascenseur, musique « derrière une porte »).
      this.buses.music.disconnect();
      this.musicFilter = ctx.createBiquadFilter();
      this.musicFilter.type = "lowpass";
      this.musicFilter.frequency.value = 20000;
      this.buses.music.connect(this.musicFilter).connect(this.master);
      // Analyse de la voix : l'amplitude pilote les mouvements de tête / de bouche des personnages.
      this.voiceAnalyser = ctx.createAnalyser();
      this.voiceAnalyser.fftSize = 512;
      this.voiceBuf = new Float32Array(this.voiceAnalyser.fftSize);
      this.buses.voice.connect(this.voiceAnalyser);
      this.reverbInput = ctx.createGain();
      const mk = () => {
        const conv = ctx.createConvolver();
        const send = ctx.createGain();
        send.gain.value = 0;
        this.reverbInput.connect(conv).connect(send).connect(this.master);
        return { conv, send };
      };
      this.reverbA = mk();
      this.reverbB = mk();
      this.applyVolumes();
    }
    if (this.ctx.state !== "running") await this.ctx.resume();
    this.emit();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    for (const l of this.listeners) l();
  }

  setVolumes(v: Volumes): void {
    this.volumes = v;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = this.volumes;
    this.master.gain.setTargetAtTime(v.muted ? 0 : v.master, t, 0.05);
    this.buses.music.gain.setTargetAtTime(v.music, t, 0.05);
    this.buses.voice.gain.setTargetAtTime(v.voice, t, 0.05);
    this.buses.sfx.gain.setTargetAtTime(v.sfx, t, 0.05);
    this.buses.amb.gain.setTargetAtTime(v.sfx * 0.8, t, 0.05);
  }

  /** Charge un son par son nom (annexe C) : fichier si présent, sinon synthèse. */
  load(name: string): Promise<AudioBuffer | null> {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);
    let p = this.buffers.get(name);
    if (!p) {
      p = loadManifest().then(async (m) => {
        const url = resolveAudio(m, name);
        if (url) {
          try {
            const res = await fetch(url);
            return await ctx.decodeAudioData(await res.arrayBuffer());
          } catch {
            /* on retombe sur la synthèse */
          }
        }
        return synthBuffer(ctx, name);
      });
      this.buffers.set(name, p);
    }
    return p;
  }

  preload(names: string[]): Promise<unknown> {
    return Promise.all(names.map((n) => this.load(n)));
  }

  private startSource(buf: AudioBuffer, dest: AudioNode, opts: { loop?: boolean; volume?: number; rate?: number; send?: number; when?: number; offset?: number }): Playing {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = !!opts.loop;
    src.playbackRate.value = opts.rate ?? 1;
    const gain = ctx.createGain();
    gain.gain.value = opts.volume ?? 1;
    src.connect(gain).connect(dest);
    if (opts.send) {
      const s = ctx.createGain();
      s.gain.value = opts.send;
      gain.connect(s).connect(this.reverbInput);
    }
    src.start(opts.when ?? 0, opts.offset ?? 0);
    return { src, gain };
  }

  private fadeOutAndStop(p: Playing, seconds: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    p.gain.gain.cancelScheduledValues(t);
    p.gain.gain.setValueAtTime(p.gain.gain.value, t);
    p.gain.gain.linearRampToValueAtTime(0, t + seconds);
    try {
      p.src.stop(t + seconds + 0.05);
    } catch {
      /* déjà arrêté */
    }
  }

  /**
   * Change de lieu : réverbération, nappes d'ambiance et sources spatialisées, en fondu croisé.
   * Les ambiances communes aux deux lieux continuent sans coupure.
   */
  async setPlace(reverb: ReverbPreset, ambience: string[], sounds: SpatialSoundDef[] = [], fade = 1.5): Promise<void> {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Réverbération : on charge la nouvelle IR dans le convolveur inactif puis fondu croisé.
    const spec = REVERBS[reverb];
    const next = this.activeReverb === "A" ? this.reverbB : this.reverbA;
    const prev = this.activeReverb === "A" ? this.reverbA : this.reverbB;
    next.conv.buffer = impulseResponse(ctx, spec.seconds, spec.decay, spec.damp);
    next.send.gain.setTargetAtTime(spec.wet, t, fade / 3);
    prev.send.gain.setTargetAtTime(0, t, fade / 3);
    this.activeReverb = this.activeReverb === "A" ? "B" : "A";

    for (const [name, p] of this.ambiences) {
      if (!ambience.includes(name)) {
        this.fadeOutAndStop(p, fade);
        this.ambiences.delete(name);
      }
    }
    for (const [id, p] of this.spatial) {
      if (!sounds.some((s) => s.id === id)) {
        this.fadeOutAndStop(p, fade);
        this.spatial.delete(id);
      }
    }

    await Promise.all([
      ...ambience.map(async (name) => {
        if (this.ambiences.has(name)) return;
        const buf = await this.load(name);
        if (!buf || this.ambiences.has(name)) return;
        const p = this.startSource(buf, this.buses.amb, { loop: true, volume: 0, send: 0.3, offset: Math.random() * buf.duration });
        p.gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + fade);
        this.ambiences.set(name, p);
      }),
      ...sounds.map(async (s) => {
        if (this.spatial.has(s.id)) return;
        const buf = await this.load(s.sound);
        if (!buf || this.spatial.has(s.id)) return;
        const panner = this.makePanner(s.at, s.depth);
        panner.connect(this.buses.sfx);
        const p = this.startSource(buf, panner, { loop: s.loop ?? true, volume: 0, send: 0.5, offset: Math.random() * buf.duration });
        p.gain.gain.linearRampToValueAtTime(s.volume ?? 0.5, ctx.currentTime + fade);
        this.spatial.set(s.id, { ...p, panner });
      }),
    ]);
  }

  private makePanner(at: { x: number; y: number }, depth: number): PannerNode {
    const ctx = this.ctx!;
    const [x, y, z] = platePointTo3D(at, depth);
    return new PannerNode(ctx, {
      panningModel: "HRTF",
      distanceModel: "inverse",
      refDistance: 1.5,
      rolloffFactor: 0.8,
      positionX: x,
      positionY: y,
      positionZ: z,
    });
  }

  /** Bruitage ponctuel, éventuellement positionné dans la plate. Renvoie la durée du son. */
  async sfx(name: string, opts: { at?: { x: number; y: number }; depth?: number; volume?: number; rate?: number } = {}): Promise<number> {
    if (!this.ctx) return 0;
    const buf = await this.load(name);
    if (!buf) return 0;
    let dest: AudioNode = this.buses.sfx;
    if (opts.at) {
      const panner = this.makePanner(opts.at, opts.depth ?? 0.8);
      panner.connect(this.buses.sfx);
      dest = panner;
    }
    this.startSource(buf, dest, { volume: opts.volume ?? 1, rate: opts.rate, send: 0.6 });
    return buf.duration / (opts.rate ?? 1);
  }

  private loops = new Map<string, Playing>();

  /** Boucle d'ambiance ponctuelle (ventilateur de l'ordinateur…), arrêtée avec stopLoop. */
  async startLoop(id: string, name: string, volume = 0.4, fade = 0.6): Promise<void> {
    if (!this.ctx || this.loops.has(id)) return;
    const buf = await this.load(name);
    if (!buf || this.loops.has(id)) return;
    const p = this.startSource(buf, this.buses.amb, { loop: true, volume: 0 });
    p.gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + fade);
    this.loops.set(id, p);
  }

  stopLoop(id: string, fade = 0.6): void {
    const p = this.loops.get(id);
    if (!p) return;
    this.fadeOutAndStop(p, fade);
    this.loops.delete(id);
  }

  /** Réplique doublée. Résout à la fin de la lecture ; `null` si le fichier n'existe pas (pas de synthèse de voix). */
  async voice(name: string, signal?: AbortSignal): Promise<null | void> {
    if (!this.ctx) return null;
    const m = await loadManifest();
    if (!resolveAudio(m, name)) return null;
    const buf = await this.load(name);
    if (!buf) return null;
    // Duck de la musique et de l'ambiance pendant la voix.
    const t = this.ctx.currentTime;
    this.buses.music.gain.setTargetAtTime(this.volumes.music * 0.45, t, 0.15);
    this.buses.amb.gain.setTargetAtTime(this.volumes.sfx * 0.5, t, 0.15);
    const p = this.startSource(buf, this.buses.voice, { send: 0.35 });
    this.voicesPlaying++;
    await new Promise<void>((resolve) => {
      p.src.onended = () => resolve();
      signal?.addEventListener("abort", () => {
        this.fadeOutAndStop(p, 0.1);
        resolve();
      });
    });
    this.voicesPlaying = Math.max(0, this.voicesPlaying - 1);
    this.applyVolumes();
  }

  /** Baisse musique et ambiance pendant une voix de synthèse (qui ne passe pas par Web Audio). */
  duck(on: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.buses.music.gain.setTargetAtTime(this.volumes.music * (on ? 0.45 : 1), t, 0.15);
    this.buses.amb.gain.setTargetAtTime(this.volumes.sfx * (on ? 0.5 : 0.8), t, 0.15);
  }

  /** Une voix doublée est-elle en cours ? */
  get voiceActive(): boolean {
    return this.voicesPlaying > 0;
  }

  /** Amplitude (RMS, ~0..1) de la voix en cours. */
  voiceLevel(): number {
    const a = this.voiceAnalyser;
    const b = this.voiceBuf;
    if (!a || !b || !this.voicesPlaying) return 0;
    a.getFloatTimeDomainData(b);
    let sum = 0;
    for (let i = 0; i < b.length; i++) sum += b[i]! * b[i]!;
    return Math.min(1, Math.sqrt(sum / b.length) * 5);
  }

  /** Filtre de la musique : 20000 = ouvert, ~1200 = petit haut-parleur d'ascenseur. */
  setMusicFilter(freq: number, seconds = 0.5): void {
    if (!this.ctx || !this.musicFilter) return;
    const t = this.ctx.currentTime;
    this.musicFilter.frequency.cancelScheduledValues(t);
    this.musicFilter.frequency.setValueAtTime(this.musicFilter.frequency.value, t);
    this.musicFilter.frequency.exponentialRampToValueAtTime(Math.max(40, freq), t + Math.max(0.01, seconds));
  }

  // --------------------------------------------------------------------- Musique adaptative
  async startMusic(): Promise<void> {
    if (!this.ctx || this.music.base) return;
    const bufs = await Promise.all((Object.keys(STEMS) as MusicLayer[]).map(async (k) => [k, await this.load(STEMS[k])] as const));
    if (this.music.base) return;
    const when = this.ctx.currentTime + 0.1;
    for (const [k, buf] of bufs) {
      if (!buf) continue;
      this.music[k] = this.startSource(buf, this.buses.music, { loop: true, volume: 0, when });
    }
    this.applyMusic(2);
  }

  /** Intensité 0..1 : 0 = base seule, 0,5 = + basse, 1 = + percussions. */
  setIntensity(intensity: number, fade = 1.5): void {
    const i = Math.max(0, Math.min(1, intensity));
    this.musicGains = { base: 0.55, bass: Math.min(1, i * 2) * 0.6, drums: Math.max(0, i * 2 - 1) * 0.55 };
    this.applyMusic(fade);
  }

  /** Coupe tout net (moment choc), `resume()` pour relancer. */
  cutMusic(): void {
    this.musicCut = true;
    this.applyMusic(0.02);
  }

  resumeMusic(fade = 2): void {
    this.musicCut = false;
    this.applyMusic(fade);
  }

  private applyMusic(fade: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const k of Object.keys(STEMS) as MusicLayer[]) {
      const p = this.music[k];
      if (!p) continue;
      p.gain.gain.cancelScheduledValues(t);
      p.gain.gain.setValueAtTime(p.gain.gain.value, t);
      p.gain.gain.linearRampToValueAtTime(this.musicCut ? 0 : this.musicGains[k], t + Math.max(0.02, fade));
    }
  }

  // --------------------------------------------------------------------- Auditeur = caméra
  updateListener(r: CameraRig): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const l = ctx.listener;
    const t = ctx.currentTime;
    // La tête se déplace légèrement avec la parallaxe et tourne avec le panoramique.
    const x = r.offset.x * 20;
    const y = r.offset.y * 12;
    const yaw = r.pan.x * 4;
    const fx = Math.sin(yaw);
    const fz = -Math.cos(yaw);
    if (l.positionX) {
      l.positionX.setTargetAtTime(x, t, 0.05);
      l.positionY.setTargetAtTime(y, t, 0.05);
      l.positionZ.setTargetAtTime(-r.dolly * 4, t, 0.05);
      l.forwardX.setTargetAtTime(fx, t, 0.05);
      l.forwardY.setTargetAtTime(r.pan.y * 2, t, 0.05);
      l.forwardZ.setTargetAtTime(fz, t, 0.05);
    } else {
      (l as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(x, y, -r.dolly * 4);
    }
  }
}

export const audio = new AudioEngine();
