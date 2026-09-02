"use client";

import { useState } from "react";
import { downloadBlob, slugify } from "@/lib/export/download";

// pdf-lib et les modules d'export pèsent lourd : ils ne sont chargés qu'au clic,
// pour ne pas retarder le premier écran.
const load = {
  summaryPdf: () => import("@/lib/export/summary-pdf").then((m) => m.summaryPdf),
  mindmapPdf: () => import("@/lib/export/mindmap-pdf").then((m) => m.mindmapPdf),
  mindmapPng: () => import("@/lib/export/mindmap-png").then((m) => m.mindmapPng),
  flashcardsPdf: () => import("@/lib/export/flashcards-pdf").then((m) => m.flashcardsPdf),
  ankiCsv: () => import("@/lib/export/anki-csv").then((m) => m.ankiCsv),
  markdown: () => import("@/lib/export/markdown").then((m) => m.summaryMarkdown),
};
import type { Conversion } from "@/lib/schemas";
import type { TabKey } from "./ResultTabs";

type Props = { conversion: Conversion; tab: TabKey };

export function ExportBar({ conversion, tab }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const base = slugify(conversion.summary.title);

  const run = async (id: string, task: () => Promise<void>) => {
    setBusy(id);
    setNote(null);
    try {
      await task();
    } catch {
      setNote("L'export a échoué. Réessaie, et si ça recommence recharge la page.");
    } finally {
      setBusy(null);
    }
  };

  const actions: { id: string; label: string; run: () => Promise<void> }[] =
    tab === "resume"
      ? [
          {
            id: "resume-pdf",
            label: "PDF",
            run: async () => {
              const build = await load.summaryPdf();
              downloadBlob(await build(conversion.summary), `${base}-resume.pdf`);
            },
          },
          {
            id: "resume-md",
            label: "Copier en Markdown",
            run: async () => {
              const build = await load.markdown();
              await navigator.clipboard.writeText(build(conversion));
              setNote("Markdown copié.");
            },
          },
          {
            id: "notion",
            label: "Envoyer vers Notion",
            run: async () => {
              setNote("Notion arrive en phase 2. En attendant, colle le Markdown : Notion le lit tel quel.");
            },
          },
        ]
      : tab === "carte"
        ? [
            {
              id: "carte-png",
              label: "PNG haute résolution",
              run: async () => {
                const build = await load.mindmapPng();
                downloadBlob(
                  await build(conversion.mindmap, conversion.summary.title),
                  `${base}-carte.png`,
                );
              },
            },
            {
              id: "carte-pdf",
              label: "PDF paysage",
              run: async () => {
                const build = await load.mindmapPdf();
                downloadBlob(
                  await build(conversion.mindmap, conversion.summary.title),
                  `${base}-carte.pdf`,
                );
              },
            },
          ]
        : [
            {
              id: "fiches-pdf",
              label: "Planche A4 à imprimer",
              run: async () => {
                const build = await load.flashcardsPdf();
                downloadBlob(
                  await build(
                    conversion.flashcards.cards,
                    conversion.summary.title,
                    conversion.summary.subject,
                  ),
                  `${base}-fiches.pdf`,
                );
              },
            },
            {
              id: "fiches-csv",
              label: "CSV pour Anki",
              run: async () => {
                const build = await load.ankiCsv();
                downloadBlob(
                  build(conversion.flashcards.cards, conversion.summary.subject),
                  `${base}-anki.csv`,
                );
              },
            },
          ];

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="bouton bouton-blanc text-sm"
            disabled={busy !== null}
            onClick={() => void run(action.id, action.run)}
          >
            {busy === action.id ? "Un instant…" : action.label}
          </button>
        ))}
      </div>
      {tab === "fiches" ? (
        <p className="mt-2 text-xs text-encre-clair">
          La planche s&apos;imprime en recto-verso, reliure bord long : les versos tombent
          exactement derrière leur recto.
        </p>
      ) : null}
      {note ? (
        <p role="status" className="mt-2 text-sm text-bic-bleu">
          {note}
        </p>
      ) : null}
    </div>
  );
}
