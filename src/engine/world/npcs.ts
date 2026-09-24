/**
 * Les gens du cabinet. Chaque personnage non joueur suit une routine (travailler à son poste, aller au café,
 * discuter au salon, chercher un dossier aux archives, distribuer le courrier...) et peut être réquisitionné
 * pour un service (l'assistant va chercher un café et vous l'apporte, un dossier aux archives...).
 * Déplacements : chemins A* sur le graphe de l'étage, virages en douceur, arrêt devant le joueur.
 */
import * as THREE from "three";
import { Person } from "../people/Person";
import { spot, type Spot, type Vec2 } from "./layout";
import { findPath, type Collider, type NavGraph } from "./nav";
import { worldRuntime } from "./runtime";

export type Task =
  | { kind: "goto"; to: Vec2; slow?: boolean; face?: number }
  | { kind: "sit"; spot: Spot; upper?: string; dur: number }
  | { kind: "act"; anim: string; dur: number; mask?: "full" | "upper"; face?: number }
  | { kind: "once"; anim: string; mask?: "full" | "upper"; face?: number }
  | { kind: "wait"; dur: number; face?: number }
  | { kind: "follow"; dist: number }
  | { kind: "call"; fn: () => void | Promise<void> };

export interface RoutineStep {
  spot: string;
  dur: [number, number];
  weight: number;
}

export interface NpcDef {
  id: string;
  name: string;
  home: string;
  routine: RoutineStep[];
  /** Salue le joueur au passage. */
  greet?: string[];
}

const TMP = new THREE.Vector3();
/** Postes occupés (un seul personnage par fauteuil / par place). */
export const taken = new Map<string, string>();

export class Npc {
  person!: Person;
  x = 0;
  z = 0;
  rot = 0;
  queue: Task[] = [];
  private cur: Task | null = null;
  private path: Vec2[] = [];
  private timer = 0;
  private started = false;
  private resolveCur: (() => void) | null = null;
  busy = false;
  /** Personne regardée (le joueur pendant une conversation). */
  attention: THREE.Vector3 | null = null;
  lastGreet = -100;
  seatedAt: string | null = null;
  /** Sortie du poste après s'être levé (glissement hors du fauteuil, sans collisions). */
  private exitTo: Vec2 | null = null;
  private seatRot = 0;

  constructor(
    public def: NpcDef,
    private g: NavGraph,
    private col: Collider,
  ) {
    this.init();
  }

  setNav(g: NavGraph, col: Collider) {
    this.g = g;
    this.col = col;
  }

  private init() {
    const def = this.def;
    this.person = new Person(def.id);
    const s = spot(def.home);
    this.x = s.x;
    this.z = s.z;
    this.rot = s.rot;
    this.person.root.position.set(this.x, 0, this.z);
    this.person.root.rotation.y = this.rot;
    worldRuntime.agents.set(def.id, this);
    taken.set(def.home, def.id);
    // Au début de la journée, chacun est déjà à son poste.
    if (s.kind === "seat") this.queue.push({ kind: "sit", spot: s, upper: s.act === "type" ? "type" : s.act === "think" ? "think" : undefined, dur: 20 + Math.random() * 60 });
    else this.queue.push({ kind: "act", anim: s.act ?? "idle", dur: 20 + Math.random() * 40, face: s.rot });
  }

  /** Remplace la file de tâches (service demandé) ; la promesse se résout à la fin. */
  run(tasks: Task[]): Promise<void> {
    this.busy = true;
    this.queue = [...tasks];
    this.finish(true);
    return new Promise((res) => {
      this.queue.push({
        kind: "call",
        fn: () => {
          this.busy = false;
          res();
        },
      });
    });
  }

