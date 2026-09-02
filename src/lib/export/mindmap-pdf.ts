import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { MindMap } from "@/lib/schemas";
import { fontSizeFor, layoutMindMap, lineHeightFor } from "@/lib/mindmap/layout";
import { sanitize } from "./pdf-text";

const A4_LANDSCAPE = { width: 841.89, height: 595.28 };
const INK = rgb(0.04, 0.04, 0.05);
const GREY = rgb(0.6, 0.6, 0.58);
const YELLOW = rgb(1, 0.914, 0.29);

export async function mindmapPdf(map: MindMap, title: string): Promise<Blob> {
  const layout = layoutMindMap(map, new Set());
  const doc = await PDFDocument.create();
  doc.setTitle(`${title} — carte mentale`);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);

  const margin = 34;
  const top = 54;
  const scale = Math.min(
    (A4_LANDSCAPE.width - margin * 2) / layout.width,
    (A4_LANDSCAPE.height - top - margin) / layout.height,
  );
  const offsetX = margin + (A4_LANDSCAPE.width - margin * 2 - layout.width * scale) / 2;
  const offsetY = margin + (A4_LANDSCAPE.height - top - margin - layout.height * scale) / 2;

  // repère PDF : origine en bas à gauche, l'axe y de la disposition est inversé
  const px = (x: number) => offsetX + x * scale;
  const py = (y: number) => A4_LANDSCAPE.height - top - offsetY - y * scale;

  page.drawText(sanitize(title), { x: margin, y: A4_LANDSCAPE.height - 34, size: 13, font: bold, color: INK });

  for (const link of layout.links) {
    page.drawLine({
      start: { x: px(link.x1), y: py(link.y1) },
      end: { x: px(link.x2), y: py(link.y2) },
      thickness: Math.max(0.5, (2.4 - link.depth * 0.5) * scale),
      color: link.depth <= 1 ? INK : GREY,
    });
  }

  for (const node of layout.nodes) {
    const size = fontSizeFor(node.depth) * scale;
    const font: PDFFont = node.depth === 0 ? bold : node.depth === 1 ? bold : sans;
    const width = node.width * scale;
    const height = node.height * scale;
    const left = px(node.x) - width / 2;
    const bottom = py(node.y) - height / 2;

    page.drawRectangle({
      x: left,
      y: bottom,
      width,
      height,
      color: rgb(1, 1, 1),
      borderColor: node.depth === 0 ? INK : GREY,
      borderWidth: node.depth === 0 ? 1.4 : 0.6,
    });
    if (node.depth === 1) {
      page.drawRectangle({ x: left + 2, y: bottom + 1, width: width - 4, height: 5, color: YELLOW });
    }

    let ty = py(node.y) + height / 2 - size - (node.height * scale - node.lines.length * lineHeightFor(node.depth) * scale) / 2;
    for (const line of node.lines) {
      const text = sanitize(line);
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: px(node.x) - textWidth / 2,
        y: ty,
        size,
        font,
        color: INK,
      });
      ty -= lineHeightFor(node.depth) * scale;
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes as BufferSource], { type: "application/pdf" });
}
