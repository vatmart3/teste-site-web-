/**
 * Séquence d'arrivée (~90 s de cinématique, le joueur agit à chaque plan) :
 * 1 taxi → 2 pied de la tour → 3 hall + badge → 4 ascenseur → 5 accueil du 52e →
 * 6 open space + rival → 7 bureau d'angle + dossier MERIDIAN → 8 votre bureau.
 */
import { ARRIVAL } from "@/content/dialogue/arrival";
import { audio } from "@/engine/audio/AudioEngine";
import { resetRig, rig } from "@/engine/camera/rig";
import type { Director, Sequence } from "@/engine/director/director";
import { fxOverrides } from "@/engine/plate/registry";
import { readerScreen } from "@/engine/props/Badge";
import { badge, folder, phone, PROP_FOV, resetTransform, screenToCamera, useProps } from "@/engine/props/model";
import { useProfile } from "@/engine/state/profile";
import { anchorState } from "@/engine/ui/Anchors";
import type { IdentityResult } from "@/engine/ui/IdentityForm";
import type { SceneId } from "@/content/scenes";

const props = () => useProps.getState();

function todayLabel(): string {
  return new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

/** Travelling avant vers un point du plan, puis fondu de profondeur vers le plan suivant. */
async function travel(d: Director, to: SceneId, at: { x: number; y: number }, focus = 0.3) {
  d.sfx("sfx-footsteps", { volume: 0.5 });
  await d.cam({ dolly: 0.85, dollyX: at.x, dollyY: at.y }, 1.3, "power2.in");
  await d.show(to, { transition: "depth", duration: 1.2, camera: { dolly: 0, dollyX: 0.5, dollyY: 0.5, focus, panX: 0, panY: 0 } });
}

/** Remet les accessoires et effets à zéro (début, saut, fin). */
export function resetArrivalState(): void {
  props().set({ phone: false, badge: false, folder: false, badgeDraggable: false, phoneScreen: { mode: "off" } });
  fxOverrides.tint = [1, 1, 1];
  anchorState.floor = 1;
  anchorState.reader = "idle";
  audio.setMusicFilter(20000, 0.3);
}

export const arrival: Sequence = async (d) => {
  resetArrivalState();
  const profile = useProfile.getState();

  // ================================================================ Plan 1 — Taxi, 6 h 40, pluie
  d.preload("02-tower-base");
  await d.cam({ exposure: 0, focus: 0.97, aperture: 0.55, lookAmount: 0.7, panX: 0, panY: 0, dolly: 0, lift: 0, roll: 0 }, 0);
  await d.show("01-taxi-night", { transition: "cut", soundFade: 3 });
  void d.letterbox(true);
  await d.fadeBlack(0, 3);
  await d.focus(0.22, 2.4); // des gouttes du pare-brise vers la ville
  await d.line(ARRIVAL.taxiNarration);

  // Le téléphone vibre sur la banquette.
  props().set({ phone: true, phoneScreen: { mode: "lock", time: "6:40", date: todayLabel(), sms: { from: "R. Harlow", text: ARRIVAL.taxiSms.text } } });
  resetTransform(phone, 0.16, -0.42, -0.6);
  phone.rx = -0.5;
  phone.vibrate = 1;
  d.sfx("sfx-phone-vibrate", { at: { x: 0.5, y: 0.98 }, depth: 1, volume: 0.9 });
  d.shake(0.15);
  await d.tween(phone, { y: -0.05, rx: -0.1, rz: -0.06 }, 1.2, "power3.out");
  phone.vibrate = 0;
  await d.focus(1, 0.6); // mise au point sur le téléphone : la ville se floute
  await d.line(ARRIVAL.taxiSms, { hold: 3.4 });
  await d.tween(phone, { y: -0.55, rx: -0.6 }, 0.7, "power2.in");
  props().set({ phone: false });
  await d.focus(0.25, 1);
  await d.line(ARRIVAL.taxiDriver);
  await d.letterbox(false);
  await d.panel<boolean>({ kind: "swipe", label: "Glisser pour ouvrir la portière" });

  // ================================================================ Plan 2 — Au pied de la tour
  d.preload("03-lobby");
  d.preload("03b-lobby-guard");
  await d.cam({ panX: 0.08, exposure: 0 }, 0.5, "power2.in");
  await d.show("02-tower-base", {
    transition: "cut",
    soundFade: 0.3,
    camera: { panX: 0, panY: -0.36, dolly: 0, focus: 0.9, aperture: 0.3, lookAmount: 0.5 },
  });
  void d.letterbox(true);
  await d.fadeBlack(0, 0.8);
  await d.cam({ panY: 0.34, focus: 0.25 }, 6.5, "power2.inOut"); // le regard monte le long de la façade
  await d.wait(0.4);
  await d.cam({ panY: -0.36, focus: 0.92 }, 2.6, "power3.inOut");
  await d.letterbox(false);
  await d.waitForHotspot("revolving-door", "Entrez");

  // La porte tambour tourne : le son de la rue se coupe net, écho du hall.
  d.sfx("sfx-door-revolving", { volume: 0.9 });
  await d.cam({ dolly: 0.55, dollyX: 0.5, dollyY: 0.9 }, 1.1, "power2.in");
  await d.show("03-lobby", {
    transition: "depth",
    duration: 1.6,
    soundFade: 0.15,
    camera: { panY: 0, dolly: 0, focus: 0.15, aperture: 0.4, lookAmount: 1 },
  });

  // ================================================================ Plan 3 — Le hall, le badge
  await d.focus(0.45, 1.8);
  await d.waitForHotspot("desk", "Avancez jusqu'à l'accueil");
  d.sfx("sfx-footsteps", { volume: 0.6 });
  await d.cam({ dolly: 0.6, dollyX: 0.5, dollyY: 0.55 }, 1.4);
  await d.show("03b-lobby-guard", { transition: "depth", duration: 1.1, sound: false, camera: { dolly: 0, focus: 0.62, aperture: 0.55 } });
  await d.line(ARRIVAL.guardName);

  const who = await d.panel<IdentityResult>({ kind: "identity" });
  profile.setIdentity(who.firstName, who.lastName, who.avatar);

  // Photo : flash, puis l'imprimante crache le badge.
  await d.line(ARRIVAL.guardPhoto, { hold: 1.4 });
  d.sfx("sfx-camera-flash");
  await d.cam({ exposure: 2.2 }, 0.05, "none");
  await d.cam({ exposure: 1 }, 0.7, "power2.out");
  d.sfx("sfx-badge-print", { at: { x: 0.2, y: 0.72 }, depth: 0.85 });
  const aspect = window.innerWidth / window.innerHeight;
  const slot = screenToCamera(0.21, 0.27, -0.5, PROP_FOV, aspect);
  resetTransform(badge, slot.x, slot.y, -0.5);
  badge.rx = -1.35;
  badge.ry = Math.PI;
  badge.scale = 0.9;
  props().set({ badge: true });
  await d.tween(badge, { y: slot.y + 0.05 }, 1.4, "none"); // sort de l'imprimante
  await d.tween(badge, { x: 0, y: -0.005, z: -0.34, rx: 0.05, ry: 0, rz: -0.04, scale: 1 }, 1.6, "power3.inOut");
  d.sfx("sfx-paper-flip", { volume: 0.5, rate: 1.4 });
  badge.float = 1;
  await d.wait(1.2);
  await d.line(ARRIVAL.guardWelcome);

  // Retour au plan large : le badge en main, à glisser sur le lecteur du portique.
  await d.show("03-lobby", { transition: "fade", duration: 0.9, sound: false, camera: { focus: 0.7, aperture: 0.35 } });
  await d.tween(badge, { x: 0.09, y: -0.075, z: -0.4, rz: 0.1 }, 0.8, "power2.out");
  props().set({ badgeDraggable: true });
  await d.waitForHotspot("reader", "Glissez votre badge sur le lecteur");
  props().set({ badgeDraggable: false });
  badge.float = 0;
  const reader = readerScreen(window.innerWidth, window.innerHeight);
  if (reader) {
    const at = screenToCamera(reader.x, reader.y, -0.55, PROP_FOV, aspect);
    await d.tween(badge, { x: at.x, y: at.y + 0.02, z: -0.55, rx: -0.4, rz: 0, scale: 0.8 }, 0.45, "power2.out");
  }
  d.sfx("sfx-badge-beep", { at: { x: 0.435, y: 0.69 }, depth: 0.72 });
  anchorState.reader = "ok";
  await d.wait(0.35);
  d.sfx("sfx-turnstile", { at: { x: 0.45, y: 0.72 }, depth: 0.75 });
  await d.tween(badge, { y: -0.45, rx: -1.2 }, 0.6, "power2.in");
  props().set({ badge: false });
  await d.line(ARRIVAL.guardFloor);

  // ================================================================ Plan 4 — L'ascenseur panoramique
  d.preload("04-elevator-dawn");
  d.preload("05-reception-52");
  await d.cam({ dolly: 0.9, dollyX: 0.44, dollyY: 0.62 }, 1.5, "power2.in");
  await d.fadeBlack(1, 0.5);
  anchorState.reader = "idle";
  anchorState.floor = 1;
  fxOverrides.tint = [0.5, 0.62, 1];
  await d.show("04-elevator-dawn", {
    transition: "cut",
    soundFade: 0.6,
    camera: { dolly: 0, lift: 0, panX: 0, panY: -0.31, focus: 0.2, aperture: 0.2, lookAmount: 0.6 },
  });
  d.music.start();
  d.music.intensity(0, 0.1);
  d.music.filter(1300, 0.05); // musique d'ascenseur, petit haut-parleur
  d.sfx("sfx-elevator-doors");
  void d.letterbox(true);
  await d.fadeBlack(0, 1.2);

  const ride = 34;
  const ascent = Promise.all([
    d.tweenAsync(anchorState, { floor: 52 }, ride, "power2.inOut"),
    d.tweenAsync(rig, { lift: 0.32 }, ride, "power2.inOut"),
    d.tweenAsync(fxOverrides.tint, { 0: 1.12, 1: 0.96, 2: 0.84 }, ride, "power1.inOut"),
  ]);

  // Message vocal de Harlow sur le téléphone.
  props().set({ phone: true, phoneScreen: { mode: "voicemail", from: "R. Harlow", duration: 40 } });
  resetTransform(phone, 0.2, -0.5, -0.6);
  phone.rx = -0.3;
  phone.progress = 0;
  await d.tween(phone, { y: -0.04, rx: -0.08, rz: 0.05 }, 1, "power3.out");
  d.tweenAsync(phone, { progress: 1 }, ride - 5, "none");
  for (const l of [ARRIVAL.voicemail1, ARRIVAL.voicemail2, ARRIVAL.voicemail3, ARRIVAL.voicemail4, ARRIVAL.voicemail5]) {
    await d.line(l);
  }
  await d.tween(phone, { y: -0.55, rx: -0.5 }, 0.8, "power2.in");
  props().set({ phone: false });
  await ascent;

  // DING. La musique d'ascenseur devient le thème du jeu ; les portes s'ouvrent depuis le centre.
  d.sfx("sfx-elevator-ding");
  d.music.filter(20000, 2.5);
  d.music.intensity(0.1, 2);
  await d.wait(0.7);
  d.sfx("sfx-elevator-doors");
  fxOverrides.tint = [1, 1, 1];
  await d.show("05-reception-52", {
    transition: "doors",
    duration: 1.8,
    soundFade: 1.2,
    camera: { lift: 0, panY: 0, focus: 0.25, aperture: 0.45, lookAmount: 1 },
  });

  // ================================================================ Plan 5 — Accueil du 52e
  d.preload("06a-openspace");
  await d.focus(0.55, 1.2); // mise au point sur Nora
  d.mood("nora", "idle");
  await d.line(ARRIVAL.noraWelcome, { after: "pleased" });
  await d.focus(0.2, 1.4); // puis sur le couloir
  await d.letterbox(false);
  await d.waitForHotspot("corridor", "Le couloir");

  // ================================================================ Plan 6 — Traversée de l'open space
  d.preload("06b-openspace");
  await travel(d, "06a-openspace", { x: 0.2, y: 0.6 });
  await d.waitForHotspot("forward", "Avancez");
  d.preload("06c-openspace");
  await travel(d, "06b-openspace", { x: 0.5, y: 0.45 });
  await d.waitForHotspot("forward", "Avancez");
  d.preload("06-rival-door");
  await travel(d, "06c-openspace", { x: 0.5, y: 0.45 }, 0.2);
  await d.waitForHotspot("forward", "Continuer");
  await travel(d, "06-rival-door", { x: 0.5, y: 0.45 }, 0.6);

  // Le rival.
  void d.letterbox(true);
  d.preload("07-corner-office");
  d.mood("mercer", "pleased");
  await d.line(ARRIVAL.mercerIntro, { after: "pleased" });
  const reply = await d.panel<string>({
    kind: "choice",
    prompt: "Votre réponse",
    options: [
      { id: "ignore", label: "L'ignorer et passer.", hint: "Il déteste qu'on l'ignore." },
      { id: "retort", label: "« Une semaine ? Il m'en faudra moins pour avoir ton bureau. »", hint: "Du tac au tac." },
      { id: "smile", label: "Sourire, sans un mot.", hint: "Laisser venir." },
    ],
  });
  useProfile.getState().setFlag("mercer_intro", reply);
  if (reply === "ignore") {
    useProfile.getState().adjustRelation("mercer", -5);
    d.mood("mercer", "tense");
    await d.line(ARRIVAL.mercerAfterIgnore, { state: "tense", after: "tense" });
  } else if (reply === "retort") {
    useProfile.getState().adjustRelation("mercer", -10);
    await d.line(ARRIVAL.playerRetort);
    d.mood("mercer", "tense");
    await d.line(ARRIVAL.mercerAfterRetort, { after: "tense" });
  } else {
    useProfile.getState().adjustRelation("mercer", 5);
    await d.line(ARRIVAL.mercerAfterSmile, { after: "pleased" });
  }

  // ================================================================ Plan 7 — Le bureau d'angle
  d.sfx("sfx-footsteps", { volume: 0.5 });
  await d.cam({ panX: 0.12, dolly: 0.5, dollyX: 0.8, dollyY: 0.5 }, 1.2, "power2.in");
  await d.show("07-corner-office", { transition: "depth", duration: 1.6, camera: { panX: 0, dolly: 0, focus: 0.1, aperture: 0.4 } });
  d.music.intensity(0.2, 3);
  await d.wait(0.6);
  await d.focus(0.45, 1.6); // Harlow se découpe à contre-jour
  await d.line(ARRIVAL.harlowStand);
  await d.line(ARRIVAL.harlowMessage);
  await d.line(ARRIVAL.harlowBriefing);

  // Il fait glisser la chemise « MERIDIAN » sur le bureau en verre.
  resetTransform(folder, 0.03, -0.34, -2.2);
  folder.rx = -Math.PI / 2;
  folder.rz = 0.7;
  props().set({ folder: true });
  d.sfx("sfx-paper-slide", { at: { x: 0.5, y: 0.8 }, depth: 0.8 });
  await Promise.all([d.tween(folder, { z: -0.95, x: 0, rz: -0.06 }, 1.4, "power3.out"), d.focus(0.85, 1.2)]);
  await d.line(ARRIVAL.harlowFolder);
  await d.focus(0.45, 0.8);
  await d.line(ARRIVAL.harlowDeadline);
  await d.letterbox(false);
  await d.waitForHotspot("prop:folder", "Attrapez le dossier");

  d.sfx("sfx-paper-flip", { volume: 0.7 });
  await Promise.all([d.tween(folder, { x: 0.05, y: 0.0, z: -0.72, rx: -0.2, rz: 0 }, 0.8, "power3.out"), d.focus(1, 0.6)]);
  folder.float = 1;
  await d.wait(0.3);
  d.sfx("sfx-paper-flip", { volume: 0.8, rate: 0.9 });
  await d.tween(folder, { cover: 1 }, 0.9, "power2.inOut");
  void d.letterbox(true);
  d.sfx("sfx-paper-slide", { volume: 0.6, rate: 1.3 });
  await Promise.all([d.tween(folder, { fan: 1 }, 1.4, "power2.out"), d.tween(folder, { x: 0.02, z: -0.46, y: 0.01, rx: -0.05 }, 1.8, "power2.inOut")]);
  await d.fadeBlack(1, 0.7);
  props().set({ folder: false });

  // ================================================================ Plan 8 — Votre bureau
  await deskOpening(d);
  useProfile.getState().markArrivalSeen();
};

/** Arrivée à son bureau (fin de la séquence, et point de reprise quand on la saute). */
async function deskOpening(d: Director) {
  resetArrivalState();
  await d.show("08-desk-intern-night", {
    variant: "night",
    transition: "cut",
    soundFade: 1.5,
    camera: { dolly: 0, lift: 0, panX: 0, panY: 0, focus: 0.55, aperture: 0.3, lookAmount: 1, exposure: 0 },
  });
  d.music.start();
  d.music.intensity(0, 2);
  await d.fadeBlack(0, 1.8);
  await d.line(ARRIVAL.deskNarration);
  await d.letterbox(false);
}

/** Le bureau (hub) — interactif en phase 3 ; ici, l'état de fin de l'arrivée. */
export const deskHub: Sequence = async (d) => {
  resetRig();
  await deskOpening(d);
  d.prompt("Votre bureau — la suite (objets, téléphone, dossiers) arrive en phase 3");
  await d.hold();
};