  private leaveSeat() {
    if (!this.person.sitting && !this.seatedAt) return;
    this.person.stand();
    // On sort par le côté libre (bureau devant, cloison derrière, voisin à côté...).
    const f: Vec2 = [Math.sin(this.seatRot), Math.cos(this.seatRot)];
    const side: Vec2 = [f[1], -f[0]];
    const cands: Vec2[] = [
      [this.x + side[0] * 0.85, this.z + side[1] * 0.85],
      [this.x - side[0] * 0.85, this.z - side[1] * 0.85],
      [this.x - f[0] * 0.8, this.z - f[1] * 0.8],
      [this.x + f[0] * 0.8, this.z + f[1] * 0.8],
      [this.x + side[0] * 1.2 - f[0] * 0.5, this.z + side[1] * 1.2 - f[1] * 0.5],
      [this.x - side[0] * 1.2 - f[0] * 0.5, this.z - side[1] * 1.2 - f[1] * 0.5],
    ];
    const free = cands.find(([x, z]) => {
      const [rx, rz] = this.col.resolve(x, z, 0.26);
      return Math.hypot(rx - x, rz - z) < 0.01;
    });
    this.exitTo = free ?? cands[0]!;
    this.seatedAt = null;
  }

  private finish(interrupt = false) {
    const r = this.resolveCur;
    this.resolveCur = null;
    if (this.cur?.kind === "sit" || (interrupt && this.person.sitting)) this.leaveSeat();
    if (interrupt && this.person.current) this.person.stop();
    this.cur = null;
    this.started = false;
    r?.();
  }

  /** Routine : prochaine activité tirée au sort (pondérée). */
  private pickRoutine() {
    const r = this.def.routine.filter((s) => !taken.has(s.spot) || taken.get(s.spot) === this.def.id);
    if (!r.length) {
      this.queue.push({ kind: "wait", dur: 3 });
      return;
    }
    const total = r.reduce((a, s) => a + s.weight, 0);
    let x = Math.random() * total;
    let step = r[0]!;
    for (const s of r) {
      x -= s.weight;
      if (x <= 0) {
        step = s;
        break;
      }
    }
    const sp = spot(step.spot);
    for (const [k, v] of taken) if (v === this.def.id) taken.delete(k);
    taken.set(sp.id, this.def.id);
    const dur = step.dur[0] + Math.random() * (step.dur[1] - step.dur[0]);
    const approach: Vec2 = sp.kind === "seat" ? [sp.x + Math.sin(sp.rot) * 0.75, sp.z + Math.cos(sp.rot) * 0.75] : [sp.x, sp.z];
    this.queue.push({ kind: "goto", to: approach, slow: Math.random() < 0.3 });
    if (sp.kind === "seat") this.queue.push({ kind: "sit", spot: sp, upper: sp.act === "type" ? "type" : sp.act === "think" ? "think" : undefined, dur });
    else this.queue.push({ kind: "act", anim: sp.act ?? "idle", dur, face: sp.rot });
  }

  private turnTo(target: number, dt: number, rate = 5) {
    let d = target - this.rot;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.rot += d * Math.min(1, dt * rate);
    return Math.abs(d) < 0.08;
  }

