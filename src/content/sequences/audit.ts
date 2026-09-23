/**
 * Affaire 1 — la nuit d'audit puis le débrief chez Harlow.
 * Boucle d'événements : surlignage → post-it (qualification), atouts, repères horaires, rendu du mémo.
 */
import { AUDIT, harlowOnAnomaly } from "@/content/dialogue/audit";
import { buildMidnightAudit } from "@/content/cases/midnightAudit";
import { audio } from "@/engine/audio/AudioEngine";
import { officeFor } from "@/engine/career/office";
import type { Director } from "@/engine/director/director";
import { useDebrief } from "@/engine/audit/DebriefOverlay";
import { docLines, pageCache } from "@/engine/audit/docRenderer";
import { circleBox, marksFor, resetMarks } from "@/engine/audit/marks";
import { latestMarks, scoreAudit } from "@/engine/audit/scoring";
import { auditBus, useAudit, type AuditEvent } from "@/engine/audit/state";
import type { AuditCaseDef, AuditResult } from "@/engine/audit/types";
import { DESK_PITCH } from "@/engine/hub/space";
import { useHub } from "@/engine/hub/state";
import { onFrame } from "@/engine/loop";
import { folder, propCamera, resetTransform, useProps } from "@/engine/props/model";
import { roomClock, roomState } from "@/engine/room/roomState";
import { useProfile } from "@/engine/state/profile";
import { useSettings } from "@/engine/state/settings";

const CASE_ID = "midnight-audit";
const audit = () => useAudit.getState();

/** File d'événements : rien n'est perdu pendant qu'une réplique ou un panneau est affiché. */
function eventQueue() {
  const q: AuditEvent[] = [];
  let wake: (() => void) | null = null;
  const off = auditBus.on((e) => {
    q.push(e);
    wake?.();
  });
  return {
    off,
    next: async (d: Director): Promise<AuditEvent> => {
      while (!q.length) {
        await d.waitBus<void>((h) => {
          wake = () => h();
          return () => {
            wake = null;
          };
        });
      }
      return q.shift()!;
    },
  };
}

function locate(def: AuditCaseDef, lineId: string) {
  for (const doc of def.docs) {
    const l = docLines(doc).find((x) => x.id === lineId);
    if (l) return { doc, page: l.page };
  }
  return null;
}

async function onHighlight(d: Director, def: AuditCaseDef, lineId: string) {
  const st = audit();
  const prev = latestMarks(st.marks).find((m) => m.lineId === lineId);
  st.set({ pending: { docId: st.reading ?? "", lineId } });
  const choice = await d.panel<string>({
    kind: "choice",
    prompt: prev ? "Requalifier ce constat ?" : "Qu'est-ce qui cloche ?",
    options: [
      ...def.anomalies.map((a) => ({ id: a.id, label: a.label })),
      { id: "none", label: "Fausse alerte", hint: "Retirer ce constat du mémo" },
    ],
  });
  const minutes = audit().minutes;
  audit().set({ pending: null, marks: [...audit().marks, { lineId, category: choice, at: minutes }] });
  if (choice !== "none") d.sfx("sfx-paper-flip", { volume: 0.5, rate: 1.6 });
  // Sans chrono, la nuit avance quand même au fil des constats.
  if (useSettings.getState().noTimer) audit().set({ minutes: Math.min(audit().deadline - 30, minutes + 25) });
}

