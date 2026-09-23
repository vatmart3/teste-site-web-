#!/usr/bin/env node
// Liste les assets présents dans public/{scenes,characters,audio} → public/assets-manifest.json.
// Lancé par `npm run assets:manifest` (et automatiquement à la fin de tools/depth.py).
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..", "public");
const dirs = ["scenes", "characters", "audio", "models"];
const files = [];

function walk(dir) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.startsWith(".")) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(relative(root, p).split("\\").join("/"));
  }
}

for (const d of dirs) walk(join(root, d));
files.sort();
writeFileSync(join(root, "assets-manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2) + "\n");
console.log(`assets-manifest.json : ${files.length} fichier(s)`);
