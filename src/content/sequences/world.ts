/**
 * L'étage de Harlow & Vance en monde ouvert : le joueur marche, parle aux gens, se fait servir (café,
 * dossiers, recherches, courrier), s'assoit à son bureau (le bureau « classique » avec affaires, messages,
 * tableau d'enquête), décore son bureau. Les affaires se jouent comme avant, puis on revient à l'étage.
 */
import * as THREE from "three";
import { W, pick } from "@/content/world/dialogue";
import { MESSAGES } from "@/content/messages";
import { audio } from "@/engine/audio/AudioEngine";
import { rig } from "@/engine/camera/rig";
import { cast } from "@/engine/characters/performance";
import { Aborted, type Director, type Sequence } from "@/engine/director/director";
import { useHub } from "@/engine/hub/state";
import { useProfile } from "@/engine/state/profile";
import { useRender } from "@/engine/state/render";
import { useSettings } from "@/engine/state/settings";
import { spot } from "@/engine/world/layout";
import { coffeeCup, envelope, folder } from "@/engine/world/props";
import { toast, useWorld, worldBus, worldRuntime, type MenuOption, type WorldAction } from "@/engine/world/runtime";
import { buildWorld, decorNow, worldSys } from "@/engine/world/system";
import { playerChair } from "@/engine/world/decor";
import type { Npc } from "@/engine/world/npcs";
import { resetArrivalState } from "./arrival";
import { deskSession } from "./hub";

const profile = () => useProfile.getState();
const ui = () => useWorld.getState();

function npc(id: string): Npc {
  const n = worldSys.npcs.get(id);
  if (!n) throw new Error(`PNJ inconnu : ${id}`);
  return n;
}

/** File des actions du monde (interactions, choix de menu) : aucun clic perdu. */
function worldQueue() {
  const q: WorldAction[] = [];
  let wake: (() => void) | null = null;
  const off = worldBus.on((a) => {
    q.push(a);
    wake?.();
  });
  return {
    off,
    clear: () => void (q.length = 0),
    next: async (d: Director, filter?: (a: WorldAction) => boolean): Promise<WorldAction> => {
      for (;;) {
        while (!q.length) await d.waitBus<void>((h) => ((wake = h), () => (wake = null)));
        const a = q.shift()!;
        if (!filter || filter(a)) return a;
      }
    },
  };
}

type Queue = ReturnType<typeof worldQueue>;

/** Fondu robuste : une autre animation de l'exposition ne peut pas bloquer la séquence. */
async function fade(d: Director, to: 0 | 1, dur: number) {
  const p = d.fadeBlack(to, dur);
  p.catch(() => undefined);
  await Promise.race([p, d.wait(dur + 0.25)]);
  rig.exposure = to === 1 ? 0 : 1;
}

async function enterWorld(d: Director, where: "desk" | "office" | "stay" = "office") {
  await buildWorld();
  // La construction n'est pas interruptible : si la séquence a été remplacée entre-temps, on s'arrête là.
  if (d.signal.aborted) throw new Aborted();
  useHub.getState().set({ active: false, view: null });
  useRender.getState().set({ room: null, station: "" });
  const p = worldRuntime.player;
  if (where === "desk") {
    const ch = playerChair(decorNow());
    if (ch) {
      p.x = ch.x + 0.9;
      p.z = ch.z + 0.6;
      p.rot = Math.PI * 0.75;
    }
  } else if (where === "office") {
    p.x = 6.2;
    p.z = -8.6;
    p.rot = Math.PI;
  }
  worldRuntime.cam.yaw = p.rot + Math.PI;
  worldRuntime.cam.pitch = 0.25;
  worldRuntime.frozen = false;
  worldRuntime.focus = null;
  ui().set({ active: true, menu: null, edit: false, editSel: null });
  void d.letterbox(false);
  void audio.startLoop("office", "amb-openspace", 0.35, 1.2);
  d.music.start();
  d.music.intensity(0.1, 2);
  await fade(d, 0, 0.9);
}

async function leaveWorld(d: Director) {
  await fade(d, 1, 0.5);
  audio.stopLoop("office", 0.5);
  audio.stopLoop("steps", 0.2);
  ui().set({ active: false, prompt: null, menu: null });
}

/** Menu de choix : rend l'id choisi (ou null si fermé). */
async function choose(d: Director, q: Queue, title: string, options: MenuOption[], subtitle?: string): Promise<string | null> {
  q.clear();
  ui().set({ menu: { title, subtitle, options } });
  try {
    const a = await q.next(d, (x) => x.type === "menu" || x.type === "close");
    return a.type === "menu" ? a.id : null;
  } finally {
    ui().set({ menu: null });
  }
}

const HEAD = new THREE.Vector3();

