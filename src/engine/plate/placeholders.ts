/**
 * Plates provisoires procédurales : pour chaque plan, on peint en parallèle une image couleur
 * et sa carte de profondeur (blanc = proche) avec EXACTEMENT les mêmes formes.
 * Elles servent de démo tant que les vraies plates (annexe A) ne sont pas dans /public/scenes.
 */
import type { LightVariant } from "@/content/types";

export interface PlaceholderPlate {
  color: HTMLCanvasElement;
  depth: HTMLCanvasElement;
  layers: Record<string, HTMLCanvasElement>;
}

type Ctx = CanvasRenderingContext2D;

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gray = (d: number) => {
  const v = Math.round(Math.max(0, Math.min(1, d)) * 255);
  return `rgb(${v},${v},${v})`;
};

/**
 * Le « peintre » : chaque appel dessine la même forme dans le canvas couleur et dans le canvas de
 * profondeur, avec un remplissage différent pour chacun.
 */
class Painter {
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

function newLayer(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return { cv, ctx: cv.getContext("2d")! };
}

// Palette « drame juridique » : bleu nuit profond, laiton chaud.
const NAVY = "#070d1a";
const BRASS = "#c9a24a";

function lightFor(variant: LightVariant | undefined) {
  switch (variant) {
    case "night":
      return { sky: ["#03060d", "#0a1528", "#1a2a44"], win: "#ffcf7a", ambient: 0.55 };
    case "dusk":
      return { sky: ["#1b1030", "#6a2d3a", "#f08a4b"], win: "#ffd38a", ambient: 0.8 };
    default:
      return { sky: ["#6f8fb3", "#b8cde0", "#f3e3c6"], win: "#fff4dc", ambient: 1 };
  }
}

// ---------------------------------------------------------------------------------------------
// 01 — Taxi de nuit sous la pluie
// ---------------------------------------------------------------------------------------------
function taxi(): PlaceholderPlate {
  const W = 1600;
  const H = 900;
  const p = new Painter(W, H);
  const r = rng(11);
  // Ciel d'aube bleu nuit.
  p.shape((c) => c.rect(0, 0, W, H), (c) => p.linear(c, 0, 0, 0, H * 0.6, [[0, "#040914"], [0.7, "#0e2340"], [1, "#27496b"]]), 0);
  // Skyline lointaine.
  for (let layer = 0; layer < 3; layer++) {
    const depth = 0.1 + layer * 0.08;
    const baseY = H * (0.56 + layer * 0.03);
    let x = -20;
    while (x < W) {
      const bw = 40 + r() * 110;
      const bh = 80 + r() * (320 - layer * 70);
      const tone = 10 + layer * 6;
      p.shape((c) => c.rect(x, baseY - bh, bw, bh + 200), `rgb(${tone},${tone + 6},${tone + 18})`, depth);
      // fenêtres éclairées
      for (let wy = baseY - bh + 10; wy < baseY; wy += 12) {
        for (let wx = x + 6; wx < x + bw - 6; wx += 10) {
          if (r() < 0.22) {
            p.c.fillStyle = r() < 0.8 ? "rgba(255,196,110,0.55)" : "rgba(160,210,255,0.5)";
            p.c.fillRect(wx, wy, 4, 5);
          }
        }
      }
      x += bw + r() * 12;
    }
  }
  // Route mouillée + reflets.
  p.shape((c) => c.rect(0, H * 0.6, W, H * 0.4), (c) => p.linear(c, 0, H * 0.6, 0, H, [[0, "#0b1422"], [1, "#05080f"]]), p.depthLinear(0, H * 0.6, 0, H, 0.35, 0.6));
  // Bokeh des feux arrière et des néons.
  for (let i = 0; i < 38; i++) {
    const x = r() * W;
    const y = H * (0.5 + r() * 0.2);
    const red = r() < 0.6;
    const col = red ? "rgba(255,40,40,0.9)" : r() < 0.5 ? "rgba(255,170,60,0.85)" : "rgba(90,200,255,0.8)";
    p.glow(x, y, 18 + r() * 40, col, 0.9);
    p.glow(x, y + 90 + r() * 80, 30 + r() * 30, col, 0.25); // reflet sur la chaussée
  }
  // Pare-brise : montants noirs, rétroviseur, tableau de bord.
  p.shape((c) => { c.moveTo(0, 0); c.lineTo(W * 0.12, 0); c.lineTo(W * 0.02, H * 0.8); c.lineTo(0, H * 0.82); }, "#020306", 0.86);
  p.shape((c) => { c.moveTo(W, 0); c.lineTo(W * 0.86, 0); c.lineTo(W * 0.97, H * 0.8); c.lineTo(W, H * 0.82); }, "#020306", 0.86);
  p.shape((c) => c.rect(0, 0, W, H * 0.07), "#030409", 0.88);
  p.shape((c) => c.roundRect(W * 0.43, H * 0.07, W * 0.14, H * 0.07, 14), "#0b0d12", 0.9);
  p.glow(W * 0.5, H * 0.1, 60, "rgba(255,80,60,0.25)", 0.6);
  p.shape(
    (c) => { c.moveTo(0, H * 0.78); c.bezierCurveTo(W * 0.3, H * 0.72, W * 0.7, H * 0.72, W, H * 0.78); c.lineTo(W, H); c.lineTo(0, H); },
    (c) => p.linear(c, 0, H * 0.72, 0, H, [[0, "#15171d"], [1, "#050507"]]),
    p.depthLinear(0, H * 0.72, 0, H, 0.9, 1),
  );
  // Compteur du taxi (lueur rouge) + reflet sur le pare-brise.
  p.shape((c) => c.roundRect(W * 0.46, H * 0.8, W * 0.08, H * 0.05, 6), "#200505", 0.96);
  p.glow(W * 0.5, H * 0.825, 50, "rgba(255,60,40,0.8)", 0.9);
  // Appui-tête du chauffeur (silhouette à gauche).
  p.shape((c) => c.ellipse(W * 0.2, H * 0.62, W * 0.09, H * 0.2, 0, 0, Math.PI * 2), "#07080b", 0.78);
  p.finish(1);
  return { color: p.color, depth: p.depth, layers: {} };
}

// ---------------------------------------------------------------------------------------------
// 02 — Pied de la tour (plate très haute, 9:16)
// ---------------------------------------------------------------------------------------------
function tower(): PlaceholderPlate {
  const W = 1152;
  const H = 2048;
  const p = new Painter(W, H);
  const r = rng(22);
  p.shape((c) => c.rect(0, 0, W, H), (c) => p.linear(c, 0, 0, 0, H, [[0, "#02040a"], [0.5, "#0a1830"], [1, "#1a3050"]]), 0);
  // Nuages bas éclairés par la ville.
  for (let i = 0; i < 12; i++) p.glow(r() * W, r() * H * 0.3, 200 + r() * 200, "rgba(70,90,130,0.25)", 0.5);
  // Tour en perspective (on regarde vers le haut : elle converge en haut).
  const top = { l: W * 0.38, r: W * 0.62, y: 0 };
  const bot = { l: -W * 0.15, r: W * 1.15, y: H * 0.93 };
  p.shape(
    (c) => { c.moveTo(top.l, top.y); c.lineTo(top.r, top.y); c.lineTo(bot.r, bot.y); c.lineTo(bot.l, bot.y); },
    (c) => p.linear(c, 0, 0, 0, H, [[0, "#0c1422"], [1, "#172234"]]),
    p.depthLinear(0, 0, 0, H * 0.93, 0.15, 0.85),
  );
  // Grille des vitrages : verre sombre qui reflète le ciel, quelques bureaux allumés à l'aube.
  const rows = 120;
  const cols = 30;
  for (let i = 0; i < rows; i++) {
    const t0 = Math.pow(i / rows, 1.35);
    const t1 = Math.pow((i + 1) / rows, 1.35);
    const y0 = t0 * bot.y;
    const y1 = t1 * bot.y;
    const l0 = top.l + (bot.l - top.l) * t0;
    const r0 = top.r + (bot.r - top.r) * t0;
    const cw = (r0 - l0) / cols;
    const rh = y1 - y0;
    for (let j = 0; j < cols; j++) {
      const x0 = l0 + cw * j;
      const lit = r() < 0.07;
      const refl = 0.35 + 0.35 * Math.sin(j * 0.35 + i * 0.05) + r() * 0.1;
      p.c.fillStyle = lit
        ? `rgba(255,${190 + Math.floor(r() * 40)},120,${0.35 + r() * 0.3})`
        : `rgba(${Math.floor(30 + refl * 30)},${Math.floor(50 + refl * 40)},${Math.floor(80 + refl * 50)},${0.35 + refl * 0.25})`;
      p.c.fillRect(x0 + cw * 0.08, y0 + rh * 0.12, cw * 0.84, rh * 0.62);
    }
  }
  // Reflet de la ville sur le verre.
  p.glow(W * 0.3, H * 0.6, W * 0.6, "rgba(120,160,220,0.25)", 0.6);
  // Porte tambour en laiton, marquise, trottoir mouillé.
  p.shape((c) => c.rect(0, H * 0.84, W, H * 0.03), "#0a0c10", 0.9);
  p.shape((c) => c.rect(W * 0.3, H * 0.87, W * 0.4, H * 0.08), (c) => p.linear(c, 0, H * 0.87, 0, H * 0.95, [[0, "#6b4e1d"], [1, "#2a1d08"]]), 0.94);
  p.glow(W * 0.5, H * 0.91, W * 0.3, "rgba(255,190,100,0.9)", 0.8);
  for (let k = 0; k < 4; k++) {
    p.c.fillStyle = BRASS;
    p.c.fillRect(W * (0.32 + k * 0.12), H * 0.87, 6, H * 0.08);
  }
  p.shape((c) => c.rect(0, H * 0.95, W, H * 0.05), (c) => p.linear(c, 0, H * 0.95, 0, H, [[0, "#1a1a1f"], [1, "#050507"]]), 1);
  p.glow(W * 0.5, H * 0.99, W * 0.4, "rgba(255,180,90,0.35)", 0.6);
  p.finish(2);
  return { color: p.color, depth: p.depth, layers: {} };
}

// ---------------------------------------------------------------------------------------------
// 03 — Hall en marbre noir veiné d'or
// ---------------------------------------------------------------------------------------------
function lobby(): PlaceholderPlate {
  const W = 1600;
  const H = 900;
  const p = new Painter(W, H);
  const r = rng(33);
  const vx = W * 0.5;
  const vy = H * 0.46;
  // Mur du fond.
  p.shape((c) => c.rect(0, 0, W, H), (c) => p.linear(c, 0, 0, 0, H, [[0, "#1a1510"], [0.6, "#2b2219"], [1, "#1a1511"]]), 0.12);
  // Pilastres de marbre sur le mur du fond.
  for (let i = 0; i < 6; i++) {
    const x = W * (0.2 + i * 0.12);
    p.shape((c) => c.rect(x, H * 0.2, W * 0.03, H * 0.42), (c) => p.linear(c, x, 0, x + W * 0.03, 0, [[0, "#15110d"], [0.5, "#3a2e22"], [1, "#15110d"]]), 0.16);
  }
  p.glow(W * 0.5, H * 0.05, W * 0.35, "rgba(255,210,150,0.35)", 0.8);
  // Plafond (lumière indirecte).
  p.shape((c) => { c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W * 0.72, H * 0.2); c.lineTo(W * 0.28, H * 0.2); }, (c) => p.linear(c, 0, 0, 0, H * 0.2, [[0, "#2a2016"], [1, "#0f0c09"]]), p.depthLinear(0, 0, 0, H * 0.2, 0.7, 0.2));
  for (let i = 0; i < 5; i++) p.glow(W * (0.3 + i * 0.1), H * 0.19, 60, "rgba(255,200,130,0.8)", 0.7);
  // Sol en marbre noir en perspective.
  p.shape((c) => { c.moveTo(W * 0.28, H * 0.62); c.lineTo(W * 0.72, H * 0.62); c.lineTo(W * 1.3, H); c.lineTo(-W * 0.3, H); }, (c) => p.linear(c, 0, H * 0.62, 0, H, [[0, "#0b0a0a"], [1, "#030303"]]), p.depthLinear(0, H * 0.62, 0, H, 0.2, 1));
  // Veines dorées.
  p.c.save();
  p.c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 26; i++) {
    p.c.strokeStyle = `rgba(201,162,74,${0.08 + r() * 0.2})`;
    p.c.lineWidth = 0.6 + r() * 1.4;
    p.c.beginPath();
    let x = r() * W;
    let y = H * (0.64 + r() * 0.36);
    p.c.moveTo(x, y);
    for (let s = 0; s < 8; s++) {
      x += (r() - 0.3) * 140;
      y += (r() - 0.5) * 30;
      p.c.lineTo(x, Math.max(H * 0.63, y));
    }
    p.c.stroke();
  }
  p.c.restore();
  // Lettres laiton au fond : « HARLOW & VANCE — 44-52 » (bloc lumineux, pas de vrai texte sur la plate).
  p.shape((c) => c.rect(W * 0.36, H * 0.3, W * 0.28, H * 0.05), "#2b2114", 0.14);
  p.c.save();
  p.c.fillStyle = BRASS;
  p.c.font = `600 ${H * 0.032}px Georgia, serif`;
  p.c.textAlign = "center";
  p.c.fillText("HARLOW  &  VANCE", W * 0.5, H * 0.337);
  p.c.restore();
  p.glow(W * 0.5, H * 0.325, W * 0.18, "rgba(255,190,110,0.35)", 0.6);
  // Comptoir d'accueil en noyer + vigile.
  p.shape((c) => c.rect(W * 0.34, H * 0.5, W * 0.32, H * 0.14), (c) => p.linear(c, 0, H * 0.5, 0, H * 0.64, [[0, "#5a3a20"], [1, "#24160b"]]), 0.45);
  p.shape((c) => c.rect(W * 0.34, H * 0.5, W * 0.32, 4), BRASS, 0.46);
  p.shape((c) => { c.ellipse(W * 0.52, H * 0.43, W * 0.015, H * 0.035, 0, 0, Math.PI * 2); c.rect(W * 0.495, H * 0.46, W * 0.05, H * 0.05); }, "#0a0b10", 0.42);
  p.glow(W * 0.47, H * 0.49, 40, "rgba(120,190,255,0.5)", 0.6); // écran de sécurité
  // Portiques en laiton.
  for (let i = 0; i < 4; i++) {
    const x = W * (0.3 + i * 0.12);
    p.shape((c) => c.rect(x, H * 0.66, W * 0.025, H * 0.12), (c) => p.linear(c, 0, H * 0.66, 0, H * 0.78, [[0, "#d7b560"], [1, "#5b4318"]]), 0.72);
    p.glow(x + W * 0.012, H * 0.67, 12, "rgba(80,255,140,0.9)", 0.7);
  }
  // Reflets des lumières dans le sol.
  for (let i = 0; i < 5; i++) p.glow(W * (0.3 + i * 0.1), H * 0.82, 50, "rgba(255,200,130,0.25)", 0.5);
  // Colonnes latérales (proches).
  for (const side of [0, 1]) {
    const x = side ? W * 0.9 : W * 0.02;
    p.shape((c) => c.rect(x, 0, W * 0.08, H), (c) => p.linear(c, x, 0, x + W * 0.08, 0, [[0, "#050404"], [0.5, "#1b1612"], [1, "#050404"]]), 0.8);
  }
  p.finish(3);

  // Calque premier plan : colonne détourée très proche (côté gauche), pour la parallaxe profonde.
  const L = newLayer(W, H);
  const g = L.ctx.createLinearGradient(0, 0, W * 0.12, 0);
  g.addColorStop(0, "#020202");
  g.addColorStop(0.6, "#15110d");
  g.addColorStop(1, "#070605");
  L.ctx.fillStyle = g;
  L.ctx.fillRect(-W * 0.02, 0, W * 0.12, H);
  L.ctx.fillStyle = "rgba(201,162,74,0.55)";
  L.ctx.fillRect(W * 0.095, 0, 3, H);
  void vx;
  void vy;
  return { color: p.color, depth: p.depth, layers: { "03-lobby.layer-column": L.cv } };
}

