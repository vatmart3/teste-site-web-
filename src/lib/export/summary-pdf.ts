import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Summary } from "@/lib/schemas";
import { prettyMath } from "@/lib/latex";
import { sanitize, wrapText } from "./pdf-text";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = { left: 64, right: 150, top: 64, bottom: 60 };
const INK = rgb(0.04, 0.04, 0.05);
const GREY = rgb(0.55, 0.55, 0.53);
const YELLOW = rgb(1, 0.914, 0.29);
const PINK = rgb(1, 0.49, 0.68);
const BLUE = rgb(0.106, 0.224, 1);

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  serif: PDFFont;
  serifItalic: PDFFont;
  sans: PDFFont;
  sansBold: PDFFont;
  pageNumber: number;
};

const COLUMN = A4.width - MARGIN.left - MARGIN.right;

export async function summaryPdf(summary: Summary): Promise<Blob> {
  const doc = await PDFDocument.create();
  doc.setTitle(summary.title);
  doc.setSubject(summary.subject);

  const ctx: Ctx = {
    doc,
    page: doc.addPage([A4.width, A4.height]),
    y: A4.height - MARGIN.top,
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    sans: await doc.embedFont(StandardFonts.Helvetica),
    sansBold: await doc.embedFont(StandardFonts.HelveticaBold),
    pageNumber: 1,
  };

  const meta = [summary.subject, summary.level].filter(Boolean).join(" · ");
  if (meta) {
    ctx.page.drawText(sanitize(meta), {
      x: MARGIN.left,
      y: ctx.y,
      size: 9,
      font: ctx.sans,
      color: GREY,
    });
    ctx.y -= 26;
  }

  drawBlock(ctx, summary.title, ctx.sansBold, 26, 1.16, INK);
  ctx.y -= 10;
  rule(ctx);
  ctx.y -= 24;

  for (const section of summary.sections) {
    ensure(ctx, 90);
    drawBlock(ctx, section.heading, ctx.sansBold, 14, 1.25, INK);
    ctx.y -= 8;

    for (const paragraph of section.paragraphs) {
      drawBlock(ctx, paragraph, ctx.serif, 11.5, 1.52, INK);
      ctx.y -= 9;
    }

    for (const term of section.keyTerms) {
      ensure(ctx, 46);
      // terme dans la marge, définition dans la colonne : mise en page de document
      const label = wrapText(term.term, ctx.sansBold, 8.5, MARGIN.right - 34);
      const definition = wrapText(term.definition, ctx.serif, 10.5, COLUMN - 16);
      const startY = ctx.y;
      let ly = startY;
      for (const line of label) {
        ctx.page.drawText(line, {
          x: A4.width - MARGIN.right + 22,
          y: ly,
          size: 8.5,
          font: ctx.sansBold,
          color: INK,
        });
        ly -= 11;
      }
      ctx.page.drawLine({
        start: { x: MARGIN.left, y: startY + 9 },
        end: { x: MARGIN.left, y: startY + 9 - definition.length * 10.5 * 1.45 },
        thickness: 2,
        color: YELLOW,
      });
      for (const line of definition) {
        ctx.page.drawText(line, {
          x: MARGIN.left + 12,
          y: ctx.y,
          size: 10.5,
          font: ctx.serif,
          color: INK,
        });
        ctx.y -= 10.5 * 1.45;
      }
      ctx.y -= 8;
    }

    for (const formula of section.formulas) {
      ensure(ctx, 54);
      const text = sanitize(prettyMath(formula.latex));
      const width = ctx.sansBold.widthOfTextAtSize(text, 13);
      ctx.page.drawRectangle({
        x: MARGIN.left - 6,
        y: ctx.y - 5,
        width: Math.min(width + 14, COLUMN + 12),
        height: 20,
        color: YELLOW,
      });
      ctx.page.drawText(text, {
        x: MARGIN.left,
        y: ctx.y,
        size: 13,
        font: ctx.sansBold,
        color: INK,
      });
      ctx.y -= 22;
      if (formula.meaning) {
        drawBlock(ctx, formula.meaning, ctx.serifItalic, 10, 1.4, GREY);
      }
      ctx.y -= 10;
    }

    ctx.y -= 12;
  }

  if (summary.keyPoints.length > 0) {
    list(ctx, "A retenir", summary.keyPoints, BLUE);
  }
  if (summary.commonMistakes.length > 0) {
    list(ctx, "Pieges classiques", summary.commonMistakes, PINK);
  }

  stampFooters(ctx);
  const bytes = await ctx.doc.save();
  return new Blob([bytes as BufferSource], { type: "application/pdf" });
}

function list(ctx: Ctx, heading: string, items: string[], color: ReturnType<typeof rgb>): void {
  ensure(ctx, 80);
  ctx.y -= 6;
  const width = ctx.sansBold.widthOfTextAtSize(heading, 12);
  ctx.page.drawRectangle({
    x: MARGIN.left - 5,
    y: ctx.y - 4,
    width: width + 10,
    height: 18,
    color,
  });
  ctx.page.drawText(heading, {
    x: MARGIN.left,
    y: ctx.y,
    size: 12,
    font: ctx.sansBold,
    color: INK,
  });
  ctx.y -= 24;
  for (const item of items) {
    ensure(ctx, 30);
    const lines = wrapText(item, ctx.serif, 11, COLUMN - 16);
    ctx.page.drawText("—", {
      x: MARGIN.left,
      y: ctx.y,
      size: 11,
      font: ctx.serif,
      color: GREY,
    });
    for (const line of lines) {
      ctx.page.drawText(line, {
        x: MARGIN.left + 16,
        y: ctx.y,
        size: 11,
        font: ctx.serif,
        color: INK,
      });
      ctx.y -= 11 * 1.45;
    }
    ctx.y -= 5;
  }
  ctx.y -= 10;
}

function drawBlock(
  ctx: Ctx,
  text: string,
  font: PDFFont,
  size: number,
  lineHeight: number,
  color: ReturnType<typeof rgb>,
): void {
  const lines = wrapText(text, font, size, COLUMN);
  for (const line of lines) {
    ensure(ctx, size * lineHeight + 8);
    ctx.page.drawText(line, { x: MARGIN.left, y: ctx.y, size, font, color });
    ctx.y -= size * lineHeight;
  }
}

function rule(ctx: Ctx): void {
  ctx.page.drawLine({
    start: { x: MARGIN.left, y: ctx.y },
    end: { x: A4.width - MARGIN.right + 60, y: ctx.y },
    thickness: 1,
    color: INK,
  });
}

function ensure(ctx: Ctx, needed: number): void {
  if (ctx.y - needed >= MARGIN.bottom) return;
  ctx.page = ctx.doc.addPage([A4.width, A4.height]);
  ctx.pageNumber += 1;
  ctx.y = A4.height - MARGIN.top;
}

function stampFooters(ctx: Ctx): void {
  const pages = ctx.doc.getPages();
  pages.forEach((page, index) => {
    page.drawText(`${index + 1} / ${pages.length}`, {
      x: MARGIN.left,
      y: 32,
      size: 8,
      font: ctx.sans,
      color: GREY,
    });
    page.drawText("FICHÉ", {
      x: A4.width - MARGIN.right + 60 - ctx.sans.widthOfTextAtSize("FICHÉ", 8),
      y: 32,
      size: 8,
      font: ctx.sans,
      color: GREY,
    });
  });
}