async function onPerk(d: Director, def: AuditCaseDef, id: "all-nighter" | "expert") {
  if (!useProfile.getState().spendPerk(id)) return;
  if (id === "all-nighter") {
    const rate = (def.deadlineMinutes - def.startMinutes) / def.realSeconds;
    audit().set({ deadline: audit().deadline + Math.round(30 * rate) });
    roomState.coffeeHeat = 1;
    d.sfx("sfx-paper-slide", { volume: 0.4 });
    await d.line(AUDIT.allNighter);
    return;
  }
  // Expert : entoure au crayon rouge la preuve principale d'une anomalie pas encore trouvée.
  const found = new Set(scoreAudit(def, audit().marks, audit().minutes).found);
  const target = def.anomalies.find((a) => !found.has(a.id) && !audit().assisted.includes(a.id));
  if (!target) return;
  const primary = Object.entries(def.clues).find(([, c]) => c.anomaly === target.id && c.strength === "primary")?.[0];
  if (!primary) return;
  const where = locate(def, primary);
  if (!where) return;
  const r = pageCache(where.doc, where.page, audit().variantKey);
  const box = r.boxes[primary];
  if (box) circleBox(marksFor(where.doc.id, where.page, r.canvas.height / r.canvas.width), box);
  audit().set({
    assisted: [...audit().assisted, target.id],
    hints: [...audit().hints, primary],
    reading: where.doc.id,
    pages: { ...audit().pages, [where.doc.id]: where.page },
  });
  d.sfx("sfx-pin", { volume: 0.6 });
  await d.line(AUDIT.expert);
}

/** Joue la nuit d'audit ; renvoie le résultat. */
async function night(d: Director, def: AuditCaseDef, attempt: number): Promise<AuditResult> {
  const q = eventQueue();
  const cues = { coffee: false, hour: false };
  const offTick = onFrame(() => {
    const st = audit();
    if (!st.active) return;
    roomClock.minutes = st.minutes;
    const k = (st.minutes - def.startMinutes) / (def.deadlineMinutes - def.startMinutes);
    // Le café refroidit en quatre heures environ (sauf s'il est resservi : atout « Nuit blanche »).
    roomState.coffeeHeat = Math.min(roomState.coffeeHeat, Math.max(0, 1 - k * 1.6));
    if (!cues.coffee && st.minutes >= 27 * 60) {
      cues.coffee = true;
      auditBus.emit({ type: "cue", id: "coffee" });
    }
    if (!cues.hour && st.minutes >= 31 * 60) {
      cues.hour = true;
      auditBus.emit({ type: "cue", id: "hour" });
    }
  });
  try {
    audit().set({ running: true });
    for (;;) {
      const e = await q.next(d);
      if (e.type === "highlight") await onHighlight(d, def, e.lineId);
      else if (e.type === "perk") await onPerk(d, def, e.id);
      else if (e.type === "cue") {
        if (e.id === "coffee") void d.line(AUDIT.coffeeCold).catch(() => undefined);
        else {
          d.music.intensity(0.8, 4);
          void d.line(AUDIT.oneHour).catch(() => undefined);
        }
      } else if (e.type === "submit") {
        const ok = await d.panel<string>({
          kind: "choice",
          prompt: AUDIT.submitAsk.text,
          options: [
            { id: "yes", label: "Rendre le mémo", hint: `${latestMarks(audit().marks).length} constat(s)` },
            { id: "no", label: "Continuer à chercher" },
          ],
        });
        if (ok === "yes") break;
      } else if (e.type === "timeup") {
        await d.line(AUDIT.dawn);
        break;
      }
    }
  } finally {
    q.off();
    offTick();
    audit().set({ running: false, reading: null });
  }
  void attempt;
  return scoreAudit(def, audit().marks, audit().minutes, audit().assisted);
}

