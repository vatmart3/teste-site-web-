/**
 * Contrôle du joueur : clavier (ZQSD / WASD / flèches, Maj pour courir, E pour interagir, V vue subjective),
 * souris ou doigt pour tourner la caméra, molette pour zoomer, joystick tactile. Collisions contre les murs,
 * le mobilier et les autres personnages ; caméra à l'épaule qui ne traverse pas les murs.
 */
import * as THREE from "three";
import type { Person } from "../people/Person";
import type { Collider } from "./nav";
import { worldRuntime, worldBus, useWorld } from "./runtime";

const keys = new Set<string>();
let installed = false;

export function installPlayerInput(): () => void {
  if (installed || typeof window === "undefined") return () => undefined;
  installed = true;
  const down = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    const k = e.key.toLowerCase();
    keys.add(k);
    if (!useWorld.getState().active) return;
    if (k === "e" || k === "enter") {
      const p = useWorld.getState().prompt;
      if (p && !useWorld.getState().menu) worldBus.emit({ type: "interact", id: p.id });
    }
    if (k === "v") worldRuntime.cam.first = !worldRuntime.cam.first;
    if (k === "h") useWorld.getState().set({ help: !useWorld.getState().help });
    if (k === "escape") worldBus.emit({ type: "close" });
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  };
  const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  const blur = () => keys.clear();
  let drag: { x: number; y: number; id: number } | null = null;
  const pd = (e: PointerEvent) => {
    if (!useWorld.getState().active || useWorld.getState().edit) return;
    const t = e.target as HTMLElement;
    if (t.tagName !== "CANVAS") return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const pm = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    const c = worldRuntime.cam;
    c.yaw -= dx * 0.0055;
    c.pitch = Math.max(-0.5, Math.min(1.05, c.pitch + dy * 0.004));
  };
  const pu = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.id) drag = null;
  };
  const wheel = (e: WheelEvent) => {
    if (!useWorld.getState().active || useWorld.getState().edit) return;
    const c = worldRuntime.cam;
    c.dist = Math.max(1.3, Math.min(6, c.dist * (1 + Math.sign(e.deltaY) * 0.1)));
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  window.addEventListener("pointerdown", pd);
  window.addEventListener("pointermove", pm);
  window.addEventListener("pointerup", pu);
  window.addEventListener("wheel", wheel, { passive: true });
  return () => {
    installed = false;
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    window.removeEventListener("pointerdown", pd);
    window.removeEventListener("pointermove", pm);
    window.removeEventListener("pointerup", pu);
    window.removeEventListener("wheel", wheel);
  };
}

function axis(): { x: number; z: number; run: boolean } {
  let x = worldRuntime.input.x;
  let z = worldRuntime.input.z;
  if (keys.has("z") || keys.has("w") || keys.has("arrowup")) z += 1;
  if (keys.has("s") || keys.has("arrowdown")) z -= 1;
  if (keys.has("q") || keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  const l = Math.hypot(x, z);
  if (l > 1) {
    x /= l;
    z /= l;
  }
  return { x, z, run: keys.has("shift") || worldRuntime.input.run };
}

const V = new THREE.Vector3();
const T = new THREE.Vector3();

export class PlayerController {
  vel = new THREE.Vector2();
  head = new THREE.Vector3();

  constructor(
    public person: Person,
    public col: Collider,
  ) {}

  update(dt: number, camera: THREE.PerspectiveCamera, others: Iterable<{ x: number; z: number }>) {
    const p = worldRuntime.player;
    const c = worldRuntime.cam;
    const frozen = worldRuntime.frozen;
    const a = frozen ? { x: 0, z: 0, run: false } : axis();
    // Direction relative à la caméra : avant = là où elle regarde.
    const fx = Math.sin(c.yaw);
    const fz = Math.cos(c.yaw);
    const rx = -fz;
    const rz = fx;
    // Avant de la caméra = direction (−sin yaw, −cos yaw) : la caméra est derrière le joueur.
    const wx = -(fx * a.z) - rx * a.x;
    const wz = -(fz * a.z) - rz * a.x;
    const target = (a.run ? 3.1 : 1.45) * Math.min(1, Math.hypot(a.x, a.z));
    const len = Math.hypot(wx, wz);
    const tvx = len > 0 ? (wx / len) * target : 0;
    const tvz = len > 0 ? (wz / len) * target : 0;
    const k = Math.min(1, dt * (target > 0 ? 7 : 10));
    this.vel.x += (tvx - this.vel.x) * k;
    this.vel.y += (tvz - this.vel.y) * k;
    let nx = p.x + this.vel.x * dt;
    let nz = p.z + this.vel.y * dt;
    // Autres personnages : cercles.
    for (const o of others) {
      const dx = nx - o.x;
      const dz = nz - o.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.55 && d > 1e-4) {
        nx = o.x + (dx / d) * 0.55;
        nz = o.z + (dz / d) * 0.55;
      }
    }
    [nx, nz] = this.col.resolve(nx, nz, 0.27);
    const moved = Math.hypot(nx - p.x, nz - p.z) / Math.max(dt, 1e-4);
    p.x = nx;
    p.z = nz;
    p.speed = Math.min(moved, Math.hypot(this.vel.x, this.vel.y));
    if (Math.hypot(this.vel.x, this.vel.y) > 0.15) {
      const want = Math.atan2(this.vel.x, this.vel.y);
      let d = want - p.rot;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      p.rot += d * Math.min(1, dt * 9);
    }
    const per = this.person;
    per.root.position.set(p.x, 0, p.z);
    per.root.rotation.y = p.rot;
    per.speed = p.speed;
    per.gait = "walk";
    worldRuntime.agents.set("player", p);

    // --- Caméra.
    const eye = per.height * 0.93;
    this.head.set(p.x, eye, p.z);
    if (c.first) {
      camera.position.set(p.x + Math.sin(p.rot) * 0.12, eye + 0.02, p.z + Math.cos(p.rot) * 0.12);
      if (Math.hypot(this.vel.x, this.vel.y) < 0.1 && !frozen) {
        // En vue subjective, la souris tourne le corps.
        p.rot = c.yaw + Math.PI;
      }
      V.set(Math.sin(p.rot) * Math.cos(c.pitch - 0.25), -Math.sin(c.pitch - 0.25), Math.cos(p.rot) * Math.cos(c.pitch - 0.25));
      camera.lookAt(T.copy(camera.position).add(V));
      per.root.visible = false;
      return;
    }
    per.root.visible = true;
    const pivot = T.set(p.x, eye - 0.08, p.z);
    const cp = Math.cos(c.pitch);
    const dirx = Math.sin(c.yaw) * cp;
    const dirz = Math.cos(c.yaw) * cp;
    const diry = Math.sin(c.pitch);
    // Épaule : léger décalage à droite de l'écran.
    const sx = Math.cos(c.yaw) * 0.32;
    const sz = -Math.sin(c.yaw) * 0.32;
    let dist = c.dist;
    const free = this.col.ray(pivot.x + sx, pivot.z + sz, dirx, dirz, dist * Math.max(0.2, cp) + 0.3) / Math.max(0.2, cp);
    dist = Math.max(0.6, Math.min(dist, free - 0.3));
    camera.position.set(pivot.x + sx + dirx * dist, Math.min(3.0, pivot.y + diry * dist), pivot.z + sz + dirz * dist);
    const f = worldRuntime.focus;
    if (f) camera.lookAt(f.x, f.y, f.z);
    else camera.lookAt(pivot.x + sx * 0.6, pivot.y + 0.05, pivot.z + sz * 0.6);
  }
}
