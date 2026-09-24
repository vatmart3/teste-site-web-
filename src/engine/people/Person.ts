/**
 * Un personnage vivant : mélange d'animations capturées (locomotion idle / marche / course selon la vitesse,
 * actions ponctuelles ou en boucle, couches haut / bas du corps), puis retouches procédurales après le
 * mixeur : regard (cou, tête, yeux), clignements, micro-saccades, respiration, bouche pilotée par la voix,
 * expressions (sourire, froncement, sourcils), objet tenu en main.
 */
import * as THREE from "three";
import { instantiate, loadAnims, type ClipInfo } from "./assets";

export type Mask = "full" | "upper" | "lower";

const UPPER = new Set(["LowerBack", "Spine", "Spine1", "Neck", "Neck1", "Head", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "LeftFingerBase", "LeftHandFinger1", "LThumb", "RightShoulder", "RightArm", "RightForeArm", "RightHand", "RightFingerBase", "RightHandFinger1", "RThumb"]);

export interface Expression {
  smile: number;
  frown: number;
  browUp: number;
  browInner: number;
  browDown: number;
  squint: number;
  press: number;
}

const ZERO_EXPR: Expression = { smile: 0, frown: 0, browUp: 0, browInner: 0, browDown: 0, squint: 0, press: 0 };

const clipCache = new Map<string, THREE.AnimationClip>();

/** Clip adapté à la silhouette (translation des hanches mise à l'échelle) et filtré par masque. */
function adaptClip(src: THREE.AnimationClip, scale: number, mask: Mask): THREE.AnimationClip {
  const key = `${src.name}|${scale.toFixed(2)}|${mask}`;
  const hit = clipCache.get(key);
  if (hit) return hit;
  const tracks: THREE.KeyframeTrack[] = [];
  for (const t of src.tracks) {
    const bone = t.name.split(".")[0]!;
    if (mask === "upper" && !UPPER.has(bone)) continue;
    if (mask === "lower" && UPPER.has(bone)) continue;
    if (t.name.endsWith(".position")) {
      if (mask === "upper") continue;
      const c = t.clone();
      for (let i = 0; i < c.values.length; i++) c.values[i]! *= scale;
      tracks.push(c);
    } else tracks.push(t);
  }
  const c = new THREE.AnimationClip(key, src.duration, tracks);
  clipCache.set(key, c);
  return c;
}

const V = new THREE.Vector3();
const V2 = new THREE.Vector3();
const Q = new THREE.Quaternion();
const Q2 = new THREE.Quaternion();
const M = new THREE.Matrix4();
const E = new THREE.Euler();
const FWD = new THREE.Vector3(0, 0, 1);
const AUTO = new THREE.Vector3();

export class Person {
  readonly id: string;
  readonly root = new THREE.Group();
  model: THREE.Object3D | null = null;
  ready: Promise<void>;
  height = 1.75;
  private mixer: THREE.AnimationMixer | null = null;
  private clips = new Map<string, THREE.AnimationClip>();
  private info: Record<string, ClipInfo> = {};
  private scale = 1;
  private bones: Record<string, THREE.Bone> = {};
  private faces: THREE.Mesh[] = [];
  private loco: Record<string, THREE.AnimationAction> = {};
  private layer: { action: THREE.AnimationAction; name: string; mask: Mask } | null = null;
  private lowerLayer: THREE.AnimationAction | null = null;
  private onceDone: (() => void) | null = null;
  /** Vitesse de déplacement actuelle (m/s), posée par le propriétaire (joueur, PNJ). */
  speed = 0;
  /** Style de marche : « walk » ou « walkSlow » quand il flâne. */
  gait: "walk" | "walkSlow" = "walk";
  /** Posture de base quand il est immobile. */
  base: string = "idle";
  /** Point regardé (monde) ; null = droit devant. */
  lookAt: THREE.Vector3 | null = null;
  lookWeight = 1;
  /** Niveau de parole 0..1 (voix, sous-titres). */
  talk = 0;
  expr: Expression = { ...ZERO_EXPR };
  private exprCur: Expression = { ...ZERO_EXPR };
  private t = Math.random() * 10;
  private blinkAt = 1 + Math.random() * 3;
  private blink = 0;
  private sacc = new THREE.Vector2();
  private saccAt = 0.5;
  private headOff = new THREE.Quaternion();
  private eyeOff = { L: new THREE.Quaternion(), R: new THREE.Quaternion() };
  private held: THREE.Object3D | null = null;
  private heldHand: "left" | "right" = "right";

