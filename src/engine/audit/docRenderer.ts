/**
 * Imprime les documents d'audit sur des canvas haute résolution (textures des feuilles 3D) et relève
 * la boîte de chaque ligne identifiée (coordonnées de page : x → droite, y → bas, 0..1),
 * pour savoir quelle ligne un trait de surligneur recouvre.
 */
import type { AuditDoc, DocBlock } from "./types";

export const PAGE_PX = 1536;
export const LETTER_RATIO = 11 / 8.5;

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  boxes: Record<string, Box>;
  /** Texte de chaque ligne identifiée (accessibilité, mémo). */
  texts: Record<string, string>;
}

const SERIF = "'Times New Roman', Times, Georgia, serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export function pageSize(doc: AuditDoc): { w: number; h: number } {
  const w = PAGE_PX;
  return { w, h: Math.round(doc.format === "half" ? (w * LETTER_RATIO) / 2 : w * LETTER_RATIO) };
}

function wrap(x: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (x.measureText(t).width > width && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

/** Rendu d'une page (non mis en cache : voir pageCache). */
export function renderPage(doc: AuditDoc, pageIndex: number, pageLabel?: string): RenderedPage {
  const { w: W, h: H } = pageSize(doc);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  const boxes: Record<string, Box> = {};
  const texts: Record<string, string> = {};
  const M = doc.format === "half" ? 100 : 120;
  const inner = W - 2 * M;
  const box = (id: string | undefined, text: string, x0: number, y0: number, x1: number, y1: number) => {
    if (!id) return;
    boxes[id] = { x0: x0 / W, y0: y0 / H, x1: x1 / W, y1: y1 / H };
    texts[id] = text;
  };

  // Papier : blanc cassé, très léger voile de photocopie.
  x.fillStyle = "#fbf9f3";
  x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W * 0.5, H * 0.45, W * 0.2, W * 0.5, H * 0.5, W * 0.9);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(80,60,30,0.05)");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  let y = M * 0.9;
  const blocks: DocBlock[] = doc.pages[pageIndex] ?? [];
  for (const b of blocks) {
    switch (b.kind) {
      case "letterhead": {
        x.fillStyle = "#1a2744";
        x.font = `700 34px ${SANS}`;
        x.fillText(b.company, M, y + 30);
        x.fillStyle = "#555";
        x.font = `400 22px ${SANS}`;
        x.fillText(b.subtitle, M, y + 64);
        x.fillStyle = "#1a2744";
        x.fillRect(M, y + 84, inner, 3);
        y += 130;
        break;
      }
      case "title": {
        x.fillStyle = "#111";
        x.font = `700 44px ${SERIF}`;
        for (const l of wrap(x, b.text, inner)) {
          x.fillText(l, M, y + 40);
          y += 54;
        }
        y += 18;
        break;
      }
      case "subtitle": {
        x.fillStyle = "#1a2744";
        x.font = `700 24px ${SANS}`;
        x.fillText(b.text, M, y + 22);
        y += 44;
        break;
      }
      case "table": {
        const n = b.columns.length - 1;
        const colW = n >= 3 ? 190 : 230;
        const rights = Array.from({ length: n }, (_, i) => W - M - (n - 1 - i) * colW);
        x.font = `700 23px ${SANS}`;
        x.fillStyle = "#333";
        x.textAlign = "right";
        b.columns.slice(1).forEach((col, i) => x.fillText(col, rights[i]!, y + 24));
        x.textAlign = "left";
        y += 38;
        x.fillStyle = "#222";
        x.fillRect(M, y, inner, 2);
        y += 8;
        const rowH = 56;
        for (const r of b.rows) {
          if (r.bold) {
            x.fillStyle = "#222";
            x.fillRect(M, y + 2, inner, 1.5);
          }
          x.fillStyle = "#151515";
          x.font = `${r.bold ? 700 : 400} 30px ${SERIF}`;
          x.fillText(r.label, M + 6, y + 38);
          x.textAlign = "right";
          r.values.forEach((v, i) => x.fillText(v, rights[i]!, y + 38));
          x.textAlign = "left";
          box(r.id, `${r.label} : ${r.values.join(" / ")}`, M, y + 6, W - M, y + rowH - 6);
          y += rowH;
        }
        x.fillStyle = "#222";
        x.fillRect(M, y + 4, inner, 2);
        y += 26;
        break;
      }
      case "para": {
        const size = b.small ? 20 : 29;
        const lh = Math.round(size * 1.45);
        x.font = `400 ${size}px ${SERIF}`;
        x.fillStyle = b.small ? "#333" : "#1a1a1a";
        const lines = wrap(x, b.text, inner);
        const y0 = y;
        for (const l of lines) {
          x.fillText(l, M, y + size);
          y += lh;
        }
        box(b.id, b.text, M, y0, W - M, y + 4);
        y += b.small ? 18 : 26;
        break;
      }
      case "spacer":
        y += b.size;
        break;
      case "stamp": {
        x.save();
        x.translate(W - M - 170, y + 60);
        x.rotate(-0.12);
        x.strokeStyle = b.color;
        x.fillStyle = b.color;
        x.globalAlpha = 0.75;
        x.lineWidth = 6;
        x.strokeRect(-160, -44, 320, 88);
        x.font = `800 44px ${SANS}`;
        x.textAlign = "center";
        x.fillText(b.text, 0, 16);
        x.restore();
        y += 130;
        break;
      }
      case "signature": {
        x.strokeStyle = "#1c2f6a";
        x.lineWidth = 3;
        x.beginPath();
        x.moveTo(M + 10, y + 50);
        x.bezierCurveTo(M + 60, y - 10, M + 90, y + 90, M + 150, y + 30);
        x.bezierCurveTo(M + 190, y - 5, M + 230, y + 70, M + 300, y + 35);
        x.stroke();
        x.fillStyle = "#222";
        x.font = `700 26px ${SANS}`;
        x.fillText(b.name, M, y + 100);
        x.font = `400 22px ${SANS}`;
        x.fillText(b.role, M, y + 130);
        y += 150;
        break;
      }
    }
  }
  // Pied de page.
  x.fillStyle = "#777";
  x.font = `400 20px ${SANS}`;
  x.textAlign = "right";
  x.fillText(pageLabel ?? `${doc.title}${doc.pages.length > 1 ? ` — page ${pageIndex + 1}/${doc.pages.length}` : ""}`, W - M, H - 50);
  x.textAlign = "left";
  // Grain de photocopie.
  const img = x.getImageData(0, 0, W, H);
  let seed = 1234 + pageIndex * 77;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const n = ((seed >> 16) % 9) - 4;
    img.data[i] = img.data[i]! + n;
    img.data[i + 1] = img.data[i + 1]! + n;
    img.data[i + 2] = img.data[i + 2]! + n;
  }
  x.putImageData(img, 0, 0);
  return { canvas: c, boxes, texts };
}

const cache = new Map<string, RenderedPage>();

export function pageCache(doc: AuditDoc, page: number, variantKey: string): RenderedPage {
  const key = `${variantKey}|${doc.id}|${page}`;
  let p = cache.get(key);
  if (!p) {
    p = renderPage(doc, page);
    cache.set(key, p);
  }
  return p;
}

/** Tous les textes identifiés d'un document (toutes pages), sans rendu (pour l'accessibilité). */
export function docLines(doc: AuditDoc): { id: string; page: number; text: string }[] {
  const out: { id: string; page: number; text: string }[] = [];
  doc.pages.forEach((blocks, page) => {
    for (const b of blocks) {
      if (b.kind === "para" && b.id) out.push({ id: b.id, page, text: b.text });
      if (b.kind === "table") for (const r of b.rows) if (r.id) out.push({ id: r.id, page, text: `${r.label} : ${r.values.join(" / ")}` });
    }
  });
  return out;
}
