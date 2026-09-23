"use client";
import { hubBus } from "../state";
import { Shell } from "./Shell";

const PLACES = [
  { id: "harlow", title: "Bureau de Robert Harlow", note: "Dernier bureau au fond du couloir.", open: true },
  { id: "conference", title: "Salle de conférence", note: "Négociations — affaire 3.", open: false },
  { id: "archives", title: "Salle des archives", note: "Sous-sol. Les dossiers que personne ne relit.", open: false },
  { id: "court", title: "Tribunal fédéral", note: "En taxi, Lower Manhattan — affaire 2.", open: false },
] as const;

/** Le couloir du 52e : où aller en sortant du bureau. */
export function DoorView() {
  return (
    <Shell kicker="Couloir du 52e" title="Où allez-vous ?" className="w-[min(40rem,95vw)]">
      <ul className="grid gap-2 sm:grid-cols-2">
        {PLACES.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={!p.open}
              onClick={() => p.open && hubBus.emit({ type: "visit", place: "harlow" })}
              className="hub-panel w-full rounded-md p-4 text-left transition enabled:hover:border-brass disabled:cursor-not-allowed disabled:text-ivory/45 focus-visible:border-brass focus-visible:outline-none"
            >
              <span className="block font-serif text-lg">{p.title}</span>
              <span className="mt-1 block text-xs text-ivory/60">{p.note}</span>
              {!p.open && <span className="mt-2 inline-block text-[0.6rem] uppercase tracking-[0.25em] text-brass/80">Fermé pour l&apos;instant</span>}
            </button>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