async function debrief(d: Director, def: AuditCaseDef, r: AuditResult) {
  await d.fadeBlack(1, 1.2);
  audit().set({ active: false });
  propCamera.pitch = 0;
  roomClock.mode = "ny";
  d.music.intensity(0.15, 2);
  await d.show("07-corner-office", { transition: "cut", camera: { exposure: 0, focus: 0.45, aperture: 0.35, dolly: 0.1, dollyX: 0.5, dollyY: 0.45, panX: 0, panY: 0 } });
  void d.letterbox(true);
  await d.fadeBlack(0, 1.2);
  await d.line(AUDIT.harlowAsk);

  // Le mémo (la chemise MERIDIAN) posé sur le bureau en verre.
  resetTransform(folder, 0, -0.26, -0.9);
  folder.rx = -Math.PI / 2 + 0.35;
  folder.stamp = 0;
  folder.grade = "";
  folder.cover = 0;
  folder.fan = 0;
  useProps.getState().set({ folder: true });
  d.sfx("sfx-paper-slide", { volume: 0.7 });
  await d.tween(folder, { y: -0.2, z: -0.72 }, 0.9, "power3.out");
  await d.focus(0.7, 0.8);

  for (const a of def.anomalies) {
    await d.line(harlowOnAnomaly(a.id, a.explanation, r.found.includes(a.id)));
  }
  if (r.falsePositives > 0) await d.line(AUDIT.harlowFalse);
  await d.line({ S: AUDIT.harlowS, A: AUDIT.harlowA, B: AUDIT.harlowB, C: AUDIT.harlowC }[r.grade]);

  // Le tampon de note s'écrase sur la couverture.
  folder.grade = r.grade;
  await d.tween(folder, { stamp: 0.5 }, 0.45, "power3.in");
  d.shake(0.35);
  await d.wait(0.25);
  await d.tween(folder, { stamp: 1 }, 0.5, "power2.out");

  // Compteur d'honoraires.
  useDebrief.getState().set({ visible: true, grade: r.grade, score: r.score, fees: r.fees, hours: r.billedHours, reputation: r.reputation, found: r.found.length, total: def.anomalies.length });
  d.sfx("sfx-coins-counter", { volume: 0.8 });
  await d.wait(3.2);
  await d.line(AUDIT.harlowDismiss);
  useDebrief.getState().set({ visible: false });

  // Leçons débloquées (anomalies trouvées ; au moins une, sinon celle de la première manquée).
  const lessonIds = def.anomalies.filter((a) => r.found.includes(a.id)).map((a) => a.lesson);
  if (!lessonIds.length && def.anomalies[0]) lessonIds.push(def.anomalies[0].lesson);
  lessonIds.push("read-balance-sheet");
  const fresh = lessonIds.filter((id) => !useProfile.getState().lessons.includes(id));
  for (const id of lessonIds) useProfile.getState().unlockLesson(id);
  if (fresh.length) await d.panel<boolean>({ kind: "lesson", ids: fresh });

  await d.fadeBlack(1, 0.8);
  useProps.getState().set({ folder: false });
  void d.letterbox(false);
}

/** Point d'entrée depuis le bureau (pile de chemises → « Ouvrir le dossier »). */
export async function playMidnightAudit(d: Director): Promise<AuditResult> {
  const profile = useProfile.getState();
  const attempt = profile.startCase(CASE_ID);
  const def = buildMidnightAudit(attempt);

  useHub.getState().set({ active: false, view: null, selectedCase: null });
  await d.fadeBlack(1, 0.8);
  resetMarks();
  const { scene } = officeFor(profile.officeRank, "night");
  await d.show(scene, { variant: "night", transition: "cut", camera: { exposure: 0, focus: 0.62, aperture: 0.3, dolly: 0, panX: 0, panY: 0, lookAmount: 1 } });
  propCamera.pitch = DESK_PITCH;
  roomClock.mode = "game";
  roomClock.minutes = def.startMinutes;
  roomState.lamp = 1;
  roomState.neon = 0.12;
  roomState.coffeeHeat = 1;
  useAudit.getState().set({
    active: true,
    def,
    variantKey: String(attempt),
    reading: null,
    pages: {},
    tool: "hand",
    zoom: 1,
    marks: [],
    minutes: def.startMinutes,
    deadline: def.deadlineMinutes,
    running: false,
    assisted: [],
    hints: [],
    pending: null,
  });
  d.music.start();
  d.music.intensity(0.1, 2);
  void audio.setPlace("office", ["amb-office-night"], [], 2);
  await d.fadeBlack(0, 1.6);
  await d.line(AUDIT.intro1);
  await d.line(AUDIT.intro2);
  await d.line(AUDIT.tutorial);

  let result: AuditResult;
  try {
    result = await night(d, def, attempt);
  } finally {
    roomState.neon = 1;
  }
  useProfile.getState().recordCase(CASE_ID, result.grade, result.score);
  useProfile.getState().addCareer({ reputation: result.reputation, billed: result.fees });
  await debrief(d, def, result);
  audit().set({ active: false, def: null });
  roomState.coffeeHeat = 1;
  return result;
}