/** Conversation : le joueur et le personnage se font face, caméra sur celui qui parle. */
async function converse(d: Director, n: Npc, fn: () => Promise<void>) {
  const p = worldRuntime.player;
  worldRuntime.frozen = true;
  const pl = worldSys.player!;
  p.rot = Math.atan2(n.x - p.x, n.z - p.z);
  pl.root.rotation.y = p.rot;
  n.attention = pl.headWorld(new THREE.Vector3());
  pl.lookAt = n.person.headWorld(new THREE.Vector3());
  n.person.headWorld(HEAD);
  worldRuntime.focus = { x: HEAD.x, y: HEAD.y - 0.05, z: HEAD.z };
  // La caméra passe derrière l'épaule du joueur, face à l'interlocuteur.
  worldRuntime.cam.yaw = p.rot + Math.PI + 0.35;
  worldRuntime.cam.pitch = 0.12;
  const dist = worldRuntime.cam.dist;
  worldRuntime.cam.dist = 1.9;
  try {
    await fn();
  } finally {
    worldRuntime.cam.dist = dist;
    worldRuntime.focus = null;
    worldRuntime.frozen = false;
    n.attention = null;
    pl.lookAt = null;
  }
}

async function npcSay(d: Director, n: Npc, text: string) {
  const id = n.def.id;
  const prev = cast.speaker;
  cast.speaker = id as typeof cast.speaker;
  n.person.expr.browUp = 0.15;
  try {
    await d.say(n.def.name, text, { who: id });
  } finally {
    cast.speaker = prev;
    n.person.expr.browUp = 0;
  }
}

async function playerSay(d: Director, text: string) {
  const pl = worldSys.player!;
  const t = window.setInterval(() => (pl.talk = cast.level || 0.6), 50);
  try {
    await d.say(undefined, `« ${text} »`, { who: useSettings.getState().tts ? "player" : undefined });
  } finally {
    window.clearInterval(t);
    pl.talk = 0;
  }
}

function standBy(n: Npc) {
  return n.run([{ kind: "wait", dur: 0.1 }]);
}

// --------------------------------------------------------------------------------------- services

/** Theo va chercher un café et vous l'apporte, où que vous soyez. */
function serviceCoffee(n: Npc) {
  const c = spot("coffee");
  void n
    .run([
      { kind: "goto", to: [c.x, c.z], face: c.rot },
      { kind: "once", anim: "pickup", face: c.rot },
      { kind: "call", fn: () => n.person.hold(coffeeCup()) },
      { kind: "follow", dist: 1.1 },
      { kind: "once", anim: "give", mask: "upper" },
      {
        kind: "call",
        fn: () => {
          n.person.hold(null);
          giveCoffeeToPlayer();
        },
      },
    ])
    .then(() => toast(W.theo.coffeeHere));
}

function giveCoffeeToPlayer() {
  const pl = worldSys.player!;
  pl.hold(coffeeCup());
  audio.sfx("sfx-paper-slide", { volume: 0.2, rate: 1.6 });
  ui().set({ coffeeUntil: Date.now() + 5 * 60_000 });
  profile().setFlag("coffee", "1");
  void pl.play("coffee", { once: true, mask: "upper", at: 2 });
  window.setTimeout(() => pl.hold(null), 22_000);
  toast(W.coffeeBuff);
}

/** Theo descend aux archives et pose le dossier sur votre bureau. */
function serviceFile(n: Npc) {
  const a = spot("archive-2");
  const ch = playerChair(decorNow());
  const deskTo: [number, number] = ch ? [ch.x + 0.9, ch.z + 1.05] : [6.5, -9.0];
  void n
    .run([
      { kind: "goto", to: [a.x, a.z], face: a.rot },
      { kind: "once", anim: "pickup", face: a.rot },
      { kind: "call", fn: () => n.person.hold(folder()) },
      { kind: "goto", to: deskTo, face: Math.PI },
      { kind: "once", anim: "give", mask: "upper" },
      { kind: "call", fn: () => n.person.hold(null) },
    ])
    .then(() => {
      profile().setFlag("fileOnDesk", "1");
      ui().set({ objective: W.objectiveDesk });
      toast(W.theo.fileHere);
    });
}

function serviceResearch(n: Npc) {
  const a = spot("archive");
  void n
    .run([
      { kind: "goto", to: [a.x, a.z], face: a.rot },
      { kind: "act", anim: "pickup", dur: 5, face: a.rot },
      { kind: "call", fn: () => n.person.hold(folder("#9ab0c8")) },
      { kind: "follow", dist: 1.1 },
      { kind: "once", anim: "give", mask: "upper" },
      { kind: "call", fn: () => n.person.hold(null) },
    ])
    .then(() => {
      profile().addPerk("expert", 1);
      profile().setFlag("research", new Date().toDateString());
      toast(`${W.priya.researchHere} (Atout « Expert » +1)`);
    });
}

