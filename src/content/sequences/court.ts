/**
 * Affaire 2 — « Le contre-interrogatoire » :
 * tableau d'enquête (préparation) → marches du tribunal → salle d'audience →
 * interrogatoire principal de Brandt (objections au bon moment) → contre-interrogatoire (questions,
 * pièces opposées au témoin, pression) → aveu ou non → débrief chez Harlow.
 */
import gsap from "gsap";
import { CROSS_EXAMINATION as DEF } from "@/content/cases/crossExamination";
import { MERIDIAN_BOARD } from "@/content/cases/meridianBoard";
import { COURT, directLine, topicLine } from "@/content/dialogue/court";
import { audio } from "@/engine/audio/AudioEngine";
import { ttsState } from "@/engine/audio/tts";
import { useDebrief } from "@/engine/audit/DebriefOverlay";
import { courtEvidenceFrom } from "@/engine/board/logic";
import { rig } from "@/engine/camera/rig";
import { applyEvent, inObjectionWindow, scoreCourt, START_GAUGES, witnessBreaks, witnessTells } from "@/engine/court/rules";
import { courtBus, lineProgress, useCourt, type CourtInput } from "@/engine/court/state";
import type { CourtEvent, CourtGauges, CourtResult, DirectLine, ObjectionGround, Topic } from "@/engine/court/types";
import { readingTime, type Director } from "@/engine/director/director";
import { advanceBus } from "@/engine/director/events";
import { useHub } from "@/engine/hub/state";
import { folder, propCamera, resetTransform, useProps } from "@/engine/props/model";
import { tellsOf } from "@/engine/room/Actor";
import { harlowTurn } from "@/engine/room/roomState";
import { useProfile } from "@/engine/state/profile";
import { useSettings } from "@/engine/state/settings";
import { runBoard } from "./board";

const CASE_ID = "cross-examination";
const court = () => useCourt.getState();
const profile = () => useProfile.getState();

// ------------------------------------------------------------------------------------------------ outils
function stamp(text: string, tone: "red" | "brass" | "grey" = "red") {
  court().set({ stamp: { text, tone, id: Date.now() } });
  window.setTimeout(() => {
    if (court().stamp?.text === text) court().set({ stamp: null });
  }, 1800);
}

/** Coupe de montage vers une station de la salle (sans glissement), la caméra se rapproche du témoin avec la pression. */
async function cut(d: Director, station: string, glide = 0) {
  rig.dolly = station === "witness" ? court().gauges.pressure / 100 : 0;
  await d.station(station, glide);
}

/** Attend une entrée du joueur au tribunal (avec délai optionnel → null). */
async function waitInput<T extends CourtInput["type"]>(d: Director, types: T[], timeout?: number): Promise<Extract<CourtInput, { type: T }> | null> {
  type R = Extract<CourtInput, { type: T }>;
  const listen = (h: (v: R) => void) =>
    courtBus.on((e) => {
      if ((types as string[]).includes(e.type)) h(e as R);
    });
  if (timeout === undefined) return d.waitBus<R>(listen);
  let off: () => void = () => undefined;
  const input = new Promise<R>((resolve) => {
    off = listen(resolve);
  });
  try {
    return await Promise.race([input, d.wait(timeout).then(() => null)]);
  } finally {
    off();
  }
}

class Hearing {
  events: CourtEvent[] = [];
  gauges: CourtGauges = { ...START_GAUGES };
  contradictions = 0;

  push(d: Director, e: CourtEvent) {
    this.events.push(e);
    this.gauges = applyEvent(this.gauges, e, DEF);
    if (e.type === "contradiction") this.contradictions++;
    court().set({ gauges: this.gauges });
    this.applyTells(d);
  }

  /** Micro-signes et humeurs selon les jauges (ce sont des indices lisibles pour le joueur). */
  applyTells(d: Director) {
    const g = this.gauges;
    const t = witnessTells(g.pressure);
    const r = tellsOf("rourke");
    r.sweat = t.sweat;
    r.gazeAway = t.gazeAway ? 1 : 0;
    r.swallow = t.swallow ? 1 : 0;
    r.loosenTie = t.loosenTie ? 1 : 0;
    d.mood("rourke", g.pressure >= 50 ? "tense" : "idle");
    tellsOf("brandt").penTap = this.contradictions >= 2 ? 1 : 0;
    d.mood("brandt", this.contradictions >= 2 ? "tense" : "pleased");
    d.mood("whitford", g.patience < 40 ? "tense" : "idle");
    d.music.intensity(0.25 + (g.pressure / 100) * 0.75, 2);
    if (g.pressure >= 70) void audio.startLoop("heart", "sfx-heartbeat", 0.22, 1.5);
    else audio.stopLoop("heart");
  }
}

