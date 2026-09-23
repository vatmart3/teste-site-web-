/**
 * Outils de peinture des plates provisoires : chaque forme est peinte à la fois dans l'image couleur
 * et dans la carte de profondeur (blanc = proche).
 */
import type { LightVariant } from "@/content/types";

export type Ctx = CanvasRenderingContext2D;

export interface PlaceholderPlate {
  color: HTMLCanvasElement;
  depth: HTMLCanvasElement;
  layers: Record<string, HTMLCanvasElement>;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const gray = (d: number) => {
  const v = Math.round(Math.max(0, Math.min(1, d)) * 255);
  return `rgb(${v},${v},${v})`;
};

/**
 * Le « peintre » : chaque appel dessine la même forme dans le canvas couleur et dans le canvas de
 * profondeur, avec un remplissage différent pour chacun.
 */
export class Painter {
  readonly color: HTMLCanvasElement;
  readonly depth: HTMLCanvasElement;
  readonly c: Ctx;
  readonly d: Ctx;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.color = document.createElement("canvas");
    this.depth = document.createElement("canvas");
    this.color.width = this.depth.width = w;
    this.color.height = this.depth.height = h;
    this.c = this.color.getContext("2d")!;
    this.d = this.depth.getContext("2d")!;
  }

  /** Dessine un chemin dans les deux canvas. `fillC`/`fillD` : style ou fabrique de dégradé. */
  shape(
    path: (ctx: Ctx) => void,
    fillC: string | CanvasGradient | ((ctx: Ctx) => string | CanvasGradient) | null,
    fillD: number | ((ctx: Ctx) => string | CanvasGradient) | null,
    blur = 0,
  ) {
    if (fillC !== null) {
      const c = this.c;
      c.save();
      if (blur) c.filter = `blur(${blur}px)`;
      c.beginPath();
      path(c);
      c.fillStyle = typeof fillC === "function" ? fillC(c) : fillC;
      c.fill();
      c.restore();
    }
    if (fillD !== null) {
      const d = this.d;
      d.save();
      d.beginPath();
      path(d);
      d.fillStyle = typeof fillD === "number" ? gray(fillD) : fillD(d);
      d.fill();
      d.restore();
    }
  }

  /** Ne peint que la couleur (lumières, reflets…). */
  glow(x: number, y: number, radius: number, color: string, alpha = 1, mode: GlobalCompositeOperation = "lighter") {
    const r = Math.max(1, Math.abs(radius));
    const c = this.c;
    c.save();
    c.globalCompositeOperation = mode;
    c.globalAlpha = alpha;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.restore();
  }

  linear(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [o, s] of stops) g.addColorStop(o, s);
    return g;
  }

  depthLinear(x0: number, y0: number, x1: number, y1: number, d0: number, d1: number) {
    return (ctx: Ctx) => this.linear(ctx, x0, y0, x1, y1, [
      [0, gray(d0)],
      [1, gray(d1)],
    ]);
  }

  /** Grain + vignettage pour que la plate provisoire ait déjà un peu de « matière ». */
  finish(seed: number, grain = 10) {
    const { c, w, h } = this;
    const img = c.getImageData(0, 0, w, h);
    const r = rng(seed);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() - 0.5) * grain;
      img.data[i] = img.data[i]! + n;
      img.data[i + 1] = img.data[i + 1]! + n;
      img.data[i + 2] = img.data[i + 2]! + n;
    }
    c.putImageData(img, 0, 0);
    // Adoucit la carte de profondeur (comme une vraie sortie Depth Anything).
    const soft = document.createElement("canvas");
    soft.width = w;
    soft.height = h;
    const s = soft.getContext("2d")!;
    s.filter = `blur(${Math.round(w / 500)}px)`;
    s.drawImage(this.depth, 0, 0);
    this.d.drawImage(soft, 0, 0);
  }
}

export function newLayer(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return { cv, ctx: cv.getContext("2d")! };
}

