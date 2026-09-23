/**
 * Plates provisoires de la séquence d'arrivée (plans 3b à 8). Même principe que placeholders.ts :
 * couleur et profondeur peintes ensemble, personnages en bustes stylisés.
 */
import type { LightVariant } from "@/content/types";
import { BRASS, bust, newLayer, Painter, rng, type PlaceholderPlate } from "./placeholderKit";

const W = 1600;
const H = 900;

// ---------------------------------------------------------------- 03b — Gros plan sur le vigile
function guard(): PlaceholderPlate {
  const p = new Painter(W, H);
  const r = rng(301);
  p.shape((c) => c.rect(0, 0, W, H), (c) => p.linear(c, 0, 0, 0, H, [[0, "#1c1712"], [1, "#0c0a08"]]), 0.1);
  // Mur de marbre derrière, flou.
  for (let i = 0; i < 18; i++) {
    p.c.strokeStyle = `rgba(201,162,74,${0.05 + r() * 0.12})`;
    p.c.lineWidth = 1 + r() * 2;
    p.c.beginPath();
    p.c.moveTo(r() * W, 0);
    p.c.bezierCurveTo(r() * W, H * 0.3, r() * W, H * 0.6, r() * W, H * 0.75);
    p.c.stroke();
  }
  p.glow(W * 0.2, H * 0.1, 260, "rgba(255,200,130,0.35)", 0.8);
  p.glow(W * 0.85, H * 0.15, 200, "rgba(255,200,130,0.25)", 0.8);
  bust(p, W * 0.52, H * 0.52, H * 0.95, { skin: "#b98a6a", hair: "#8d8d8d", suit: "#18223a", shirt: "#c9ccd6", tie: "#0c1020", hairStyle: "crew" }, 0.62);
  // Écusson laiton sur la poitrine.
  p.glow(W * 0.62, H * 0.66, 18, "rgba(230,190,100,0.9)", 0.9);
  // Comptoir en noyer au premier plan + imprimante à badges.
  p.shape((c) => c.rect(0, H * 0.78, W, H * 0.22), (c) => p.linear(c, 0, H * 0.78, 0, H, [[0, "#6a4526"], [1, "#2a180b"]]), 0.92);
  p.shape((c) => c.rect(0, H * 0.78, W, 5), BRASS, 0.93);
  p.shape((c) => c.roundRect(W * 0.12, H * 0.66, W * 0.16, H * 0.13, 10), (c) => p.linear(c, 0, H * 0.66, 0, H * 0.79, [[0, "#2c2f36"], [1, "#101216"]]), 0.85);
  p.glow(W * 0.25, H * 0.69, 16, "rgba(90,255,150,0.9)", 0.9);
  p.shape((c) => c.rect(W * 0.15, H * 0.745, W * 0.1, 6), "#050505", 0.86);
  p.finish(31);
  return { color: p.color, depth: p.depth, layers: {} };
}