// ------------------------------------------------------------------------------ interrogatoire principal
/** Brandt pose une question ; le joueur peut objecter pendant qu'elle parle. */
async function brandtAsks(d: Director, h: Hearing, line: DirectLine, first: boolean): Promise<"sustained" | "answered"> {
  await cut(d, first ? "counsel" : Math.random() < 0.5 ? "brandt" : "counsel");
  const l = directLine(line.id);
  court().set({ objectionOpen: true });
  const t0 = performance.now();
  const est = readingTime(l.text) * 1000;
  const tick = () => {
    lineProgress.value = ttsState.speaking ? ttsState.charIndex / ttsState.length : Math.min(1, (performance.now() - t0) / est);
  };
  gsap.ticker.add(tick);
  let objectedAt: number | null = null;
  const off = courtBus.on((e) => {
    if (e.type === "objection" && objectedAt === null && court().objectionOpen) {
      objectedAt = lineProgress.value;
      advanceBus.emit(); // la réplique est coupée net
    }
  });
  try {
    await d.line(l, { state: "talk", after: "pleased" });
  } finally {
    off();
    gsap.ticker.remove(tick);
    court().set({ objectionOpen: false });
  }
  if (objectedAt === null) {
    if (line.objection) h.push(d, { type: "missed-objection", line: line.id });
    return "answered";
  }

  // --- OBJECTION !
  d.music.cut();
  d.sfx("sfx-objection", { volume: 1 });
  stamp("OBJECTION !", "red");
  d.shake(0.5);
  void d.line(COURT.playerObjection, { hold: 0.9 }).catch(() => undefined);
  await cut(d, "judge");
  court().set({ choosingGround: true });
  const noTimer = useSettings.getState().noTimer;
  const pick = await waitInput(d, ["ground"], noTimer ? undefined : 8);
  court().set({ choosingGround: false });
  advanceBus.emit();
  const ground: ObjectionGround | null = pick?.ground ?? null;
  const inWindow = inObjectionWindow(objectedAt, line.objection);
  d.sfx("sfx-gavel", { volume: 0.9 });
  d.shake(0.3);
  if (line.objection && inWindow && ground === line.objection.ground) {
    h.push(d, { type: "objection", line: line.id, ground, correct: true });
    stamp("RETENUE", "brass");
    await d.line(COURT.sustained);
    d.mood("brandt", "tense");
    await cut(d, "brandt");
    await d.line(COURT.brandtWithdraw, { after: "tense" });
    d.music.resume(1.5);
    return "sustained";
  }
  if (line.objection && inWindow) {
    h.push(d, { type: "objection", line: line.id, ground: ground ?? "relevance", correct: false });
    stamp("REJETÉE", "grey");
    await d.line(COURT.overruledWrongGround);
  } else {
    h.push(d, { type: "bad-objection", line: line.id });
    stamp("REJETÉE", "grey");
    await d.line(COURT.overruled);
  }
  d.music.resume(1.5);
  return "answered";
}

async function directExamination(d: Director, h: Hearing) {
  court().set({ phase: "direct" });
  const lines = DEF.direct;
  let first = true;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.speaker === "brandt") {
      const r = await brandtAsks(d, h, line, first);
      first = false;
      // La réponse du témoin est sautée si l'objection est retenue.
      if (r === "sustained" && lines[i + 1]?.speaker === "rourke") i++;
    } else {
      await cut(d, "witness");
      await d.line(directLine(line.id), { after: line.state === "pleased" ? "pleased" : "idle" });
    }
  }
}

// ------------------------------------------------------------------------------ contre-interrogatoire
function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

