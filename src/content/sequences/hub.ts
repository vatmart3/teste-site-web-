/**
 * Le bureau (hub) : le joueur choisit librement un objet ; chaque objet ouvre sa vue.
 * Gère aussi l'écoute des messages vocaux, la visite chez Harlow et le déménagement à chaque promotion.
 */
import { HUB } from "@/content/dialogue/hub";
import { MESSAGES } from "@/content/messages";
import { newYorkTime } from "@/lib/time";
import { audio } from "@/engine/audio/AudioEngine";
import { resetRig } from "@/engine/camera/rig";
import { rankIndexFor, RANKS } from "@/engine/career/ranks";
import type { Director, Sequence } from "@/engine/director/director";
import { caseFan } from "@/engine/hub/CaseFolders";
import { briefcaseState } from "@/engine/hub/DeskObjects";
import { moveState } from "@/engine/hub/Promotion3D";
import { DESK_PITCH } from "@/engine/hub/space";
import { hubBus, useHub, type HubAction, type HubView } from "@/engine/hub/state";
import { propCamera } from "@/engine/props/model";
import { useProfile } from "@/engine/state/profile";
import { useStage } from "@/engine/state/stage";
import type { Transition } from "@/engine/state/stage";
import { resetArrivalState } from "./arrival";
import { playMidnightAudit } from "./audit";
import { officeFor } from "@/engine/career/office";
import { roomClock, roomState } from "@/engine/room/roomState";

const hub = () => useHub.getState();
const profile = () => useProfile.getState();

async function enterOffice(d: Director, transition: Transition = "cut") {
  hub().set({ active: false, view: null, hovered: null, selectedCase: null });
  roomClock.mode = "ny";
  roomState.lamp = 1;
  roomState.neon = 1;
  const { scene, variant } = officeFor(profile().officeRank);
  const cur = useStage.getState().current;
  if (!cur || cur.sceneId !== scene || cur.variant !== variant) {
    await d.show(scene, { variant, transition, camera: { exposure: transition === "cut" ? 0 : 1, focus: 0.55, aperture: 0.25, dolly: 0, panX: 0, panY: 0, lift: 0, lookAmount: 1 } });
  }
  propCamera.pitch = DESK_PITCH;
  hub().set({ active: true });
  await d.fadeBlack(0, 1.2);
  void d.letterbox(false);
}

async function openView(d: Director, view: HubView) {
  if (hub().view) await closeView(d);
  hub().set({ view, hovered: null });
  // Le décor recule : flou et assombri, l'objet choisi occupe le premier plan.
  d.camAsync({ focus: 0.98, aperture: 0.9, exposure: 0.55 }, 0.5, "power2.out");
  switch (view) {
    case "cases":
      d.sfx("sfx-paper-slide", { volume: 0.7 });
      await d.tween(caseFan, { t: 1 }, 1.1, "power2.out");
      break;
    case "briefcase":
      d.sfx("sfx-briefcase-open", { at: { x: 0.2, y: 0.75 }, depth: 0.8 });
      await d.tween(briefcaseState, { open: 1 }, 0.8, "back.out(1.4)");
      break;
    case "terminal":
      void audio.startLoop("fan", "amb-computer-fan", 0.3);
      break;
    case "phone":
      d.sfx("sfx-paper-flip", { volume: 0.3, rate: 1.8 });
      break;
    default:
      break;
  }
}

async function closeView(d: Director) {
  const view = hub().view;
  if (!view) return;
  if (view === "cases") await d.tween(caseFan, { t: 0 }, 0.6, "power2.in");
  if (view === "briefcase") {
    d.sfx("sfx-desk-knock", { volume: 0.4 });
    await d.tween(briefcaseState, { open: 0 }, 0.5, "power2.in");
  }
  if (view === "terminal") audio.stopLoop("fan");
  hub().set({ view: null, selectedCase: null });
  await d.cam({ focus: 0.55, aperture: 0.25, exposure: 1 }, 0.45, "power2.out");
}

async function playVoicemail(d: Director, id: string) {
  const m = MESSAGES.find((x) => x.id === id);
  if (!m || m.kind !== "voicemail") return;
  d.sfx("sfx-badge-beep", { volume: 0.4 });
  for (const l of m.lines) await d.line(l);
  profile().markRead(id);
}