function serviceMail(n: Npc) {
  const m = spot("mail");
  const unread = MESSAGES.filter((x) => !profile().readMessages.includes(x.id)).length;
  void n
    .run([
      { kind: "goto", to: [m.x, m.z], face: m.rot },
      { kind: "once", anim: "pickup", face: m.rot },
      { kind: "call", fn: () => n.person.hold(envelope()) },
      { kind: "follow", dist: 1.1 },
      { kind: "once", anim: "give", mask: "upper" },
      { kind: "call", fn: () => n.person.hold(null) },
    ])
    .then(() => toast(W.marcus.mailHere(unread)));
}

// --------------------------------------------------------------------------------------- dialogues

async function talkTo(d: Director, q: Queue, id: string) {
  const n = npc(id);
  if (n.busy) {
    toast(`${n.def.name} est occupé${["vivian", "nora", "lena", "priya"].includes(id) ? "e" : ""}.`);
    return;
  }
  await standBy(n);
  await converse(d, n, async () => {
    switch (id) {
      case "theo": {
        await npcSay(d, n, pick(W.theo.hello));
        const c = await choose(d, q, "Theo Park", [
          { id: "coffee", label: "« Un café, s'il te plaît. »", hint: "Il va le chercher et vous l'apporte" },
          { id: "file", label: "« Apporte-moi le prochain dossier. »", hint: "Aux archives, puis sur votre bureau" },
          { id: "tip", label: "« Un conseil ? »" },
          { id: "bye", label: "« Rien, merci. »" },
        ]);
        if (c === "coffee") {
          await playerSay(d, "Un café, s'il te plaît.");
          await npcSay(d, n, W.theo.coffeeYes);
          serviceCoffee(n);
        } else if (c === "file") {
          await playerSay(d, "Apporte-moi le prochain dossier.");
          await npcSay(d, n, W.theo.fileYes);
          serviceFile(n);
        } else if (c === "tip") {
          await npcSay(d, n, W.theo.tipIntro);
          await npcSay(d, n, pick(W.theo.tips));
        } else await npcSay(d, n, W.theo.bye);
        break;
      }
      case "vivian": {
        await npcSay(d, n, pick(W.vivian.hello));
        const c = await choose(d, q, "Vivian Cole", [
          { id: "harlow", label: "« Harlow peut-il me recevoir ? »" },
          { id: "gossip", label: "« Quoi de neuf à l'étage ? »" },
          { id: "bye", label: "« Bonne journée. »" },
        ]);
        if (c === "harlow") {
          const h = npc("harlow");
          if (h.seatedAt === "harlow-seat" || !h.busy) {
            await npcSay(d, n, W.vivian.harlowYes);
            ui().set({ objective: W.objectiveHarlow });
            profile().setFlag("harlowOk", "1");
          } else await npcSay(d, n, W.vivian.harlowBusy);
        } else if (c === "gossip") await npcSay(d, n, pick(W.vivian.gossip));
        break;
      }
      case "harlow": {
        await npcSay(d, n, W.harlow.hello);
        const c = await choose(d, q, "Robert Harlow", [
          { id: "advice", label: "« Un conseil pour la suite ? »" },
          { id: "work", label: "« Je retourne au travail. »" },
        ]);
        if (c === "advice") {
          n.person.expr.squint = 0.2;
          await npcSay(d, n, pick(W.harlow.talk));
          n.person.expr.squint = 0;
          profile().adjustRelation("harlow", 1);
        }
        await npcSay(d, n, W.harlow.bye);
        ui().set({ objective: null });
        break;
      }
      case "nora": {
        await npcSay(d, n, pick(W.nora.hello));
        const unread = MESSAGES.filter((x) => !profile().readMessages.includes(x.id)).length;
        const c = await choose(d, q, "Nora Ellis", [
          { id: "msg", label: "« Des messages pour moi ? »" },
          { id: "who", label: "« Qui est là aujourd'hui ? »" },
          { id: "bye", label: "« Merci, Nora. »" },
        ]);
        if (c === "msg") await npcSay(d, n, W.nora.messages(unread));
        else if (c === "who") await npcSay(d, n, W.nora.who);
        break;
      }
      case "mercer": {
        await npcSay(d, n, pick(W.mercer.hello));
        const c = await choose(d, q, "Grant Mercer", [
          { id: "calm", label: "« Bonne journée à toi aussi, Grant. »" },
          { id: "jab", label: "« Toujours aussi drôle. On se voit au tableau des résultats. »" },
        ]);
        if (c === "jab") {
          await playerSay(d, "Toujours aussi drôle. On se voit au tableau des résultats.");
          n.person.expr.smile = 0.3;
          await npcSay(d, n, pick(W.mercer.back));
          n.person.expr.smile = 0;
          profile().adjustRelation("mercer", -2);
        } else {
          await npcSay(d, n, pick(W.mercer.jab));
          profile().adjustRelation("mercer", 1);
        }
        break;
      }
      case "priya": {
        await npcSay(d, n, pick(W.priya.hello));
        const done = profile().flags.research === new Date().toDateString();
        const c = await choose(d, q, "Priya Nair", [
          { id: "research", label: "« Tu peux me trouver une jurisprudence ? »", hint: done ? "Déjà fait aujourd'hui" : "Atout « Expert » +1", disabled: done },
          { id: "bye", label: "« À plus tard. »" },
        ]);
        if (c === "research") {
          await npcSay(d, n, W.priya.researchYes);
          serviceResearch(n);
        }
        break;
      }
      case "marcus": {
        await npcSay(d, n, pick(W.marcus.hello));
        const c = await choose(d, q, "Marcus Bell", [
          { id: "mail", label: "« Du courrier pour moi ? »" },
          { id: "bye", label: "« Bonne journée, Marcus. »" },
        ]);
        if (c === "mail") {
          await npcSay(d, n, W.marcus.mailYes);
          serviceMail(n);
        }
        break;
      }
      case "sam":
      case "lena": {
        const L = W[id];
        await npcSay(d, n, pick(L.hello));
        await npcSay(d, n, pick(L.talk));
        break;
      }
      case "guard":
        await npcSay(d, n, pick(W.guard.hello));
        break;
      default:
        await npcSay(d, n, pick(W.extra));
    }
  });
}