async function askTopic(d: Director, h: Hearing, topic: Topic): Promise<"done" | "end"> {
  const q = await d.panel<string>({ kind: "choice", prompt: topic.title, options: shuffle(topic.questions).map((x) => ({ id: x.id, label: x.label })) });
  const question = topic.questions.find((x) => x.id === q)!;
  h.push(d, { type: "question", topic: topic.id, style: question.style });
  await d.line({ id: `court-q-${question.id}`, speaker: "player", text: question.label.replace(/[«»]/g, "").trim(), emotion: "tendu", voiced: false });
  if (question.style === "aggressive") {
    await cut(d, "brandt-seat");
    await d.line(COURT.brandtObjects);
    await cut(d, "judge");
    d.sfx("sfx-gavel", { volume: 0.8 });
    h.push(d, { type: "sustained-against", topic: topic.id });
    await d.line(COURT.sustainedAgainst);
    if (h.gauges.patience <= 0) return "end";
    await cut(d, "lectern");
  }
  // Rourke affirme.
  await cut(d, "witness");
  await d.line(topicLine(topic.id, "claim"), { after: h.gauges.pressure >= 50 ? "tense" : "idle" });

  // Le joueur oppose une pièce (glisser vers le témoin) ou passe.
  court().set({ presenting: true });
  d.prompt("Faites glisser une pièce vers le témoin — ou continuez");
  const input = await waitInput(d, ["present", "pass"]);
  d.prompt(null);
  court().set({ presenting: false });
  if (input?.type === "present") {
    const piece = input.piece;
    if (piece === topic.contradictedBy) {
      court().set({ used: [...court().used, piece] });
      // Ralenti, silence, tampon, murmure de la salle.
      d.music.cut();
      gsap.globalTimeline.timeScale(0.35);
      d.sfx("sfx-paper-slide", { volume: 1 });
      d.sfx("sfx-stamp", { volume: 1 });
      stamp("CONTRADICTION", "red");
      d.shake(0.35);
      h.push(d, { type: "contradiction", topic: topic.id, piece });
      await d.wait(0.45);
      gsap.globalTimeline.timeScale(1);
      d.sfx("sfx-crowd-gasp", { volume: 0.8 });
      window.setTimeout(() => void audio.sfx("sfx-crowd-murmur", { volume: 0.55 }), 500);
      tellsOf("rourke").surprise = 1;
      await d.line(topicLine(topic.id, "rebuttal"), { state: "tense", after: "tense" });
      tellsOf("rourke").surprise = 0;
      await cut(d, "jury");
      await d.wait(1.2);
      d.music.resume(1.2);
    } else {
      h.push(d, { type: "wrong-piece", topic: topic.id, piece });
      await cut(d, "judge");
      await d.line(COURT.wrongPiece);
    }
  } else if (topic.contradictedBy) {
    await d.line(COURT.noContradiction);
  }
  return "done";
}

async function crossExamination(d: Director, h: Hearing): Promise<boolean> {
  court().set({ phase: "cross" });
  await cut(d, "judge");
  await d.line(COURT.judgeCross);
  await cut(d, "counsel");
  d.prompt("Levez-vous : approchez-vous de la barre");
  await d.waitForHotspot("lectern", "Approchez-vous de la barre");
  d.sfx("sfx-footsteps", { volume: 0.5 });
  await d.station("lectern", 1.8);
  if (!profile().flags.courtTuto) {
    profile().setFlag("courtTuto", "1");
    await d.line(COURT.crossTutorial);
  }
  let remaining = [...DEF.topics];
  let warned = false;
  while (remaining.length) {
    const choice = await d.panel<string>({
      kind: "choice",
      prompt: "Votre prochaine question porte sur…",
      options: [...remaining.map((t) => ({ id: t.id, label: t.title })), { id: "stop", label: "Plus de questions, Votre Honneur.", hint: "Terminer le contre-interrogatoire" }],
    });
    if (choice === "stop") {
      await d.line(COURT.noMore);
      return false;
    }
    const topic = remaining.find((t) => t.id === choice)!;
    remaining = remaining.filter((t) => t.id !== choice);
    const r = await askTopic(d, h, topic);
    if (r === "end" || h.gauges.patience <= 0) {
      await cut(d, "judge");
      await d.line(COURT.patienceOut);
      return false;
    }
    if (!warned && h.gauges.patience < 40) {
      warned = true;
      await cut(d, "judge");
      await d.line(COURT.patienceLow);
    }
    if (witnessBreaks(DEF, h.gauges, h.contradictions)) return true;
    await cut(d, "lectern");
  }
  return witnessBreaks(DEF, h.gauges, h.contradictions);
}