// Palette « drame juridique » : bleu nuit profond, laiton chaud.
export const NAVY = "#070d1a";
export const BRASS = "#c9a24a";

export function lightFor(variant: LightVariant | undefined) {
  switch (variant) {
    case "night":
      return { sky: ["#03060d", "#0a1528", "#1a2a44"], win: "#ffcf7a", ambient: 0.55 };
    case "dusk":
      return { sky: ["#1b1030", "#6a2d3a", "#f08a4b"], win: "#ffd38a", ambient: 0.8 };
    default:
      return { sky: ["#6f8fb3", "#b8cde0", "#f3e3c6"], win: "#fff4dc", ambient: 1 };
  }
}


export interface BustStyle {
  skin: string;
  hair: string;
  suit: string;
  shirt: string;
  /** Cheveux : court, chignon, carré, dégarni, blanc court. */
  hairStyle: "short" | "bun" | "bob" | "receding" | "crew";
  beard?: string;
  tie?: string;
  /** Contre-jour : silhouette sombre avec liseré lumineux. */
  rim?: string;
}

/**
 * Buste de personnage (tête + épaules), peint en couleur et en profondeur : le visage est plus proche
 * que les épaules, ce qui donne du relief à la parallaxe et permet l'animation de respiration.
 */
export function bust(p: Painter, cx: number, cy: number, h: number, st: BustStyle, depth: number) {
  const headR = h * 0.13;
  const hy = cy - h * 0.18;
  const sh = h * 0.42; // demi-largeur des épaules
  const dk = (c: string) => (st.rim ? "#0a0b0f" : c);
  // Épaules / veste.
  p.shape(
    (c) => {
      c.moveTo(cx - sh, cy + h * 0.55);
      c.bezierCurveTo(cx - sh, cy + h * 0.05, cx - sh * 0.55, cy - h * 0.02, cx - headR * 0.8, cy - h * 0.03);
      c.lineTo(cx + headR * 0.8, cy - h * 0.03);
      c.bezierCurveTo(cx + sh * 0.55, cy - h * 0.02, cx + sh, cy + h * 0.05, cx + sh, cy + h * 0.55);
      c.closePath();
    },
    (c) => p.linear(c, 0, cy - h * 0.05, 0, cy + h * 0.55, [[0, dk(st.suit)], [1, "#050507"]]),
    depth - 0.03,
  );
  // Chemise + cravate.
  p.shape(
    (c) => {
      c.moveTo(cx - headR * 0.75, cy - h * 0.03);
      c.lineTo(cx + headR * 0.75, cy - h * 0.03);
      c.lineTo(cx, cy + h * 0.3);
      c.closePath();
    },
    dk(st.shirt),
    depth - 0.01,
  );
  if (st.tie) p.shape((c) => { c.moveTo(cx - headR * 0.18, cy); c.lineTo(cx + headR * 0.18, cy); c.lineTo(cx + headR * 0.12, cy + h * 0.26); c.lineTo(cx, cy + h * 0.3); c.lineTo(cx - headR * 0.12, cy + h * 0.26); c.closePath(); }, dk(st.tie), depth - 0.005);
  // Cou.
  p.shape((c) => c.rect(cx - headR * 0.42, hy + headR * 0.6, headR * 0.84, h * 0.12), dk(st.skin), depth - 0.02);
  // Tête (dégradé de profondeur : le nez est le plus proche).
  p.shape(
    (c) => c.ellipse(cx, hy, headR * 0.82, headR, 0, 0, Math.PI * 2),
    (c) => {
      const g = c.createRadialGradient(cx - headR * 0.25, hy - headR * 0.2, headR * 0.1, cx, hy, headR * 1.1);
      g.addColorStop(0, dk(st.skin));
      g.addColorStop(1, st.rim ? "#050507" : "#3a2a22");
      return g;
    },
    (c) => {
      const g = c.createRadialGradient(cx, hy, 0, cx, hy, headR);
      g.addColorStop(0, gray(depth + 0.06));
      g.addColorStop(1, gray(depth - 0.02));
      return g;
    },
  );
  // Traits du visage (yeux, sourcils) — sauf à contre-jour.
  if (!st.rim) {
    const c = p.c;
    c.save();
    c.fillStyle = "rgba(20,12,8,0.85)";
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.ellipse(cx + sx * headR * 0.32, hy - headR * 0.02, headR * 0.09, headR * 0.05, 0, 0, Math.PI * 2);
      c.fill();
      c.fillRect(cx + sx * headR * 0.32 - headR * 0.14, hy - headR * 0.2, headR * 0.28, headR * 0.05);
    }
    c.fillStyle = "rgba(90,40,30,0.55)";
    c.fillRect(cx - headR * 0.2, hy + headR * 0.45, headR * 0.4, headR * 0.06);
    c.restore();
  }
  // Barbe.
  if (st.beard) p.shape((c) => c.ellipse(cx, hy + headR * 0.55, headR * 0.6, headR * 0.45, 0, 0, Math.PI), dk(st.beard), null);
  // Cheveux.
  const hair = dk(st.hair);
  p.shape(
    (c) => {
      switch (st.hairStyle) {
        case "bun":
          c.ellipse(cx, hy - headR * 0.35, headR * 0.9, headR * 0.72, 0, Math.PI, Math.PI * 2);
          c.moveTo(cx + headR * 0.4, hy - headR * 1.02);
          c.ellipse(cx, hy - headR * 1.02, headR * 0.4, headR * 0.3, 0, 0, Math.PI * 2);
          break;
        case "bob":
          c.moveTo(cx - headR * 0.95, hy + headR * 0.55);
          c.bezierCurveTo(cx - headR * 1.15, hy - headR * 1.4, cx + headR * 1.15, hy - headR * 1.4, cx + headR * 0.95, hy + headR * 0.55);
          c.lineTo(cx + headR * 0.7, hy + headR * 0.5);
          c.bezierCurveTo(cx + headR * 0.8, hy - headR * 0.6, cx - headR * 0.8, hy - headR * 0.6, cx - headR * 0.7, hy + headR * 0.5);
          c.closePath();
          break;
        case "receding":
          c.ellipse(cx, hy - headR * 0.35, headR * 0.86, headR * 0.5, 0, Math.PI * 1.05, Math.PI * 1.95);
          break;
        case "crew":
          c.ellipse(cx, hy - headR * 0.45, headR * 0.84, headR * 0.58, 0, Math.PI, Math.PI * 2);
          break;
        default:
          c.ellipse(cx, hy - headR * 0.4, headR * 0.9, headR * 0.7, -0.15, Math.PI * 0.95, Math.PI * 2.05);
      }
    },
    hair,
    null,
  );
  if (st.rim) {
    // Liseré de contre-jour sur le contour.
    const c = p.c;
    c.save();
    c.globalCompositeOperation = "lighter";
    c.strokeStyle = st.rim;
    c.lineWidth = Math.max(2, h * 0.008);
    c.shadowColor = st.rim;
    c.shadowBlur = h * 0.03;
    c.beginPath();
    c.ellipse(cx, hy, headR * 0.84, headR * 1.02, 0, Math.PI * 1.05, Math.PI * 1.95);
    c.stroke();
    c.beginPath();
    c.moveTo(cx + headR * 0.85, cy - h * 0.03);
    c.bezierCurveTo(cx + sh * 0.55, cy - h * 0.02, cx + sh, cy + h * 0.05, cx + sh, cy + h * 0.5);
    c.moveTo(cx - headR * 0.85, cy - h * 0.03);
    c.bezierCurveTo(cx - sh * 0.55, cy - h * 0.02, cx - sh, cy + h * 0.05, cx - sh, cy + h * 0.5);
    c.stroke();
    c.restore();
  }
}
