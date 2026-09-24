/**
 * Système du monde ouvert : joueur, personnages non joueurs, collisions, navigation, interactions.
 * Singleton créé par la scène (World.tsx), piloté à chaque image, utilisé par la séquence de jeu
 * (content/sequences/world.ts) pour les services et les dialogues.
 */
import * as THREE from "three";
import { NPCS } from "@/content/world/people";
import { cast } from "../characters/performance";
import { Person } from "../people/Person";
import { preloadPeople } from "../people/assets";
import { useProfile } from "../state/profile";
import { defaultDecor, playerChair } from "./decor";
import { FURNITURE, PLAYER_BOARD, PLAYER_OFFICE, roomAt, spot, staticBoxes, type Placed } from "./layout";
import { Collider, buildGraph, type NavGraph } from "./nav";
import { Npc } from "./npcs";
import { PlayerController } from "./player";
import { useWorld, worldRuntime } from "./runtime";

export interface Interactable {
  id: string;
  label: string;
  x: number;
  z: number;
  r?: number;
}

export const worldSys = {
  group: new THREE.Group(),
  npcs: new Map<string, Npc>(),
  player: null as Person | null,
  ctrl: null as PlayerController | null,
  col: null as Collider | null,
  graph: null as NavGraph | null,
  built: false,
  loading: null as Promise<unknown> | null,
};

export function decorNow(): Placed[] {
  return (useProfile.getState().decor as Placed[] | null) ?? defaultDecor();
}

export function rebuildCollision() {
  const col = Collider.fromWorld(staticBoxes(decorNow()));
  worldSys.col = col;
  worldSys.graph = buildGraph(col);
  for (const n of worldSys.npcs.values()) n.setNav(worldSys.graph, col);
  if (worldSys.ctrl) worldSys.ctrl.col = col;
}

/** Crée joueur et PNJ (une fois) ; les modèles se chargent en arrière-plan. */
export function buildWorld(): Promise<unknown> {
  if (worldSys.built) return worldSys.loading ?? Promise.resolve();
  worldSys.built = true;
  rebuildCollision();
  const look = useProfile.getState().look ?? "m";
  const player = new Person(look === "f" ? "player-f" : "player-m");
  worldSys.player = player;
  worldSys.group.add(player.root);
  worldSys.ctrl = new PlayerController(player, worldSys.col!);
  // Débogage : ?npcs=theo,vivian limite la population (tests en rendu logiciel).
  const only = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("npcs") : null;
  const defs = only ? NPCS.filter((n) => only.split(",").includes(n.id)) : NPCS;
  for (const def of defs) {
    const n = new Npc(def, worldSys.graph!, worldSys.col!);
    worldSys.npcs.set(def.id, n);
    worldSys.group.add(n.person.root);
  }
  worldSys.loading = Promise.all([preloadPeople([player.id, ...defs.map((n) => n.id)]), player.ready, ...[...worldSys.npcs.values()].map((n) => n.person.ready)]);
  return worldSys.loading;
}

/** Objets et personnes avec lesquels on peut interagir. */
export function interactables(): Interactable[] {
  const out: Interactable[] = [];
  for (const n of worldSys.npcs.values()) out.push({ id: `npc:${n.def.id}`, label: `Parler à ${n.def.name}`, x: n.x, z: n.z, r: 1.7 });
  const chair = playerChair(decorNow());
  if (chair) out.push({ id: "desk", label: "Vous asseoir à votre bureau", x: chair.x, z: chair.z, r: 1.3 });
  out.push({ id: "board", label: "Tableau d'enquête", x: PLAYER_BOARD.x - 0.6, z: PLAYER_BOARD.z, r: 1.3 });
  const coffee = spot("coffee");
  out.push({ id: "coffee", label: "Vous servir un espresso", x: coffee.x, z: coffee.z, r: 1.2 });
  out.push({ id: "elevator", label: "Prendre l'ascenseur", x: 0, z: 11.2, r: 1.4 });
  out.push({ id: "mail", label: "Votre casier", x: 16, z: 10.9, r: 1.2 });
  const shelf = spot("archive");
  out.push({ id: "archives", label: "Consulter les archives", x: shelf.x, z: shelf.z, r: 1.4 });
  out.push({ id: "vance", label: "Le bureau de M. Vance", x: 15, z: -8.6, r: 1.6 });
  return out;
}

export function inPlayerOffice(x = worldRuntime.player.x, z = worldRuntime.player.z): boolean {
  const o = PLAYER_OFFICE;
  return x > o.x0 - 0.1 && x < o.x1 + 0.1 && z > o.z0 - 0.1 && z < o.z1 + 0.2;
}

let lastRoom = "";
let promptId = "";

/** Une image du monde : joueur, PNJ, invite d'interaction, lieu. */
export function stepWorld(dt: number, camera: THREE.PerspectiveCamera) {
  const ctrl = worldSys.ctrl;
  if (!ctrl) return;
  const others = [...worldSys.npcs.values()];
  ctrl.update(dt, camera, others);
  ctrl.person.update(dt);
  // Personnages : mise à jour complète près du joueur, allégée au loin.
  const p = worldRuntime.player;
  for (const n of others) {
    const far = Math.hypot(n.x - p.x, n.z - p.z) > 16;
    n.person.talk = (cast.speaker as string | null) === n.def.id ? Math.max(0.25, cast.level) : 0;
    n.update(dt);
    n.person.root.visible = !far || Math.hypot(n.x - camera.position.x, n.z - camera.position.z) < 26;
  }
  const ui = useWorld.getState();
  // Lieu courant.
  const r = roomAt(p.x, p.z);
  const room = r?.name ?? "";
  if (room !== lastRoom) {
    lastRoom = room;
    ui.set({ room });
  }
  // Invite : l'objet le plus proche devant soi.
  let best: Interactable | null = null;
  let bd = Infinity;
  if (!worldRuntime.frozen) {
    const fx = Math.sin(p.rot);
    const fz = Math.cos(p.rot);
    for (const it of interactables()) {
      const dx = it.x - p.x;
      const dz = it.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > (it.r ?? 1.5)) continue;
      const facing = d < 0.6 ? 1 : (dx * fx + dz * fz) / d;
      if (facing < 0.1) continue;
      const score = d - facing * 0.5;
      if (score < bd) {
        bd = score;
        best = it;
      }
    }
  }
  const id = best?.id ?? "";
  if (id !== promptId) {
    promptId = id;
    ui.set({ prompt: best ? { id: best.id, label: best.label, key: "E" } : null });
  }
}

export { FURNITURE };