async function breakdown(d: Director, h: Hearing) {
  d.music.cut();
  audio.stopLoop("heart");
  await cut(d, "witness");
  d.mood("rourke", "break");
  tellsOf("rourke").headInHands = 1;
  await d.wait(1.2);
  await d.line(COURT.rourkeBreak1, { state: "break", after: "break" });
  tellsOf("rourke").headInHands = 0;
  await d.line(COURT.rourkeBreak2, { state: "break", after: "break" });
  h.push(d, { type: "admission" });
  d.sfx("sfx-crowd-murmur", { volume: 0.9 });
  d.sfx("sfx-crowd-gasp", { volume: 0.7 });
  d.mood("brandt", "break");
  await cut(d, "brandt-seat");
  await d.wait(1.4);
  await cut(d, "judge");
  d.sfx("sfx-gavel", { volume: 1 });
  d.shake(0.35);
  await d.line(COURT.judgeSilence);
  d.sfx("mus-verdict-sting", { volume: 0.8 });
  await d.line(COURT.judgeRecess);
}

// ------------------------------------------------------------------------------------------- débrief
async function debrief(d: Director, r: CourtResult, h: Hearing) {
  await d.fadeBlack(1, 1);
  court().set({ phase: "off", hud: false });
  harlowTurn.value = 1;
  await d.show("07-corner-office", { transition: "cut", station: "hold", camera: { exposure: 0, focus: 0.45, aperture: 0.35, dolly: 0, panX: 0, panY: 0 } });
  const office3d = d.room === "corner-office";
  d.music.resume(1);
  d.music.intensity(0.15, 2);
  void d.letterbox(true);
  await d.fadeBlack(0, 1.2);
  await d.line(COURT.harlowAsk);
  resetTransform(folder, 0, office3d ? -0.405 : -0.26, office3d ? -1.3 : -0.9);
  folder.rx = office3d ? -Math.PI / 2 : -Math.PI / 2 + 0.35;
  folder.stamp = 0;
  folder.grade = "";
  folder.cover = 0;
  folder.fan = 0;
  useProps.getState().set({ folder: true });
  d.sfx("sfx-paper-slide", { volume: 0.7 });
  await d.tween(folder, office3d ? { z: -0.9 } : { y: -0.2, z: -0.72 }, 0.9, "power3.out");
  await d.line({ S: COURT.harlowS, A: COURT.harlowA, B: COURT.harlowB, C: COURT.harlowC }[r.grade]);
  if (r.missedObjections > 0 || r.objectionsWon === 0) await d.line(COURT.harlowObjections);
  if (office3d) await d.station("desk", 1.3);
  folder.grade = r.grade;
  await d.tween(folder, { stamp: 0.5 }, 0.45, "power3.in");
  d.sfx("sfx-stamp", { volume: 1 });
  d.shake(0.35);
  await d.wait(0.25);
  await d.tween(folder, { stamp: 1 }, 0.5, "power2.out");
  useDebrief.getState().set({ visible: true, grade: r.grade, score: r.score, fees: r.fees, hours: r.billedHours, reputation: r.reputation, found: r.contradictions.length, total: DEF.topics.filter((t) => t.contradictedBy).length, unit: "contradictions" });
  d.sfx("sfx-coins-counter", { volume: 0.8 });
  await d.wait(3.2);
  await d.line(COURT.harlowDismiss);
  useDebrief.getState().set({ visible: false });
  const lessons = ["cross-examination", "objections"];
  const fresh = lessons.filter((id) => !profile().lessons.includes(id));
  for (const id of lessons) profile().unlockLesson(id);
  if (fresh.length) await d.panel<boolean>({ kind: "lesson", ids: fresh });
  void h;
  await d.fadeBlack(1, 0.8);
  useProps.getState().set({ folder: false });
  void d.letterbox(false);
}