  constructor(id: string) {
    this.id = id;
    this.root.name = `person:${id}`;
    this.ready = this.load();
  }

  private async load() {
    const [model, anims] = await Promise.all([instantiate(this.id), loadAnims()]);
    this.model = model;
    this.root.add(model);
    this.height = (model.userData.height as number) ?? 1.75;
    const hips = (model.userData.hips as number) ?? anims.hips;
    this.scale = hips / anims.hips;
    this.info = anims.info;
    for (const [k, c] of anims.clips) this.clips.set(k, c);
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) this.bones[o.name] = o as THREE.Bone;
      const m = o as THREE.Mesh;
      if (m.isMesh && m.morphTargetDictionary && "blinkL" in m.morphTargetDictionary) this.faces.push(m);
    });
    this.mixer = new THREE.AnimationMixer(model);
    for (const n of ["idle", "walk", "walkSlow", "jog"]) {
      const a = this.action(n, "full");
      if (!a) continue;
      a.play();
      a.setEffectiveWeight(n === "idle" ? 1 : 0);
      this.loco[n] = a;
    }
    this.mixer.addEventListener("finished", (e) => {
      if (this.layer && e.action === this.layer.action) {
        const cb = this.onceDone;
        this.onceDone = null;
        this.stop(0.35);
        cb?.();
      }
    });
    this.mixer.update(0);
  }

  private action(name: string, mask: Mask): THREE.AnimationAction | null {
    const src = this.clips.get(name);
    if (!src || !this.mixer) return null;
    return this.mixer.clipAction(adaptClip(src, this.scale, mask));
  }

  clipInfo(name: string): ClipInfo | undefined {
    return this.info[name];
  }

  /**
   * Joue une action par-dessus la locomotion. `once` : une seule fois puis retour à la base (promesse résolue
   * à la fin). `mask` : « upper » pour garder la marche des jambes (téléphoner en marchant).
   */
  play(name: string, opts: { once?: boolean; mask?: Mask; fade?: number; speed?: number; at?: number } = {}): Promise<void> {
    const mask = opts.mask ?? "full";
    const fade = opts.fade ?? 0.35;
    const a = this.action(name, mask);
    if (!a) return Promise.resolve();
    if (this.layer?.name === name && this.layer.mask === mask && !opts.once) return Promise.resolve();
    const prev = this.layer?.action;
    a.reset();
    a.timeScale = opts.speed ?? 1;
    if (opts.at) a.time = opts.at;
    a.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = !!opts.once;
    a.setEffectiveWeight(1);
    a.fadeIn(fade).play();
    if (prev && prev !== a) prev.fadeOut(fade);
    this.layer = { action: a, name, mask };
    if (opts.once) {
      return new Promise((res) => {
        this.onceDone?.();
        this.onceDone = res;
      });
    }
    return Promise.resolve();
  }

  /** Posture continue du bas du corps (assis) avec, éventuellement, une action du haut (taper). */
  sit(upper?: string) {
    const lower = this.action("sitIdle", upper ? "lower" : "full");
    if (lower && this.lowerLayer !== lower) {
      lower.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.4).play();
      this.lowerLayer?.fadeOut(0.4);
      this.lowerLayer = lower;
    }
    if (upper) void this.play(upper, { mask: "upper" });
    else if (this.layer) this.stop();
  }

  stand() {
    this.lowerLayer?.fadeOut(0.4);
    this.lowerLayer = null;
    this.stop();
  }

  get sitting(): boolean {
    return !!this.lowerLayer;
  }

  get current(): string | null {
    return this.layer?.name ?? null;
  }

  stop(fade = 0.4) {
    this.layer?.action.fadeOut(fade);
    this.layer = null;
  }

  /** Objet tenu en main (café, dossier) : attaché à l'os de la main, décalé en local. */
  hold(obj: THREE.Object3D | null, hand: "left" | "right" = "right") {
    if (this.held) this.held.removeFromParent();
    this.held = obj;
    this.heldHand = hand;
    const b = this.bones[hand === "right" ? "RightHand" : "LeftHand"];
    if (obj && b) b.add(obj);
  }

  get holding(): THREE.Object3D | null {
    return this.held;
  }

  bone(name: string): THREE.Bone | undefined {
    return this.bones[name];
  }

  /** Position monde de la tête (pour caméras et regards croisés). */
  headWorld(out = new THREE.Vector3()): THREE.Vector3 {
    const h = this.bones.Head;
    if (h) return h.getWorldPosition(out).add(V.set(0, 0.08, 0));
    return this.root.getWorldPosition(out).add(V.set(0, this.height * 0.93, 0));
  }

  update(dt: number) {
    if (!this.mixer || !this.model) return;
    this.t += dt;
    // --- Locomotion : poids idle / marche / course selon la vitesse ; cadence calée sur la capture.
    const lowerBusy = !!this.lowerLayer || (this.layer && this.layer.mask === "full");
    const walkN = this.gait;
    const ws = this.info[walkN]?.speed ?? 1.1;
    const js = this.info.jog?.speed ?? 2.7;
    const s = this.speed;
    let wIdle = 1;
    let wWalk = 0;
    let wJog = 0;
    if (s > 0.05) {
      if (s <= ws) {
        wWalk = Math.min(1, s / (ws * 0.35));
        wIdle = 1 - wWalk;
      } else {
        const k = Math.min(1, (s - ws) / Math.max(0.1, js - ws));
        wWalk = 1 - k;
        wJog = k;
        wIdle = 0;
      }
    }
    const busy = lowerBusy ? 1 : 0;
    const blend = (a: THREE.AnimationAction | undefined, w: number) => {
      if (!a) return;
      const cur = a.getEffectiveWeight();
      a.setEffectiveWeight(cur + (w * (1 - busy) - cur) * Math.min(1, dt * 8));
    };
    blend(this.loco.idle, wIdle);
    for (const g of ["walk", "walkSlow"] as const) blend(this.loco[g], g === walkN ? wWalk : 0);
    blend(this.loco.jog, wJog);
    if (this.loco[walkN]) this.loco[walkN]!.timeScale = s > 0.05 ? Math.max(0.6, Math.min(1.6, s / ws)) : 1;
    if (this.loco.jog) this.loco.jog.timeScale = s > ws ? Math.max(0.7, Math.min(1.3, s / js)) : 1;
    this.mixer.update(dt);
    this.postProcess(dt);
  }

  private postProcess(dt: number) {
    const b = this.bones;
    // --- Respiration : légère ampliation de la poitrine.
    const br = Math.sin(this.t * 1.6) * 0.012;
    if (b.Spine1) b.Spine1.rotateX(-br * 0.4);
    // --- Regard : tête et cou vers la cible, dans les limites du confort.
    const head = b.Head;
    const neck = b.Neck1;
    let yaw = 0;
    let pitch = 0;
    // Sans cible : regard à l'horizon (certaines captures baissent la tête), sauf gestes qui regardent les mains.
    let target = this.lookAt;
    let weight = this.lookWeight;
    const handsBusy = this.layer && /type|pickup|phone|give|coffee|handshake/.test(this.layer.name);
    if (!target && !handsBusy && !this.sitting) {
      this.root.updateWorldMatrix(true, false);
      target = AUTO.set(0, this.height * 0.92, 4).applyMatrix4(this.root.matrixWorld);
      weight = 0.7;
    }
    if (target && head && head.parent) {
      head.updateWorldMatrix(true, false);
      const hp = head.getWorldPosition(V);
      const dir = V2.copy(target).sub(hp).normalize();
      // Direction dans le repère du parent de la tête.
      head.parent.getWorldQuaternion(Q).invert();
      dir.applyQuaternion(Q);
      yaw = Math.atan2(dir.x, dir.z);
      pitch = -Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
      yaw = Math.max(-1.1, Math.min(1.1, yaw)) * weight;
      pitch = Math.max(-0.45, Math.min(0.5, pitch)) * weight;
    }
    Q2.setFromEuler(E.set(pitch * 0.7, yaw * 0.62, 0, "YXZ"));
    this.headOff.slerp(Q2, Math.min(1, dt * 5));
    if (neck) neck.quaternion.multiply(Q.copy(this.headOff).slerp(Q2.identity(), 0.55));
    if (head) head.quaternion.multiply(Q.copy(this.headOff).slerp(Q2.identity(), 0.45));
    // --- Yeux : le reste de l'écart, plus des micro-saccades.
    this.saccAt -= dt;
    if (this.saccAt <= 0) {
      this.saccAt = 0.4 + Math.random() * 1.8;
      this.sacc.set((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.05);
    }
    for (const side of ["L", "R"] as const) {
      const eye = b[`Eye${side}`];
      if (!eye) continue;
      let ey = this.sacc.x;
      let ep = this.sacc.y;
      if (this.lookAt) {
        eye.parent!.updateWorldMatrix(true, false);
        const ep0 = eye.getWorldPosition(V);
        const dir = V2.copy(this.lookAt).sub(ep0).normalize();
        eye.parent!.getWorldQuaternion(Q).invert();
        dir.applyQuaternion(Q);
        ey += Math.max(-0.45, Math.min(0.45, Math.atan2(dir.x, dir.z)));
        ep += Math.max(-0.3, Math.min(0.3, -Math.atan2(dir.y, Math.hypot(dir.x, dir.z))));
      }
      Q2.setFromEuler(E.set(ep, ey, 0, "YXZ"));
      this.eyeOff[side].slerp(Q2, Math.min(1, dt * 18));
      eye.quaternion.copy(this.eyeOff[side]);
    }
    // --- Visage : clignements, parole, expressions.
    this.blinkAt -= dt;
    if (this.blinkAt <= 0) {
      this.blink = 1;
      this.blinkAt = 2 + Math.random() * 4 * (this.talk > 0.1 ? 0.6 : 1);
    }
    this.blink = Math.max(0, this.blink - dt * 7);
    const bl = this.blink > 0 ? Math.sin(this.blink * Math.PI) : 0;
    const k = Math.min(1, dt * 6);
    for (const key of Object.keys(this.exprCur) as (keyof Expression)[]) this.exprCur[key] += (this.expr[key] - this.exprCur[key]) * k;
    const x = this.exprCur;
    const tk = this.talk;
    const jaw = tk * (0.35 + 0.35 * Math.abs(Math.sin(this.t * 11.3)) + 0.2 * Math.sin(this.t * 7.1));
    for (const f of this.faces) {
      const d = f.morphTargetDictionary!;
      const w = f.morphTargetInfluences!;
      const set = (n: string, v: number) => {
        const i = d[n];
        if (i !== undefined) w[i] = Math.max(0, Math.min(1, v));
      };
      set("blinkL", Math.max(bl, x.squint * 0.35));
      set("blinkR", Math.max(bl, x.squint * 0.35));
      set("jawOpen", jaw * 0.55);
      set("wide", tk * 0.25 * (0.5 + 0.5 * Math.sin(this.t * 5.3)));
      set("pucker", tk * 0.2 * (0.5 + 0.5 * Math.sin(this.t * 3.1 + 1)));
      set("smile", x.smile);
      set("frown", x.frown);
      set("press", x.press);
      set("browUpL", x.browUp + tk * 0.15 * Math.max(0, Math.sin(this.t * 2.3)));
      set("browUpR", x.browUp + tk * 0.15 * Math.max(0, Math.sin(this.t * 2.3)));
      set("browInnerL", x.browInner);
      set("browInnerR", x.browInner);
      set("browDownL", x.browDown);
      set("browDownR", x.browDown);
      set("squintL", x.squint);
      set("squintR", x.squint);
    }
    if (this.held) {
      // Main droite : paume vers le haut / l'avant, l'objet dans le creux.
      this.held.position.set(this.heldHand === "right" ? -0.02 : 0.02, -0.08, 0.03);
    }
    M.identity();
    void FWD;
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.root.removeFromParent();
  }
}
