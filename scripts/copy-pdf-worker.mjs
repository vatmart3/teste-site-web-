// Copie le worker pdf.js dans public/ : pdfjs-dist charge son worker par URL,
// et on veut une URL stable servie par Next plutôt qu'un bundle exotique.
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dest = join(root, "public", "pdf.worker.min.mjs");

if (!existsSync(src)) {
  console.warn("[fiche] worker pdf.js introuvable, étape ignorée :", src);
  process.exit(0);
}
await mkdir(dirname(dest), { recursive: true });
await copyFile(src, dest);
console.log("[fiche] worker pdf.js copié dans public/");