  update(dt: number) {
    const p = this.person;
    if (this.exitTo) {
      const dx = this.exitTo[0] - this.x;
      const dz = this.exitTo[1] - this.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.03) this.exitTo = null;
      else {
        const st = Math.min(d, 0.9 * dt);
        this.x += (dx / d) * st;
        this.z += (dz / d) * st;
        p.speed = 0.5;
        p.root.position.set(this.x, 0, this.z);
        p.root.rotation.y = this.rot;
        p.update(dt);
        return;
      }
    }
    if (!this.cur) {
      if (!this.queue.length && !this.busy) this.pickRoutine();
      this.cur = this.queue.shift() ?? null;
      this.started = false;
      this.path = [];
    }
    const t = this.cur;
    let speed = 0;
    if (t) {
      switch (t.kind) {
        case "goto": {
          if (!this.started) {
            this.started = true;
            if (p.sitting) this.leaveSeat();
            if (p.current) p.stop();
            this.path = findPath(this.g, this.col, [this.x, this.z], t.to);
          }
          const nxt = this.path[0];
          if (!nxt) {
            if (t.face === undefined || this.turnTo(t.face, dt)) this.finish();
            break;
          }
          const dx = nxt[0] - this.x;
          const dz = nxt[1] - this.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.18) {
            this.path.shift();
            break;
          }
          // Le joueur est devant : on attend (politesse).
          const pl = worldRuntime.player;
          const ahead = (pl.x - this.x) * dx + (pl.z - this.z) * dz;
          const block = Math.hypot(pl.x - this.x, pl.z - this.z) < 0.9 && ahead > 0;
          const want = Math.atan2(dx, dz);
          const aligned = this.turnTo(want, dt, 7);
          const v = block ? 0 : (t.slow ? 0.75 : 1.2) * (aligned ? 1 : 0.45);
          const step = Math.min(d, v * dt);
          this.x += (dx / d) * step;
          this.z += (dz / d) * step;
          [this.x, this.z] = this.col.resolve(this.x, this.z, 0.22);
          speed = v;
          p.gait = t.slow ? "walkSlow" : "walk";
          break;
        }
        case "follow": {
          const pl = worldRuntime.player;
          const dd = Math.hypot(pl.x - this.x, pl.z - this.z);
          if (!this.started || (this.timer -= dt) <= 0) {
            if (!this.started && p.sitting) this.leaveSeat();
            if (!this.started && p.current) p.stop();
            this.started = true;
            this.timer = 0.8;
            this.path = findPath(this.g, this.col, [this.x, this.z], [pl.x, pl.z]);
          }
          if (dd <= t.dist) {
            if (this.turnTo(Math.atan2(pl.x - this.x, pl.z - this.z), dt, 8)) this.finish();
            break;
          }
          const nxt = this.path[0];
          if (!nxt) break;
          const dx = nxt[0] - this.x;
          const dz = nxt[1] - this.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.18) {
            this.path.shift();
            break;
          }
          const aligned = this.turnTo(Math.atan2(dx, dz), dt, 7);
          const v = (dd > 4 ? 1.9 : 1.25) * (aligned ? 1 : 0.45);
          const st = Math.min(d, v * dt, Math.max(0, dd - t.dist + 0.05));
          this.x += (dx / d) * st;
          this.z += (dz / d) * st;
          [this.x, this.z] = this.col.resolve(this.x, this.z, 0.22);
          speed = st / Math.max(dt, 1e-4);
          p.gait = "walk";
          break;
        }
        case "sit": {
          if (!this.started) {
            this.started = true;
            this.timer = t.dur;
            this.x = t.spot.x;
            this.z = t.spot.z;
            this.rot = t.spot.rot;
            this.seatedAt = t.spot.id;
            this.seatRot = t.spot.rot;
            p.sit(t.upper);
          }
          this.timer -= dt;
          if (this.timer <= 0) this.finish();
          break;
        }
        case "act": {
          if (!this.started) {
            this.started = true;
            this.timer = t.dur;
            if (t.anim !== "idle") void p.play(t.anim, { mask: t.mask ?? "full" });
          }
          if (t.face !== undefined) this.turnTo(t.face, dt);
          this.timer -= dt;
          if (this.timer <= 0) this.finish(true);
          break;
        }
        case "once": {
          if (!this.started) {
            this.started = true;
            void p.play(t.anim, { once: true, mask: t.mask ?? "full" }).then(() => {
              if (this.cur === t) this.finish();
            });
          }
          if (t.face !== undefined) this.turnTo(t.face, dt);
          break;
        }
        case "wait": {
          if (!this.started) {
            this.started = true;
            this.timer = t.dur;
          }
          if (t.face !== undefined) this.turnTo(t.face, dt);
          this.timer -= dt;
          if (this.timer <= 0) this.finish();
          break;
        }
        case "call": {
          if (!this.started) {
            this.started = true;
            void Promise.resolve(t.fn()).then(() => {
              if (this.cur === t) this.finish();
            });
          }
          break;
        }
      }
    }
    // Regard : l'interlocuteur, sinon le joueur s'il est tout près, sinon droit devant.
    const pl = worldRuntime.player;
    const dPl = Math.hypot(pl.x - this.x, pl.z - this.z);
    if (this.attention) p.lookAt = this.attention;
    else if (dPl < 2.6 && !this.person.current?.startsWith("type")) {
      p.lookAt = TMP.set(pl.x, 1.55, pl.z);
      p.lookWeight = 0.8;
    } else p.lookAt = null;
    p.speed = speed;
    p.root.position.set(this.x, 0, this.z);
    p.root.rotation.y = this.rot;
    p.update(dt);
  }

  /** Face à un point (monde). */
  face(x: number, z: number): number {
    return Math.atan2(x - this.x, z - this.z);
  }
}
