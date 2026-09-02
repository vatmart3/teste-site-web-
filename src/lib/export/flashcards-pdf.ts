import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Flashcard } from "@/lib/schemas";
import { prettyMath } from "@/lib/latex";
import { fitText, sanitize, wrapText } from "./pdf-text";

/**
 * Planche A4, 8 fiches par page, 2 colonnes × 4 rangées.
 *
 * Le point à ne pas rater : en recto-verso reliure bord long, la feuille est
 * retournée autour de son axe vertical. Le dos d'une fiche imprimée en colonne 0
 * se retrouve donc physiquement derrière la colonne 1. Les versos sont donc
 * disposés en colonnes inversées — c'est tout le secret, et c'est vérifiable :
 * plie une page en deux dans le sens de la hauteur, les deux faces coïncident.
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = { x: 28, top: 46, bottom: 28 };
const COLS = 2;
const ROWS = 4;
const PER_PAGE = COLS * ROWS;

const INK = rgb(0.04, 0.04, 0.05);
const GREY = rgb(0.62, 0.62, 0.6);
const YELLOW = rgb(1, 0.914, 0.29);

type Cell = { x: number; y: number; width: number; height: number };

function grid(): Cell[] {
  const usableWidth = A4.width - MARGIN.x * 2;
  const usableHeight = A4.height - MARGIN.top - MARGIN.bottom;
  const cellWidth = usableWidth / COLS;
  const cellHeight = usableHeight / ROWS;
  const cells: Cell[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      cells.push({
        x: MARGIN.x + col * cellWidth,
        y: A4.height - MARGIN.top - (row + 1) * cellHeight,
        width: cellWidth,
        height: cellHeight,
      });
    }
  }
  return cells;
}

/** Index de la cellule du verso pour la fiche `slot`, feuille retournée bord long. */
function backSlot(slot: number): number {
  const row = Math.floor(slot / COLS);
  const col = slot % COLS;
  return row * COLS + (COLS - 1 - col);
}

export async function flashcardsPdf(
  cards: Flashcard[],
  title: string,
  subject: string,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${title} — fiches`);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const cells = grid();

  for (let start = 0; start < cards.length; start += PER_PAGE) {
    const batch = cards.slice(start, start + PER_PAGE);

    const front = doc.addPage([A4.width, A4.height]);
    header(
      front,
      regular,
      bold,
      `${sanitize(title)} — recto`,
      `${sanitize(subject)} · fiches ${start + 1} à ${start + batch.length}`,
      start === 0,
    );
    marks(front, cells);
    batch.forEach((card, slot) => {
      const cell = cells[slot];
      if (cell) drawFront(front, cell, card, bold, regular, start + slot + 1);
    });

    const back = doc.addPage([A4.width, A4.height]);
    header(back, regular, bold, `${sanitize(title)} — verso`, "", false);
    marks(back, cells);
    batch.forEach((card, slot) => {
      const cell = cells[backSlot(slot)];
      if (cell) drawBack(back, cell, card, regular, italic, start + slot + 1);
    });
  }

  const bytes = await doc.save();
  return new Blob([bytes as BufferSource], { type: "application/pdf" });
}

function header(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  left: string,
  right: string,
  withInstructions: boolean,
): void {
  page.drawText(left, {
    x: MARGIN.x,
    y: A4.height - 30,
    size: 9,
    font: bold,
    color: INK,
  });
  if (right) {
    const width = regular.widthOfTextAtSize(right, 9);
    page.drawText(right, {
      x: A4.width - MARGIN.x - width,
      y: A4.height - 30,
      size: 9,
      font: regular,
      color: GREY,
    });
  }
  if (withInstructions) {
    const note = "Impression recto-verso, reliure bord long. Coupe sur les reperes.";
    page.drawText(note, {
      x: MARGIN.x,
      y: A4.height - 41,
      size: 7.5,
      font: regular,
      color: GREY,
    });
  }
}

function marks(page: PDFPage, cells: Cell[]): void {
  const seen = new Set<string>();
  for (const cell of cells) {
    for (const x of [cell.x, cell.x + cell.width]) {
      for (const y of [cell.y, cell.y + cell.height]) {
        const key = `${Math.round(x)}:${Math.round(y)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        page.drawLine({
          start: { x: x - 6, y },
          end: { x: x + 6, y },
          thickness: 0.4,
          color: GREY,
        });
        page.drawLine({
          start: { x, y: y - 6 },
          end: { x, y: y + 6 },
          thickness: 0.4,
          color: GREY,
        });
      }
    }
  }
}

