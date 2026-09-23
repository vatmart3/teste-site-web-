// Exporte toutes les répliques doublées en CSV pour l'enregistrement des voix (annexe D).
// Usage : npm run voices:csv   →   content/voices.csv  (id, personnage, réplique, émotion, fichier)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ARRIVAL_LINES } from "../src/content/dialogue/arrival.ts";
import { HUB_LINES } from "../src/content/dialogue/hub.ts";
import { AUDIT_LINES, harlowOnAnomaly } from "../src/content/dialogue/audit.ts";
import { COURT_LINES } from "../src/content/dialogue/court.ts";

// Explications de Harlow au débrief de l'affaire 1 (texte identique à src/content/cases/midnightAudit.ts).
const EXPLANATIONS: Record<string, string> = {
  cutoff: "Halvorsen : tout le contrat passé en chiffre d'affaires le jour de la signature, alors que le premier camion ne roule qu'en janvier. IFRS 15 : on reconnaît le revenu quand le service est rendu.",
  related: "Orca facture des millions de « conseil » à Meridian et lui doit une avance sans garantie. Un administrateur des deux côtés : l'argent tourne en rond.",
  depreciation: "Allonger la durée d'amortissement de 5 à 9 ans sans étude technique, c'est fabriquer 71 millions de bénéfice d'un trait de plume. La flotte grossit, la dotation baisse : ça ne tient pas.",
  inventory: "Des pièces pour des camions retirés du service, gardées au prix d'achat. Les stocks gonflent trois fois plus vite que l'activité.",
};
const DEBRIEF_LINES = Object.entries(EXPLANATIONS).flatMap(([id, text]) => [harlowOnAnomaly(id, text, true), harlowOnAnomaly(id, text, false)]);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const all = [...ARRIVAL_LINES, ...HUB_LINES, ...AUDIT_LINES, ...DEBRIEF_LINES, ...COURT_LINES].filter((l) => l.voiced);
const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
const rows = ["id,personnage,réplique,émotion,fichier", ...all.map((l) => [l.id, l.speaker, esc(l.text), l.emotion, `public/audio/vo-${l.id}.mp3`].join(","))];
mkdirSync(join(root, "content"), { recursive: true });
writeFileSync(join(root, "content", "voices.csv"), "﻿" + rows.join("\n") + "\n");
console.log(`content/voices.csv : ${all.length} réplique(s)`);