// ---------------------------------------------------------------------------------------------
// 06 — Couloir de l'open space (perspective centrale)
// ---------------------------------------------------------------------------------------------
function openspace(seed: number, variant?: LightVariant): PlaceholderPlate {
  const W = 1600;
  const H = 900;
  const p = new Painter(W, H);
  const r = rng(seed);
  const L = lightFor(variant ?? "day");
  const vx = W * 0.5;
  const vy = H * 0.44;
  const endW = W * 0.14;
  const endH = H * 0.2;
  const ex0 = vx - endW / 2;
  const ex1 = vx + endW / 2;
  const ey0 = vy - endH / 2;
  const ey1 = vy + endH / 2;

  // Fenêtre du fond (baie vitrée sur la ville).
  p.shape((c) => c.rect(ex0, ey0, endW, endH), (c) => p.linear(c, 0, ey0, 0, ey1, [[0, L.sky[0]!], [0.6, L.sky[1]!], [1, L.sky[2]!]]), 0.02);
  for (let i = 0; i < 16; i++) {
    const bw = endW / 16;
    const bh = endH * (0.2 + r() * 0.5);
    p.shape((c) => c.rect(ex0 + i * bw, ey1 - bh, bw - 1, bh), variant === "day" || !variant ? "rgba(80,100,130,0.8)" : "rgba(10,16,30,0.95)", 0.03);
  }
  // Plafond, sol, murs (quatre trapèzes vers le point de fuite).
  const dim = L.ambient;
  const tone = (v: number) => Math.round(v * dim);
  p.shape((c) => { c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(ex1, ey0); c.lineTo(ex0, ey0); }, (c) => p.linear(c, 0, 0, 0, ey0, [[0, `rgb(${tone(60)},${tone(58)},${tone(56)})`], [1, `rgb(${tone(120)},${tone(116)},${tone(108)})`]]), p.depthLinear(0, 0, 0, ey0, 0.75, 0.05));
  p.shape((c) => { c.moveTo(0, H); c.lineTo(W, H); c.lineTo(ex1, ey1); c.lineTo(ex0, ey1); }, (c) => p.linear(c, 0, ey1, 0, H, [[0, `rgb(${tone(70)},${tone(60)},${tone(50)})`], [1, `rgb(${tone(26)},${tone(20)},${tone(16)})`]]), p.depthLinear(0, ey1, 0, H, 0.05, 1));
  for (const side of [-1, 1]) {
    const xOuter = side < 0 ? 0 : W;
    const xInner = side < 0 ? ex0 : ex1;
    p.shape(
      (c) => { c.moveTo(xOuter, 0); c.lineTo(xInner, ey0); c.lineTo(xInner, ey1); c.lineTo(xOuter, H); },
      (c) => p.linear(c, xOuter, 0, xInner, 0, [[0, `rgb(${tone(40)},${tone(44)},${tone(52)})`], [1, `rgb(${tone(95)},${tone(100)},${tone(110)})`]]),
      p.depthLinear(xOuter, 0, xInner, 0, 0.92, 0.05),
    );
    // Bureaux vitrés : panneaux lumineux + montants + silhouettes.
    const n = 6;
    for (let i = 0; i < n; i++) {
      const t0 = Math.pow(i / n, 0.7);
      const t1 = Math.pow((i + 0.85) / n, 0.7);
      const x0 = xOuter + (xInner - xOuter) * t0;
      const x1 = xOuter + (xInner - xOuter) * t1;
      const top0 = ey0 * t0 + H * 0.12 * (1 - t0);
      const bot0 = ey1 * t0 + H * 0.86 * (1 - t0);
      const top1 = ey0 * t1 + H * 0.12 * (1 - t1);
      const bot1 = ey1 * t1 + H * 0.86 * (1 - t1);
      const warm = variant === "night" ? L.win : r() < 0.5 ? "#f4efe4" : "#dfe8f2";
      p.c.save();
      p.c.globalAlpha = 0.55 + r() * 0.3;
      p.c.fillStyle = warm;
      p.c.beginPath();
      p.c.moveTo(x0, top0 + 10);
      p.c.lineTo(x1, top1 + 6);
      p.c.lineTo(x1, bot1 - 6);
      p.c.lineTo(x0, bot0 - 10);
      p.c.fill();
      p.c.restore();
      // Silhouette de collaborateur au téléphone.
      if (r() < 0.6) {
        const cx = x0 + (x1 - x0) * (0.3 + r() * 0.4);
        const s = (bot0 - top0) * 0.18;
        const cy = (top0 + bot0) / 2 + s * 0.4;
        const dd = 0.92 - t0 * 0.85;
        p.shape((c) => { c.ellipse(cx, cy - s, s * 0.28, s * 0.34, 0, 0, Math.PI * 2); c.roundRect(cx - s * 0.5, cy - s * 0.65, s, s * 1.6, s * 0.3); }, "rgba(20,24,34,0.85)", dd);
      }
      // Écran de marché (lueur colorée).
      if (r() < 0.5) p.glow(x0 + (x1 - x0) * 0.7, (top0 + bot0) / 2 + 20, (x1 - x0) * 0.5, r() < 0.5 ? "rgba(60,220,160,0.5)" : "rgba(80,150,255,0.5)", 0.5);
      p.c.fillStyle = "rgba(20,20,24,0.9)";
      p.c.fillRect(x1, top1, Math.max(2, (x1 - x0) * 0.06), bot1 - top1);
    }
  }
  // Rampes lumineuses au plafond.
  for (let i = 0; i < 7; i++) {
    const t = Math.pow(i / 7, 0.75);
    const y = ey0 * t;
    const half = (W / 2) * (1 - t) * 0.35 + endW * 0.2;
    p.c.fillStyle = variant === "night" ? "rgba(255,240,215,0.75)" : "rgba(255,252,240,0.9)";
    p.c.fillRect(vx - half, y + 8 * (1 - t), half * 2, 6 * (1 - t) + 1.5);
  }
  // Reflet de la baie dans le sol ciré.
  p.glow(vx, ey1 + H * 0.12, endW * 1.3, variant === "night" ? "rgba(90,120,180,0.3)" : "rgba(255,230,190,0.35)", 0.7);
  p.finish(seed);

  // Calque premier plan : plante (feuilles détourées) à droite.
  const Lp = newLayer(W, H);
  const rr = rng(seed + 7);
  const ctx = Lp.ctx;
  ctx.fillStyle = "#15120e";
  ctx.fillRect(W * 0.86, H * 0.8, W * 0.12, H * 0.2);
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + (rr() - 0.5) * 2.4;
    const len = H * (0.25 + rr() * 0.35);
    const bx = W * 0.92;
    const by = H * 0.82;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(a + Math.PI / 2);
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, "#0c1a0e");
    g.addColorStop(1, rr() < 0.5 ? "#2d4a26" : "#1f3a1f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.12, -len * 0.5, 0, -len);
    ctx.quadraticCurveTo(-len * 0.12, -len * 0.5, 0, 0);
    ctx.fill();
    ctx.restore();
  }
  return { color: p.color, depth: p.depth, layers: { "06a-openspace.layer-plant": Lp.cv } };
}

// ---------------------------------------------------------------------------------------------

const cache = new Map<string, PlaceholderPlate>();

/** Plate procédurale pour un plan (mise en cache). Plan inconnu → couloir générique. */
export function placeholderPlate(sceneId: string, variant?: LightVariant): PlaceholderPlate {
  const key = `${sceneId}|${variant ?? "day"}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let plate: PlaceholderPlate;
  switch (sceneId) {
    case "01-taxi-night":
      plate = taxi();
      break;
    case "02-tower-base":
      plate = tower();
      break;
    case "03-lobby":
      plate = lobby();
      break;
    case "06b-openspace":
      plate = openspace(62, variant);
      break;
    default:
      plate = openspace(61, variant);
  }
  cache.set(key, plate);
  return plate;
}

export const PLACEHOLDER_NAVY = NAVY;