// ---------------------------------------------------------------- 04 — Ascenseur panoramique (skyline 9:16 + cabine)
function elevator(): PlaceholderPlate {
  const w = 1152;
  const h = 2048;
  const p = new Painter(w, h);
  const r = rng(401);
  // Ciel : nuit en haut → aube orange à l'horizon (le haut de l'image = ce qu'on voit en arrivant au 52e).
  p.shape((c) => c.rect(0, 0, w, h), (c) => p.linear(c, 0, 0, 0, h, [[0, "#1a1f3d"], [0.35, "#6b3f55"], [0.55, "#f08a4b"], [0.62, "#ffc98a"], [1, "#2a3446"]]), 0);
  p.glow(w * 0.7, h * 0.6, w * 0.5, "rgba(255,190,110,0.6)", 0.9);
  // Skyline en couches : loin (haut, petit) → proche (bas, grand). Plus on descend, plus c'est proche.
  for (let layer = 0; layer < 6; layer++) {
    const t = layer / 5;
    const baseY = h * (0.62 + t * 0.4);
    const depth = 0.08 + t * 0.35;
    let x = -30;
    const scale = 0.6 + t * 2.4;
    while (x < w) {
      const bw = (18 + r() * 40) * scale;
      const bh = (60 + r() * 180) * scale;
      const tone = 18 + layer * 6;
      p.shape((c) => c.rect(x, baseY - bh, bw, bh + h), `rgb(${tone + 10},${tone + 8},${tone + 22})`, depth);
      // Faces éclairées par le soleil levant.
      p.c.fillStyle = `rgba(255,170,100,${0.05 + 0.1 * (1 - t)})`;
      p.c.fillRect(x + bw * 0.6, baseY - bh, bw * 0.4, bh);
      for (let wy = baseY - bh + 6 * scale; wy < baseY + h * 0.05; wy += 9 * scale) {
        for (let wx = x + 3 * scale; wx < x + bw - 3 * scale; wx += 7 * scale) {
          if (r() < 0.12) {
            p.c.fillStyle = "rgba(255,210,140,0.6)";
            p.c.fillRect(wx, wy, 3 * scale, 4 * scale);
          }
        }
      }
      x += bw + r() * 8 * scale;
    }
  }
  p.finish(41);

  // Cabine (calque 16:9 attaché à la caméra) : montants en laiton, main courante, panneau d'étage.
  const L = newLayer(W, H);
  const c = L.ctx;
  const brass = (x0: number, y0: number, x1: number, y1: number) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "#5b4318");
    g.addColorStop(0.5, "#e2c173");
    g.addColorStop(1, "#5b4318");
    return g;
  };
  c.fillStyle = "#0b0c10";
  c.fillRect(0, 0, W, H * 0.07);
  c.fillRect(0, H * 0.9, W, H * 0.1);
  c.fillStyle = brass(0, H * 0.07, 0, H * 0.085);
  c.fillRect(0, H * 0.07, W, H * 0.015);
  for (const x of [0.02, 0.35, 0.65, 0.98]) {
    c.fillStyle = brass(W * x - 12, 0, W * x + 12, 0);
    c.fillRect(W * x - 12, 0, 24, H);
  }
  // Main courante.
  c.fillStyle = brass(0, H * 0.72, 0, H * 0.745);
  c.fillRect(0, H * 0.72, W, H * 0.025);
  // Panneau d'étage en haut au centre.
  c.fillStyle = "#16120c";
  c.beginPath();
  c.roundRect(W * 0.44, H * 0.2, W * 0.12, H * 0.09, 8);
  c.fill();
  c.strokeStyle = "#c9a24a";
  c.lineWidth = 3;
  c.stroke();
  // Reflets sur la vitre.
  c.globalCompositeOperation = "lighter";
  const g = c.createLinearGradient(W * 0.1, 0, W * 0.3, H);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,230,200,0.06)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  return { color: p.color, depth: p.depth, layers: { "04-elevator-dawn.layer-cabin": L.cv } };
}