async function visitHarlow(d: Director) {
  hub().set({ active: false });
  await d.fadeBlack(1, 0.6);
  propCamera.pitch = 0;
  d.sfx("sfx-footsteps", { volume: 0.6 });
  await d.show("07-corner-office", { transition: "cut", camera: { focus: 0.45, aperture: 0.35, dolly: 0.15, dollyX: 0.5, dollyY: 0.45 } });
  void d.letterbox(true);
  await d.fadeBlack(0, 0.9);
  const h = newYorkTime().hours;
  await d.line(h >= 20 || h < 6 ? HUB.harlowVisitLate : HUB.harlowVisit);
  await d.wait(0.4);
  await d.fadeBlack(1, 0.6);
  await enterOffice(d, "cut");
}

/** Déménagement vers le bureau du nouveau rang : cartons, plaque gravée vissée, nouveau décor. */
export async function promotion(d: Director, rank: number) {
  hub().set({ view: null, moving: true });
  await d.fadeBlack(1, 0.8);
  d.sfx("sfx-boxes", { volume: 0.8 });
  profile().setOfficeRank(rank);
  moveState.boxes = 0;
  moveState.plate = 0;
  moveState.screws = 0;
  const { scene, variant } = officeFor(rank);
  await d.show(scene, { variant, transition: "cut", camera: { exposure: 0, focus: 0.9, aperture: 0.6 } });
  hub().set({ active: true });
  void d.letterbox(true);
  d.tweenAsync(moveState, { boxes: 1 }, 1.2, "bounce.out");
  await d.fadeBlack(0, 1);
  await d.tween(moveState, { plate: 1 }, 0.9, "power3.out");
  for (let i = 1; i <= 4; i++) {
    d.sfx("sfx-screw", { volume: 0.7, rate: 0.9 + i * 0.05 });
    await d.tween(moveState, { screws: i / 4 }, 0.45, "power1.inOut");
  }
  d.music.start();
  d.music.intensity(0.2, 1);
  d.sfx("mus-verdict-sting", { volume: 0.6 });
  await d.line({ ...HUB.deskPromotion, text: `${RANKS[rank]?.title ?? ""}. ${HUB.deskPromotion.text}` });
  await d.tween(moveState, { plate: 0 }, 0.6, "power2.in");
  await d.tween(moveState, { boxes: 0 }, 0.8, "power2.in");
  await d.cam({ focus: 0.55, aperture: 0.25 }, 0.6);
  await d.letterbox(false);
  hub().set({ moving: false });
}

/**
 * File d'attente des actions : un clic pendant une animation ou un message vocal n'est jamais perdu.
 * Deux « open » successifs identiques sont dédoublonnés.
 */
function actionQueue() {
  const queue: HubAction[] = [];
  let wake: (() => void) | null = null;
  const off = hubBus.on((a) => {
    const last = queue[queue.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(a)) return;
    queue.push(a);
    wake?.();
  });
  return {
    off,
    next: async (d: Director): Promise<HubAction> => {
      while (!queue.length) {
        await d.waitBus<void>((h) => {
          wake = () => h();
          return () => {
            wake = null;
          };
        });
      }
      return queue.shift()!;
    },
  };
}

export const hubSequence: Sequence = async (d) => {
  const actions = actionQueue();
  resetArrivalState();
  resetRig();
  await enterOffice(d);
  if (!profile().flags.hubIntro) {
    profile().setFlag("hubIntro", "1");
    d.prompt("Votre bureau · survolez les objets, cliquez pour les ouvrir");
    window.setTimeout(() => d.prompt(null), 7000);
  }
  try {
    for (;;) {
      const target = rankIndexFor(profile().reputation);
      if (target > profile().officeRank) await promotion(d, target);
      const a = await actions.next(d);
      switch (a.type) {
        case "open":
          await openView(d, a.view);
          break;
        case "close":
          await closeView(d);
          break;
        case "play":
          await playVoicemail(d, a.messageId);
          break;
        case "visit":
          await closeView(d);
          await visitHarlow(d);
          break;
        case "case":
          if (a.id === "midnight-audit") {
            await closeView(d);
            await playMidnightAudit(d);
            await enterOffice(d, "cut");
          }
          break;
      }
    }
  } finally {
    actions.off();
    hub().set({ active: false, view: null, moving: false });
    propCamera.pitch = 0;
    audio.stopLoop("fan");
    caseFan.t = 0;
    briefcaseState.open = 0;
  }
};

/** Pour les tests et le labo : ajoute de la réputation et déclenche la promotion au prochain passage. */
export function grantReputation(points: number) {
  profile().addCareer({ reputation: points, billed: points * 180 });
  hubBus.emit({ type: "close" });
}