// ------------------------------------------------------------------------------------------ séquence
/** Point d'entrée depuis le bureau (pile de chemises → « Ouvrir le dossier »). */
export async function playCrossExamination(d: Director): Promise<CourtResult | null> {
  profile().startCase(CASE_ID);
  useHub.getState().set({ active: false, view: null, selectedCase: null });

  // 1. Préparation au tableau d'enquête (au moins deux contradictions).
  let board = runBoard(d, MERIDIAN_BOARD, { intro: () => d.line(COURT.boardIntro) });
  let result = await board;
  while (result.found.length < MERIDIAN_BOARD.required) {
    await d.line(COURT.boardShort);
    board = runBoard(d, MERIDIAN_BOARD);
    result = await board;
  }
  await d.line(COURT.boardReady);

  // Pièces présentables : contradictions établies + pièces du dossier ; les manquées apparaissent grisées.
  const established = courtEvidenceFrom(MERIDIAN_BOARD, result.found);
  const allContradictions = MERIDIAN_BOARD.links.map((l) => l.courtEvidence).filter((x): x is string => !!x);
  court().set({ pieces: [...established, "p-bond", "p-auditor"], missing: allContradictions.filter((p) => !established.includes(p)), used: [], gauges: { ...START_GAUGES }, stamp: null });

  // 2. Le lendemain : les marches du tribunal.
  await d.fadeBlack(1, 1);
  propCamera.pitch = 0;
  void d.letterbox(true);
  d.music.cut();
  void audio.setPlace("street", ["amb-rain-taxi"], [], 1);
  await d.say(undefined, COURT.taxi.text, { hold: 3 });
  await d.show("10-courthouse-steps", { transition: "cut", soundFade: 1, camera: { exposure: 0, dolly: 0, panX: 0, panY: 0, focus: 0.3, aperture: 0.3, lookAmount: 1 } });
  d.sfx("sfx-shutter-burst", { volume: 0.7 });
  await d.fadeBlack(0, 1.6);
  await d.line(COURT.steps);
  void d.letterbox(false);
  await d.waitForHotspot("stairs", "Montez les marches");
  d.sfx("sfx-footsteps", { volume: 0.6 });
  await d.station("top", 3);
  await d.fadeBlack(1, 0.8);

  // 3. La salle d'audience.
  const h = new Hearing();
  court().set({ phase: "direct", hud: true, gauges: { ...START_GAUGES } });
  await d.show("11-courtroom", { transition: "cut", station: "entry", camera: { exposure: 0, dolly: 0, focus: 0.3, aperture: 0.3 } });
  d.mood("rourke", "idle");
  d.mood("brandt", "pleased");
  d.mood("whitford", "idle");
  d.music.start();
  d.music.resume(0.1);
  d.music.intensity(0.2, 2);
  await d.fadeBlack(0, 1.4);
  await d.station("counsel", 2.4);
  d.sfx("sfx-crowd-murmur", { volume: 0.3 });
  await d.line(COURT.allRise);
  await cut(d, "judge");
  d.sfx("sfx-gavel", { volume: 0.8 });
  await d.line(COURT.judgeOpen);
  if (!profile().flags.objectionTuto) {
    profile().setFlag("objectionTuto", "1");
    await d.line(COURT.objectionTutorial);
  }
  await directExamination(d, h);
  const broke = await crossExamination(d, h);
  if (broke) await breakdown(d, h);
  else {
    await cut(d, "judge");
    d.sfx("sfx-gavel", { volume: 0.8 });
    await d.line(COURT.judgeEndNoBreak);
  }
  audio.stopLoop("heart");
  const r = scoreCourt(DEF, h.events);
  profile().recordCase(CASE_ID, r.grade, r.score);
  profile().addCareer({ reputation: r.reputation, billed: r.fees });
  profile().adjustRelation("harlow", r.grade === "S" ? 10 : r.grade === "A" ? 6 : r.grade === "B" ? 2 : -3);
  await debrief(d, r, h);
  resetCourt();
  return r;
}

export function resetCourt(): void {
  court().set({ phase: "off", hud: false, objectionOpen: false, presenting: false, choosingGround: false, stamp: null });
  for (const id of ["rourke", "brandt", "whitford"] as const) {
    const t = tellsOf(id);
    Object.assign(t, { sweat: 0, gazeAway: 0, swallow: 0, loosenTie: 0, penTap: 0, armsCrossed: 0, headInHands: 0, surprise: 0 });
  }
  audio.stopLoop("heart");
  gsap.globalTimeline.timeScale(1);
}