async function selfCoffee(d: Director) {
  const c = spot("coffee");
  const p = worldRuntime.player;
  const pl = worldSys.player!;
  worldRuntime.frozen = true;
  p.rot = c.rot;
  await pl.play("pickup", { once: true, speed: 1.4 });
  worldRuntime.frozen = false;
  d.sfx("sfx-paper-slide", { volume: 0.2, rate: 1.8 });
  toast(W.coffeeSelf);
  giveCoffeeToPlayer();
}

async function sitAtDesk(d: Director, start?: "board" | "phone" | "cases") {
  const ch = playerChair(decorNow());
  const pl = worldSys.player!;
  const p = worldRuntime.player;
  if (ch) {
    worldRuntime.frozen = true;
    p.x = ch.x;
    p.z = ch.z;
    p.rot = ch.rot;
    pl.sit();
    worldRuntime.cam.yaw = p.rot + Math.PI;
    await d.wait(0.9);
  }
  await leaveWorld(d);
  const fileOnDesk = profile().flags.fileOnDesk === "1";
  if (fileOnDesk) profile().setFlag("fileOnDesk", "");
  await deskSession(d, { start: start ?? (fileOnDesk ? "cases" : undefined) });
  pl.stand();
  await enterWorld(d, "desk");
}

export const worldSequence: Sequence = async (d) => {
  resetArrivalState();
  const q = worldQueue();
  await enterWorld(d, "office");
  if (!profile().flags.worldIntro) {
    profile().setFlag("worldIntro", "1");
    ui().set({ objective: W.objectiveFirst });
    toast(W.enterFirst);
  }
  (window as unknown as { __worldReady?: boolean }).__worldReady = true;
  let steps = false;
  const stepTimer = window.setInterval(() => {
    const moving = ui().active && worldRuntime.player.speed > 0.4;
    if (moving !== steps) {
      steps = moving;
      if (moving) void audio.startLoop("steps", "sfx-footsteps", worldRuntime.player.speed > 2 ? 0.5 : 0.32, 0.15);
      else audio.stopLoop("steps", 0.25);
    }
  }, 150);
  try {
    for (;;) {
      const a = await q.next(d, (x) => x.type === "interact");
      if (a.type !== "interact") continue;
      const id = a.id;
      ui().set({ prompt: null });
      if (id.startsWith("npc:")) {
        const who = id.slice(4);
        await talkTo(d, q, who);
        if (who === "theo" && ui().objective === W.objectiveFirst) ui().set({ objective: null });
      } else if (id === "desk") await sitAtDesk(d);
      else if (id === "board") await sitAtDesk(d, "board");
      else if (id === "mail") await sitAtDesk(d, "phone");
      else if (id === "coffee") await selfCoffee(d);
      else if (id === "elevator") toast(W.elevator);
      else if (id === "archives") {
        profile().addCareer({ billed: 90 });
        toast(W.archives);
      } else if (id === "vance") toast(W.vance);
    }
  } finally {
    window.clearInterval(stepTimer);
    q.off();
    audio.stopLoop("office");
    audio.stopLoop("steps");
    ui().set({ active: false, prompt: null, menu: null });
  }
};