// ---------------------------------------------------------------- 05 — Accueil du 52e
function reception(): PlaceholderPlate {
  const p = new Painter(W, H);
  const r = rng(501);
  // Mur en noyer.
  p.shape((c) => c.rect(0, 0, W, H), (c) => p.linear(c, 0, 0, W, 0, [[0, "#3a2414"], [0.5, "#5a3a20"], [1, "#2e1c0f"]]), 0.18);
  for (let i = 0; i < 40; i++) {
    p.c.strokeStyle = `rgba(20,10,4,${0.15 + r() * 0.25})`;
    p.c.lineWidth = 1 + r() * 3;
    p.c.beginPath();
    const x = r() * W;
    p.c.moveTo(x, 0);
    p.c.bezierCurveTo(x + (r() - 0.5) * 80, H * 0.3, x + (r() - 0.5) * 80, H * 0.6, x + (r() - 0.5) * 60, H);
    p.c.stroke();
  }
  // Logo gravé (laiton).
  p.c.save();
  p.c.fillStyle = BRASS;
  p.c.font = `500 ${H * 0.05}px Georgia, serif`;
  p.c.textAlign = "center";
  p.c.shadowColor = "rgba(0,0,0,0.6)";
  p.c.shadowBlur = 6;
  p.c.fillText("HARLOW & VANCE", W * 0.62, H * 0.2);
  p.c.font = `400 ${H * 0.02}px Georgia, serif`;
  p.c.fillText("ATTORNEYS AT LAW", W * 0.62, H * 0.245);
  p.c.restore();
  // Couloir vitré à gauche (lumière du matin).
  p.shape((c) => { c.moveTo(0, 0); c.lineTo(W * 0.3, H * 0.12); c.lineTo(W * 0.3, H * 0.78); c.lineTo(0, H); }, (c) => p.linear(c, 0, 0, W * 0.3, 0, [[0, "#9fb3c8"], [1, "#e8eef3"]]), (c) => p.linear(c, 0, 0, W * 0.3, 0, [[0, "rgb(170,170,170)"], [1, "rgb(30,30,30)"]]));
  for (let i = 0; i < 5; i++) {
    const x = W * (0.03 + i * 0.06);
    p.shape((c) => c.rect(x, H * 0.05 + i * 12, 5, H * 0.9 - i * 24), "#20242a", 0.7 - i * 0.12);
  }
  // Bouquet architectural sur le comptoir.
  p.shape((c) => c.roundRect(W * 0.36, H * 0.5, W * 0.05, H * 0.14, 8), "#1a1a1a", 0.6);
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.6;
    const len = H * (0.12 + r() * 0.22);
    const x0 = W * 0.385;
    const y0 = H * 0.5;
    p.c.strokeStyle = r() < 0.3 ? "#e8dcc4" : "#2f4a2a";
    p.c.lineWidth = 3 + r() * 5;
    p.c.beginPath();
    p.c.moveTo(x0, y0);
    p.c.quadraticCurveTo(x0 + Math.cos(a) * len * 0.5 + (r() - 0.5) * 30, y0 + Math.sin(a) * len * 0.5, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len);
    p.c.stroke();
    if (r() < 0.4) p.glow(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len, 14, "rgba(255,240,220,0.8)", 0.8);
  }
  // Nora derrière le comptoir.
  bust(p, W * 0.64, H * 0.58, H * 0.62, { skin: "#8a5a3c", hair: "#1c120c", suit: "#d8ccb4", shirt: "#e9dcc4", hairStyle: "bun" }, 0.55);
  p.glow(W * 0.6, H * 0.47, 6, "rgba(255,210,120,0.9)", 0.9);
  p.glow(W * 0.68, H * 0.47, 6, "rgba(255,210,120,0.9)", 0.9);
  // Comptoir minimaliste.
  p.shape((c) => c.rect(W * 0.34, H * 0.64, W * 0.6, H * 0.36), (c) => p.linear(c, 0, H * 0.64, 0, H, [[0, "#b9b2a6"], [1, "#6d675e"]]), p.depthLinear(0, H * 0.64, 0, H, 0.65, 0.9));
  p.shape((c) => c.rect(W * 0.34, H * 0.64, W * 0.6, 4), BRASS, 0.66);
  // Lumière du matin.
  p.glow(W * 0.98, H * 0.05, W * 0.5, "rgba(255,225,180,0.35)", 0.9);
  p.finish(51);
  return { color: p.color, depth: p.depth, layers: {} };
}