function drawFront(
  page: PDFPage,
  cell: Cell,
  card: Flashcard,
  bold: PDFFont,
  regular: PDFFont,
  number: number,
): void {
  const pad = 20;
  const inner = cell.width - pad * 2;

  page.drawText(String(number), {
    x: cell.x + pad,
    y: cell.y + cell.height - pad - 7,
    size: 8,
    font: regular,
    color: GREY,
  });

  const tag = sanitize(card.tag).slice(0, 34);
  if (tag) {
    const width = regular.widthOfTextAtSize(tag, 8);
    page.drawRectangle({
      x: cell.x + cell.width - pad - width - 3,
      y: cell.y + cell.height - pad - 9,
      width: width + 6,
      height: 11,
      color: YELLOW,
    });
    page.drawText(tag, {
      x: cell.x + cell.width - pad - width,
      y: cell.y + cell.height - pad - 7,
      size: 8,
      font: regular,
      color: INK,
    });
  }

  const boxTop = cell.y + cell.height - pad - 26;
  const boxHeight = cell.height - pad * 2 - 34;
  const { size, lines } = fitText(prettyMath(card.front), bold, inner, boxHeight, 15, 8);
  const blockHeight = lines.length * size * 1.32;
  let y = cell.y + cell.height / 2 + blockHeight / 2 - size;
  if (y > boxTop) y = boxTop;

  for (const line of lines) {
    page.drawText(line, { x: cell.x + pad, y, size, font: bold, color: INK });
    y -= size * 1.32;
  }

  const dots = "·".repeat(card.difficulty);
  page.drawText(dots, {
    x: cell.x + pad,
    y: cell.y + pad,
    size: 12,
    font: bold,
    color: INK,
  });
}

function drawBack(
  page: PDFPage,
  cell: Cell,
  card: Flashcard,
  regular: PDFFont,
  italic: PDFFont,
  number: number,
): void {
  const pad = 20;
  const inner = cell.width - pad * 2;

  page.drawText(String(number), {
    x: cell.x + cell.width - pad - regular.widthOfTextAtSize(String(number), 8),
    y: cell.y + cell.height - pad - 7,
    size: 8,
    font: regular,
    color: GREY,
  });

  const hint = card.hint ? wrapText(prettyMath(card.hint), italic, 9, inner) : [];
  const hintHeight = hint.length * 9 * 1.3;
  const boxHeight = cell.height - pad * 2 - 26 - hintHeight;
  const { size, lines } = fitText(prettyMath(card.back), regular, inner, boxHeight, 13, 7.5);

  let y = cell.y + cell.height - pad - 26;
  for (const line of lines) {
    page.drawText(line, { x: cell.x + pad, y, size, font: regular, color: INK });
    y -= size * 1.32;
  }

  if (hint.length > 0) {
    let hy = cell.y + pad + hintHeight - 9;
    page.drawLine({
      start: { x: cell.x + pad, y: hy + 12 },
      end: { x: cell.x + pad + 26, y: hy + 12 },
      thickness: 0.6,
      color: GREY,
    });
    for (const line of hint) {
      page.drawText(line, { x: cell.x + pad, y: hy, size: 9, font: italic, color: GREY });
      hy -= 9 * 1.3;
    }
  }
}
