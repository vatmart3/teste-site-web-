"use client";

import type { MindMap } from "@/lib/schemas";
import { fontSizeFor, layoutMindMap, lineHeightFor } from "@/lib/mindmap/layout";

/**
 * Le PNG est peint au canvas à partir de la même disposition que le SVG affiché,
 * pas rastérisé depuis le SVG : c'est ce qui garantit que les polices du document
 * sont bien celles de l'export.
 */
export async function mindmapPng(map: MindMap, title: string, scale = 3): Promise<Blob> {
  const layout = layoutMindMap(map, new Set());
  const top = 56;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(layout.width * scale);
  canvas.height = Math.round((layout.height + top) * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponible");

  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, layout.width, layout.height + top);

  const display = 'var(--font-display), "Helvetica Neue", Arial, sans-serif';

  ctx.fillStyle = "#0b0b0c";
  ctx.font = `600 15px ${display}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(title, 24, 32);
  ctx.strokeStyle = "#0b0b0c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, 42);
  ctx.lineTo(layout.width - 24, 42);
  ctx.stroke();

  ctx.translate(0, top);

  for (const link of layout.links) {
    ctx.strokeStyle = link.depth <= 1 ? "#0b0b0c" : "#9a9a96";
    ctx.lineWidth = Math.max(0.8, 2.4 - link.depth * 0.5);
    ctx.beginPath();
    ctx.moveTo(link.x1, link.y1);
    ctx.lineTo(link.x2, link.y2);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  for (const node of layout.nodes) {
    const size = fontSizeFor(node.depth);
    const left = node.x - node.width / 2;
    const topY = node.y - node.height / 2;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(left, topY, node.width, node.height);
    ctx.strokeStyle = node.depth === 0 ? "#0b0b0c" : "#c9c9c6";
    ctx.lineWidth = node.depth === 0 ? 1.6 : 0.8;
    ctx.strokeRect(left, topY, node.width, node.height);
    if (node.depth === 1) {
      ctx.fillStyle = "#ffe94a";
      ctx.fillRect(left + 2, topY + node.height - 6, node.width - 4, 4);
    }

    ctx.fillStyle = "#0b0b0c";
    ctx.font = `${node.depth <= 1 ? 600 : 400} ${size}px ${display}`;
    const lineHeight = lineHeightFor(node.depth);
    let ty = node.y - ((node.lines.length - 1) * lineHeight) / 2 + size * 0.34;
    for (const line of node.lines) {
      ctx.fillText(line, node.x, ty);
      ty += lineHeight;
    }
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("export PNG impossible"));
    }, "image/png");
  });
}