// ---------------------------------------------------------------- 06 — Le rival contre la porte vitrée
function rival(): PlaceholderPlate {
  const p = new Painter(W, H);
  const r = rng(601);
  // Couloir flou derrière.
  p.shape((c) => c.rect(0, 0, W, H), (c) => p.linear(c, 0, 0, W, 0, [[0, "#8d99a8"], [0.5, "#cfd6dd"], [1, "#7c8795"]]), 0.1);
  for (let i = 0; i < 8; i++) p.glow(r() * W, H * (0.2 + r() * 0.3), 60 + r() * 80, "rgba(255,250,235,0.5)", 0.6);
  // Porte vitrée : cadre noir, poignée laiton, sérigraphie dépolie.
  p.shape((c) => c.rect(W * 0.2, 0, W * 0.6, H), "rgba(160,175,190,0.35)", 0.45);
  p.shape((c) => c.rect(W * 0.2, 0, W * 0.012, H), "#111318", 0.5);
  p.shape((c) => c.rect(W * 0.788, 0, W * 0.012, H), "#111318", 0.5);
  p.shape((c) => c.rect(W * 0.2, H * 0.45, W * 0.6, H * 0.06), "rgba(235,240,245,0.4)", 0.46);
  p.shape((c) => c.roundRect(W * 0.74, H * 0.4, W * 0.012, H * 0.25, 6), (c) => p.linear(c, W * 0.74, 0, W * 0.752, 0, [[0, "#6b4e1d"], [0.5, "#e7c878"], [1, "#6b4e1d"]]), 0.52);
  // Mercer, appuyé, bras croisés.
  bust(p, W * 0.44, H * 0.6, H * 0.95, { skin: "#e0b48f", hair: "#c9a76a", suit: "#2c2f36", shirt: "#e8ecf2", hairStyle: "short" }, 0.6);
  p.shape((c) => c.roundRect(W * 0.3, H * 0.78, W * 0.28, H * 0.1, 30), (c) => p.linear(c, 0, H * 0.78, 0, H * 0.88, [[0, "#34373f"], [1, "#16181c"]]), 0.66);
  p.finish(61);
  return { color: p.color, depth: p.depth, layers: {} };
}

// ---------------------------------------------------------------- 07 — Le bureau d'angle au lever du soleil
function cornerOffice(): PlaceholderPlate {
  const p = new Painter(W, H);
  const r = rng(701);
  p.shape((c) => c.rect(0, 0, W, H), (c) => p.linear(c, 0, 0, 0, H * 0.7, [[0, "#23305a"], [0.45, "#b0604e"], [0.7, "#ffb56b"], [1, "#ffdca8"]]), 0);
  p.glow(W * 0.55, H * 0.62, W * 0.35, "rgba(255,200,120,0.9)", 1);
  // Skyline lointaine.
  let x = -20;
  while (x < W) {
    const bw = 30 + r() * 70;
    const bh = 60 + r() * 220;
    p.shape((c) => c.rect(x, H * 0.66 - bh, bw, bh + 80), `rgb(${40 + r() * 20},${34 + r() * 10},${50 + r() * 15})`, 0.08);
    x += bw + r() * 6;
  }
  // Montants de la baie vitrée (270°).
  for (const fx of [0.08, 0.3, 0.7, 0.92]) p.shape((c) => c.rect(W * fx - 6, 0, 12, H * 0.72), "#101216", 0.28);
  p.shape((c) => c.rect(0, H * 0.7, W, H * 0.3), (c) => p.linear(c, 0, H * 0.7, 0, H, [[0, "#2a2420"], [1, "#0f0c0a"]]), p.depthLinear(0, H * 0.7, 0, H, 0.3, 0.8));
  // Harlow de dos à la fenêtre, en contre-jour.
  bust(p, W * 0.5, H * 0.52, H * 0.78, { skin: "#c49a7c", hair: "#c8c8c8", suit: "#1a2440", shirt: "#dfe3ea", tie: "#3a0f14", beard: "#9a9a9a", hairStyle: "short", rim: "rgba(255,200,130,0.9)" }, 0.45);
  // Bureau en verre (premier plan) : reflets.
  p.shape(
    (c) => { c.moveTo(W * 0.02, H * 0.8); c.lineTo(W * 0.98, H * 0.8); c.lineTo(W * 1.1, H); c.lineTo(-W * 0.1, H); },
    "rgba(140,170,190,0.35)",
    (c) => p.linear(c, 0, H * 0.8, 0, H, [[0, "rgb(170,170,170)"], [1, "rgb(255,255,255)"]]),
  );
  p.shape((c) => c.rect(W * 0.02, H * 0.8, W * 0.96, 3), "rgba(255,230,190,0.7)", 0.72);
  p.glow(W * 0.55, H * 0.86, W * 0.25, "rgba(255,190,110,0.35)", 0.8);
  // Fauteuils en cuir.
  p.shape((c) => c.roundRect(W * 0.05, H * 0.62, W * 0.14, H * 0.2, 20), "#241510", 0.7);
  p.shape((c) => c.roundRect(W * 0.81, H * 0.62, W * 0.14, H * 0.2, 20), "#241510", 0.7);
  p.finish(71);
  return { color: p.color, depth: p.depth, layers: {} };
}

