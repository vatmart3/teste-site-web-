// Exporte toutes les répliques doublées en CSV pour l'enregistrement des voix (annexe D).
// Usage : npm run voices:csv   →   content/voices.csv  (id, personnage, réplique, émotion, fichier)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ARRIVAL_LINES } from "../src/content/dialogue/arrival.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const all = [...ARRIVAL_LINES].filter((l) => l.voiced);
const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
const rows = ["id,personnage,réplique,émotion,fichier", ...all.map((l) => [l.id, l.speaker, esc(l.text), l.emotion, `public/audio/vo-${l.id}.mp3`].join(","))];
mkdirSync(join(root, "content"), { recursive: true });
writeFileSync(join(root, "content", "voices.csv"), "﻿" + rows.join("\n") + "\n");
console.log(`content/voices.csv : ${all.length} réplique(s)`);
