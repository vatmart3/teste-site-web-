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
import { defaultDecor, playerChair, playerDesk } from "./decor";
import { FOOTPRINT, FURNITURE, PLAYER_BOARD, PLAYER_OFFICE, roomAt, spot, staticBoxes, type Placed } from "./layout";
import { Collider, buildGraph, nearestOnBox, type NavGraph } from "./nav";
import { Npc } from "./npcs";
import { PlayerController } from "./player";
import { useWorld, worldRuntime } from "./runtime";

export interface Interactable {
  id: string;
  label: string;
  x: number;
  z: number;
  r?: number;
  /** Emprise (meuble) : la distance se mesure au bord le plus proche, de n'importe quel côté. */
  box?: { x: number; z: number; w: number; d: number; rot: number };
}

/** Point de l'objet le plus proche de (px, pz) : centre, ou bord de son emprise. */
export function nearestPoint(it: Interactable, px: number, pz: number): [number, number] {
  return it.box ? nearestOnBox(it.box, px, pz) : [it.x, it.z];
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

/** Change l'apparence du joueur (homme / femme) sans quitter l'étage. */
export function setPlayerLook(look: "m" | "f") {
  useProfile.getState().setLook(look);
  const old = worldSys.player;
  if (!old || !worldSys.ctrl) return;
  const id = look === "f" ? "player-f" : "player-m";
  if (old.id === id) return;
  const p = new Person(id);
  worldSys.group.remove(old.root);
  worldSys.group.add(p.root);
  worldSys.player = p;
  worldSys.ctrl.person = p;
}

/** Objets et personnes avec lesquels on peut interagir. */
export function interactables(): Interactable[] {
  const out: Interactable[] = [];
  for (const n of worldSys.npcs.values()) out.push({ id: `npc:${n.def.id}`, label: `Parler à ${n.def.name}`, x: n.x, z: n.z, r: 1.7 });
  const decor = decorNow();
  const desk = playerDesk(decor);
  const chair = playerChair(decor);
  // Le bureau se sélectionne de n'importe quel côté (devant, derrière, sur le flanc), ou depuis le fauteuil.
  if (desk) {
    const [w, dd] = FOOTPRINT[desk.type];
    out.push({ id: "desk", label: "Vous asseoir à votre bureau", x: desk.x, z: desk.z, r: 1.0, box: { x: desk.x, z: desk.z, w, d: dd, rot: desk.rot } });
  }
  if (chair) out.push({ id: "desk", label: "Vous asseoir à votre bureau", x: chair.x, z: chair.z, r: 1.1 });
  out.push({ id: "board", label: "Tableau d'enquête", x: PLAYER_BOARD.x, z: PLAYER_BOARD.z, r: 1.6 });
  const coffee = spot("coffee");
  out.push({ id: "coffee", label: "Vous servir un espresso", x: coffee.x, z: coffee.z, r: 1.2 });
  out.push({ id: "elevator", label: "Prendre l'ascenseur", x: 0, z: 11.2, r: 1.4 });
  const slots = FURNITURE.find((f) => f.type === "mail-slots");
  if (slots) {
    const [w, dd] = FOOTPRINT[slots.type];
    out.push({ id: "mail", label: "Votre casier", x: slots.x, z: slots.z, r: 0.9, box: { x: slots.x, z: slots.z, w, d: dd, rot: slots.rot } });
  }
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
const FR = new THREE.Frustum();
const PM = new THREE.Matrix4();
const SPH = new THREE.Sphere(new THREE.Vector3(), 1.3);

/** Une image du monde : joueur, PNJ, invite d'interaction, lieu. */
export function stepWorld(dt: number, camera: THREE.PerspectiveCamera, view: THREE.Camera = camera) {
  const ctrl = worldSys.ctrl;
  if (!ctrl) return;
  const others = [...worldSys.npcs.values()];
  ctrl.update(dt, camera, others);
  ctrl.person.update(dt);
  // Personnages : mise à jour complète près du joueur, allégée au loin.
  const p = worldRuntime.player;
  view.updateMatrixWorld();
  PM.multiplyMatrices(view.projectionMatrix, view.matrixWorldInverse);
  FR.setFromProjectionMatrix(PM);
  for (const n of others) {
    const far = Math.hypot(n.x - p.x, n.z - p.z) > 16;
    n.person.talk = (cast.speaker as string | null) === n.def.id ? Math.max(0.25, cast.level) : 0;
    n.update(dt);
    SPH.center.set(n.x, 0.9, n.z);
    n.person.root.visible = FR.intersectsSphere(SPH) && (!far || Math.hypot(n.x - view.position.x, n.z - view.position.z) < 26);
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
      const [ix, iz] = nearestPoint(it, p.x, p.z);
      const dx = ix - p.x;
      const dz = iz - p.z;
      const d = Math.hypot(dx, dz);
      if (d > (it.r ?? 1.5)) continue;
      // Tout près, l'orientation importe peu ; plus loin, il faut à peu près faire face.
      const facing = d < 0.35 ? 1 : (dx * fx + dz * fz) / d;
      if (facing < -0.2) continue;
      // Ce que l'on regarde d'abord ; à égalité, les personnes passent avant les objets voisins.
      const score = d - facing * 1.1 - (it.id.startsWith("npc:") ? 0.2 : 0);
      if (score < bd) {
        bd = score;
        best = it;
      }
    }
  }
  // Comparé à l'état affiché (et non à un cache) : l'invite revient après chaque interaction.
  const id = best?.id ?? "";
  if (id !== (ui.prompt?.id ?? "") || (best && ui.prompt?.label !== best.label)) {
    ui.set({ prompt: best ? { id: best.id, label: best.label, key: "E" } : null });
  }
}

export { FURNITURE };