// ---------------------------------------------------------------- 08 — Les bureaux (hub), du stagiaire à l'associé
type DeskRank = "intern" | "associate" | "senior" | "partner";

/**
 * Même disposition pour les quatre bureaux (voir DESK_LAYOUT) : étagère à gauche, tableau de liège,
 * ordinateur, porte vitrée à droite. Le rang change les matériaux, la fenêtre et les objets de prestige.
 * Le plateau du bureau reste dégagé : chemises, téléphone, mallette et café sont des objets 3D.
 */
function hubDesk(rank: DeskRank, variant?: LightVariant): PlaceholderPlate {
  const p = new Painter(W, H);
  const r = rng(801 + rank.length);
  const v = variant ?? (rank === "intern" ? "night" : "day");
  const sky = v === "night" ? ["#070b18", "#141c33", "#2a3350"] : v === "dusk" ? ["#2a1a3a", "#a4504a", "#f0a060"] : ["#7d9cc0", "#b9cde0", "#e8dcc6"];
  const wall = { intern: ["#2b3136", "#1a1e22"], associate: ["#4a4038", "#2e2822"], senior: ["#3a2c22", "#231a13"], partner: ["#1e1a18", "#120f0d"] }[rank];
  const deskTop = { intern: ["#5a5046", "#2a241e"], associate: ["#6a4a2e", "#2c1d10"], senior: ["#5a3418", "#24130a"], partner: ["#3a1a10", "#170a05"] }[rank];

  p.shape((c) => c.rect(0, 0, W, H), (c) => p.linear(c, 0, 0, 0, H * 0.6, [[0, wall[0]!], [1, wall[1]!]]), 0.12);
  if (rank === "senior" || rank === "partner") {
    // Boiseries.
    for (let i = 0; i < 12; i++) p.shape((c) => c.rect(W * (0.02 + i * 0.08), H * 0.02, W * 0.07, H * 0.56), `rgba(255,220,170,${0.02 + r() * 0.03})`, null);
  }

  // Fenêtre (sauf stagiaire) : de la petite fenêtre sur cour au panorama.
  const win = { intern: null, associate: [0.52, 0.03, 0.78, 0.2], senior: [0.49, 0.02, 0.81, 0.25], partner: [0.47, 0.0, 0.83, 0.28] }[rank];
  if (win) {
    const [x0, y0, x1, y1] = win.map((k, i) => k * (i % 2 ? H : W)) as [number, number, number, number];
    p.shape((c) => c.rect(x0, y0, x1 - x0, y1 - y0), (c) => p.linear(c, 0, y0, 0, y1, [[0, sky[0]!], [0.7, sky[1]!], [1, sky[2]!]]), 0.02);
    if (rank === "associate") {
      // Mur de briques de la cour.
      for (let y = y0 + 10; y < y1; y += 14) {
        for (let x = x0 + ((y / 14) % 2) * 12; x < x1; x += 26) {
          p.c.fillStyle = `rgba(90,50,40,${0.5 + r() * 0.3})`;
          p.c.fillRect(x, y, 22, 10);
        }
      }
    } else {
      let x = x0;
      while (x < x1) {
        const bw = 12 + r() * 40;
        const bh = (y1 - y0) * (0.2 + r() * 0.6);
        p.shape((c) => c.rect(x, y1 - bh, bw, bh), v === "night" ? "#0b0f1a" : "rgba(60,70,90,0.85)", 0.04);
        for (let wy = y1 - bh + 4; wy < y1; wy += 7) {
          for (let wx = x + 2; wx < x + bw - 2; wx += 6) {
            if (r() < (v === "night" ? 0.3 : 0.08)) {
              p.c.fillStyle = "rgba(255,210,140,0.8)";
              p.c.fillRect(wx, wy, 2, 3);
            }
          }
        }
        x += bw + 2;
      }
    }
    p.shape((c) => c.rect(x0, y0, x1 - x0, 6), "#15161a", 0.1);
    p.shape((c) => c.rect(x0, y1 - 6, x1 - x0, 6), "#15161a", 0.1);
    if (v !== "night") p.glow((x0 + x1) / 2, y1, (x1 - x0) * 0.8, v === "dusk" ? "rgba(255,160,90,0.35)" : "rgba(255,245,225,0.3)", 0.9);
  }

  // Éclairage : néon froid (stagiaire) ou lampes chaudes.
  if (rank === "intern") {
    p.shape((c) => c.rect(W * 0.2, 0, W * 0.6, H * 0.03), "#e8f2ff", 0.2);
    p.glow(W * 0.5, H * 0.02, W * 0.4, "rgba(210,235,255,0.5)", 0.9);
  } else {
    p.glow(W * 0.12, H * 0.02, W * 0.25, "rgba(255,210,150,0.35)", 0.8);
  }

  // Étagère (bibliothèque de leçons) : reliures cuir, titres dorés.
  p.shape((c) => c.rect(W * 0.03, H * 0.06, W * 0.18, H * 0.44), rank === "intern" ? "#3a3530" : "#2a180e", 0.3);
  for (let row = 0; row < 3; row++) {
    const sy = H * (0.06 + row * 0.147);
    p.shape((c) => c.rect(W * 0.03, sy + H * 0.13, W * 0.18, H * 0.017), rank === "intern" ? "#4a443c" : "#3a2414", 0.31);
    let bx = W * 0.04;
    while (bx < W * 0.2) {
      const bw = W * (0.008 + r() * 0.01);
      const bh = H * (0.08 + r() * 0.045);
      const cols = ["#5a1e1e", "#1e3a5a", "#2a4a2a", "#4a3a1e", "#3a1e3a"];
      p.shape((c) => c.rect(bx, sy + H * 0.13 - bh, bw, bh), cols[Math.floor(r() * cols.length)]!, 0.32);
      p.c.fillStyle = "rgba(220,180,90,0.7)";
      p.c.fillRect(bx + 2, sy + H * 0.13 - bh + 8, bw - 4, 2);
      bx += bw + 1;
    }
  }
  if (rank === "partner") {
    // Carafe de whisky sur l'étagère du bas.
    p.shape((c) => c.roundRect(W * 0.16, H * 0.4, W * 0.03, H * 0.06, 6), "rgba(170,100,40,0.8)", 0.33);
    p.glow(W * 0.175, H * 0.42, 20, "rgba(255,190,110,0.8)", 0.8);
  }

  // Tableau de liège (encadré de bois pour les rangs supérieurs).
  const frame = rank === "intern" ? "#3b2a18" : "#1c120a";
  p.shape((c) => c.rect(W * 0.25 - 8, H * 0.12 - 8, W * 0.22 + 16, H * 0.28 + 16), frame, 0.24);
  p.shape((c) => c.rect(W * 0.25, H * 0.12, W * 0.22, H * 0.28), (c) => p.linear(c, 0, H * 0.12, 0, H * 0.4, [[0, "#9a6d3e"], [1, "#7c5530"]]), 0.25);
  for (let i = 0; i < 180; i++) {
    p.c.fillStyle = `rgba(60,35,15,${r() * 0.25})`;
    p.c.fillRect(W * (0.25 + r() * 0.22), H * (0.12 + r() * 0.28), 2, 2);
  }

  if (rank === "senior" || rank === "partner") {
    // Diplômes encadrés sous le tableau.
    for (let i = 0; i < 2; i++) {
      p.shape((c) => c.rect(W * (0.27 + i * 0.1), H * 0.44, W * 0.07, H * 0.1), "#1a1510", 0.26);
      p.shape((c) => c.rect(W * (0.275 + i * 0.1), H * 0.45, W * 0.06, H * 0.08), "#efe6d2", 0.265);
    }
  }

  // Porte vitrée (dépolie) à droite.
  p.shape((c) => c.rect(W * 0.84, H * 0.02, W * 0.15, H * 0.6), "#15161a", 0.34);
  p.shape((c) => c.rect(W * 0.855, H * 0.06, W * 0.12, H * 0.52), (c) => p.linear(c, W * 0.855, 0, W * 0.975, 0, [[0, "rgba(170,185,200,0.55)"], [1, "rgba(120,135,150,0.55)"]]), 0.3);
  p.glow(W * 0.915, H * 0.3, W * 0.08, "rgba(230,240,255,0.25)", 0.8);
  p.shape((c) => c.roundRect(W * 0.86, H * 0.3, W * 0.008, H * 0.1, 4), "#c9a24a", 0.36);

  // Ordinateur.
  p.shape((c) => c.roundRect(W * 0.52, H * 0.26, W * 0.26, H * 0.28, 8), "#0d0f13", 0.55);
  p.shape((c) => c.rect(W * 0.53, H * 0.275, W * 0.24, H * 0.245), (c) => p.linear(c, 0, H * 0.275, 0, H * 0.52, [[0, "#12325a"], [1, "#0a1a30"]]), 0.56);
  p.c.fillStyle = "rgba(201,162,74,0.9)";
  p.c.font = `600 ${H * 0.022}px Georgia, serif`;
  p.c.fillText("H&V Terminal", W * 0.55, H * 0.315);
  p.glow(W * 0.65, H * 0.4, W * 0.2, "rgba(80,150,255,0.22)", 0.8);
  p.shape((c) => c.rect(W * 0.63, H * 0.54, W * 0.04, H * 0.07), "#15171c", 0.57);

  // Lampe (néon pour le stagiaire → lampe de banquier verte, laiton pour les autres).
  const lampX = W * 0.46;
  p.shape((c) => c.ellipse(lampX, H * 0.47, W * 0.05, H * 0.03, 0, Math.PI, Math.PI * 2), rank === "intern" ? "#0f5a36" : "#6b4e1d", 0.6);
  p.shape((c) => c.rect(lampX - 3, H * 0.47, 6, H * 0.14), "#c9a24a", 0.6);
  p.glow(lampX, H * 0.56, W * 0.14, "rgba(255,220,150,0.6)", 1);

  // Plateau du bureau (dégagé).
  p.shape((c) => { c.moveTo(0, H * 0.6); c.lineTo(W, H * 0.6); c.lineTo(W, H); c.lineTo(0, H); }, (c) => p.linear(c, 0, H * 0.6, 0, H, [[0, deskTop[0]!], [1, deskTop[1]!]]), p.depthLinear(0, H * 0.6, 0, H, 0.55, 1));
  if (rank !== "intern") {
    // Sous-main en cuir.
    p.shape((c) => { c.moveTo(W * 0.3, H * 0.66); c.lineTo(W * 0.7, H * 0.66); c.lineTo(W * 0.76, H * 0.9); c.lineTo(W * 0.24, H * 0.9); }, "rgba(20,30,25,0.75)", null);
  }
  p.shape((c) => c.rect(0, H * 0.6, W, 4), "rgba(255,230,190,0.25)", 0.56);
  p.finish(81);
  return { color: p.color, depth: p.depth, layers: {} };
}

export function arrivalPlate(sceneId: string, variant?: LightVariant): PlaceholderPlate | null {
  switch (sceneId) {
    case "03b-lobby-guard":
      return guard();
    case "04-elevator-dawn":
      return elevator();
    case "05-reception-52":
      return reception();
    case "06-rival-door":
      return rival();
    case "07-corner-office":
      return cornerOffice();
    case "08-desk-intern-night":
      return hubDesk("intern", variant);
    case "08-desk-associate":
      return hubDesk("associate", variant);
    case "08-desk-senior":
      return hubDesk("senior", variant);
    case "08-desk-partner":
      return hubDesk("partner", variant);
    default:
      return null;
  }
}
