/**
 * Encre posée sur les feuilles (canvas par page) : surligneur (canal vert) et crayon rouge de l'expert
 * (canal rouge). Le shader des feuilles lit ce canvas comme une texture.
 */
import * as THREE from "three";
import type { Box } from "./docRenderer";

export interface MarkLayer {
  canvas: HTMLCanvasElement;
  tex: THREE.CanvasTexture;
}

const layers = new Map<string, MarkLayer>();
const MARK_W = 768;

export function marksFor(docId: string, page: number, ratio: number): MarkLayer {
  const key = `${docId}|${page}`;
  let l = layers.get(key);
  if (!l) {
    const canvas = document.createElement("canvas");
    canvas.width = MARK_W;
    canvas.height = Math.round(MARK_W * ratio);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    l = { canvas, tex };
    layers.set(key, l);
  }
  return l;
}

export function resetMarks(): void {
  for (const l of layers.values()) {
    l.canvas.getContext("2d")!.clearRect(0, 0, l.canvas.width, l.canvas.height);
    l.tex.needsUpdate = true;
  }
}

/** Trait de surligneur (coordonnées de page, y vers le bas). Biseau plat, légèrement irrégulier. */
export function inkSegment(l: MarkLayer, a: { x: number; y: number }, b: { x: number; y: number }, width = 0.018): void {
  const x = l.canvas.getContext("2d")!;
  const W = l.canvas.width;
  const H = l.canvas.height;
  x.strokeStyle = "rgb(0,255,0)";
  x.lineCap = "square";
  x.lineJoin = "round";
  x.lineWidth = width * H;
  x.beginPath();
  x.moveTo(a.x * W, a.y * H);
  x.lineTo(b.x * W, b.y * H);
  x.stroke();
  l.tex.needsUpdate = true;
}

/** Surligne une ligne entière (clavier, liste accessible). */
export function inkBox(l: MarkLayer, box: Box): void {
  const y = (box.y0 + box.y1) / 2;
  const lines = Math.max(1, Math.round((box.y1 - box.y0) / 0.022));
  for (let i = 0; i < lines; i++) {
    const yy = lines === 1 ? y : box.y0 + (i + 0.5) * ((box.y1 - box.y0) / lines);
    inkSegment(l, { x: box.x0 + 0.004, y: yy }, { x: box.x1 - 0.004, y: yy });
  }
}

/** Ellipse au crayon rouge autour d'une ligne (atout « Expert judiciaire »). */
export function circleBox(l: MarkLayer, box: Box): void {
  const x = l.canvas.getContext("2d")!;
  const W = l.canvas.width;
  const H = l.canvas.height;
  x.strokeStyle = "rgb(255,0,0)";
  x.lineWidth = 3.5;
  const cx = ((box.x0 + box.x1) / 2) * W;
  const cy = ((box.y0 + box.y1) / 2) * H;
  const rx = ((box.x1 - box.x0) / 2) * W + 14;
  const ry = ((box.y1 - box.y0) / 2) * H + 12;
  for (let k = 0; k < 2; k++) {
    x.beginPath();
    x.ellipse(cx + k * 3, cy - k * 2, rx + k * 4, ry + k * 3, -0.02 + k * 0.03, 0.1, Math.PI * 2.05);
    x.stroke();
  }
  l.tex.needsUpdate = true;
}
