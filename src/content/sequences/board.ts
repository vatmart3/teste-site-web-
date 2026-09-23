/**
 * Séance au tableau d'enquête : la caméra se lève et s'approche du liège ; le joueur tire des fils.
 * Bonne connexion : le fil se tend, éclair, son de révélation, zoom ; fausse : le fil retombe.
 */
import { audio } from "@/engine/audio/AudioEngine";
import { linkBetween, scoreBoard } from "@/engine/board/logic";
import { boardBus, boardFx, useBoard, type BoardInput } from "@/engine/board/state";
import type { BoardDef, BoardResult } from "@/engine/board/types";
import type { Director } from "@/engine/director/director";
import { hubBus } from "@/engine/hub/state";
import { useProfile } from "@/engine/state/profile";

export async function runBoard(d: Director, def: BoardDef, opts: { intro?: () => Promise<void> } = {}): Promise<BoardResult> {
  const saved = useProfile.getState().boards[def.id];
  const board = useBoard.getState();
  board.set({ active: true, def, found: saved?.found ?? [], wrong: saved?.wrong ?? 0, selected: null, toast: null });
  const queue: BoardInput[] = [];
  let wake: (() => void) | null = null;
  const push = (e: BoardInput) => {
    queue.push(e);
    wake?.();
  };
  const off = boardBus.on(push);
  const offHub = hubBus.on((a) => a.type === "close" && push({ type: "done" }));
  try {
    await d.station("board", 1.3);
    d.focus(0.6, 0.5);
    await opts.intro?.();
    for (;;) {
      while (!queue.length) await d.waitBus<void>((h) => ((wake = h), () => (wake = null)));
      const e = queue.shift()!;
      if (e.type === "done") break;
      const s = useBoard.getState();
      const link = linkBetween(def, e.a, e.b);
      if (link && !s.found.includes(link.id)) {
        const found = [...s.found, link.id];
        s.set({ found, toast: { text: `${link.title} — ${link.insight}`, good: true, id: Date.now() } });
        useProfile.getState().setBoard(def.id, found, s.wrong);
        if (link.lesson) useProfile.getState().unlockLesson(link.lesson);
        boardFx.flash = 1;
        boardFx.lastLink = link.id;
        d.sfx("sfx-string-tense", { volume: 0.9 });
        window.setTimeout(() => void audio.sfx("sfx-reveal", { volume: 0.8 }), 350);
        await d.cam({ exposure: 1.35, dolly: 0.35 }, 0.25, "power2.out");
        await d.cam({ exposure: 1, dolly: 0 }, 1.1, "power2.inOut");
        if (found.length === def.links.length) {
          s.set({ toast: { text: "Tout est relié. Le dossier est prêt pour l'audience.", good: true, id: Date.now() } });
          await d.wait(1.2);
        }
      } else if (link) {
        s.set({ toast: { text: "Ce fil est déjà tendu.", good: false, id: Date.now() } });
      } else {
        const wrong = s.wrong + 1;
        s.set({ wrong, toast: { text: "Ça ne tient pas : ces deux pièces ne se contredisent pas.", good: false, id: Date.now() } });
        useProfile.getState().setBoard(def.id, s.found, wrong);
        boardFx.lastWrong = { a: e.a, b: e.b, t: Date.now() };
        d.sfx("sfx-paper-flip", { volume: 0.5, rate: 0.8 });
        d.shake(0.15);
      }
    }
  } finally {
    off();
    offHub();
    const s = useBoard.getState();
    s.set({ active: false, selected: null, toast: null });
  }
  await d.station("", 1.1);
  const s = useBoard.getState();
  return scoreBoard(def, s.found, s.wrong);
}
