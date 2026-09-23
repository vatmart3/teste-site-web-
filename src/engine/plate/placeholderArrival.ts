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

// ---------------------------------------------------------------- 08 — Bureau de stagiaire, la nuit
function internDesk(variant?: LightVariant): PlaceholderPlate {
  const p = new Painter(W, H);
  const r = rng(801);
  const night = variant !== "day";
  // Mur sans fenêtre, lumière de néon froide.
  p.shape((c) => c.rect(0, 0, W, H), (c) => p.linear(c, 0, 0, 0, H * 0.6, [[0, night ? "#2b3136" : "#8a9296"], [1, night ? "#1a1e22" : "#6b7378"]]), 0.12);
  p.shape((c) => c.rect(W * 0.2, 0, W * 0.6, H * 0.04), "#e8f2ff", 0.2);
  p.glow(W * 0.5, H * 0.02, W * 0.4, "rgba(210,235,255,0.5)", 0.9);
  // Tableau de liège.
  p.shape((c) => c.rect(W * 0.08, H * 0.1, W * 0.28, H * 0.3), (c) => p.linear(c, 0, H * 0.1, 0, H * 0.4, [[0, "#9a6d3e"], [1, "#7c5530"]]), 0.18);
  p.shape((c) => c.rect(W * 0.08, H * 0.1, W * 0.28, 8), "#3b2a18", 0.19);
  for (let i = 0; i < 7; i++) {
    const x = W * (0.1 + r() * 0.22);
    const y = H * (0.13 + r() * 0.2);
    p.shape((c) => c.rect(x, y, W * 0.05, H * 0.07), r() < 0.5 ? "#f1ecdf" : "#f3e27a", 0.19);
    p.glow(x + W * 0.025, y + 4, 5, "rgba(220,40,40,1)", 1, "source-over");
  }
  // Plante en plastique.
  p.shape((c) => c.rect(W * 0.86, H * 0.42, W * 0.06, H * 0.12), "#d8d2c6", 0.55);
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2;
    p.shape((c) => c.ellipse(W * 0.89 + Math.cos(a) * 40, H * 0.4 + Math.sin(a) * 50, 26, 10, a, 0, Math.PI * 2), "#3f7a3a", 0.55);
  }
  // Écran d'ordinateur.
  p.shape((c) => c.roundRect(W * 0.5, H * 0.24, W * 0.3, H * 0.3, 8), "#0d0f13", 0.55);
  p.shape((c) => c.rect(W * 0.51, H * 0.26, W * 0.28, H * 0.26), (c) => p.linear(c, 0, H * 0.26, 0, H * 0.52, [[0, "#12325a"], [1, "#0a1a30"]]), 0.56);
  p.c.fillStyle = "rgba(201,162,74,0.9)";
  p.c.font = `600 ${H * 0.022}px Georgia, serif`;
  p.c.fillText("H&V Terminal", W * 0.53, H * 0.3);
  p.glow(W * 0.65, H * 0.4, W * 0.2, "rgba(80,150,255,0.25)", 0.8);
  p.shape((c) => c.rect(W * 0.63, H * 0.54, W * 0.04, H * 0.08), "#15171c", 0.57);
  // Plateau du bureau.
  p.shape((c) => { c.moveTo(0, H * 0.6); c.lineTo(W, H * 0.6); c.lineTo(W, H); c.lineTo(0, H); }, (c) => p.linear(c, 0, H * 0.6, 0, H, [[0, "#4a3726"], [1, "#1d140c"]]), p.depthLinear(0, H * 0.6, 0, H, 0.55, 1));
  // Pile de chemises.
  for (let i = 0; i < 6; i++) p.shape((c) => c.rect(W * 0.08 + i * 3, H * (0.66 - i * 0.018), W * 0.22, H * 0.03), i % 2 ? "#d9b77a" : "#c9a466", 0.72);
  // Lampe de banquier verte.
  p.shape((c) => c.ellipse(W * 0.4, H * 0.5, W * 0.07, H * 0.04, 0, Math.PI, Math.PI * 2), "#0f5a36", 0.65);
  p.shape((c) => c.rect(W * 0.395, H * 0.5, W * 0.01, H * 0.12), BRASS, 0.64);
  p.glow(W * 0.4, H * 0.58, W * 0.18, "rgba(255,220,150,0.7)", 1);
  // Téléphone de bureau + voyant.
  p.shape((c) => c.roundRect(W * 0.78, H * 0.68, W * 0.12, H * 0.09, 10), "#15161a", 0.78);
  p.glow(W * 0.885, H * 0.695, 10, "rgba(255,40,40,0.9)", 1);
  // Gobelet de café.
  p.shape((c) => { c.moveTo(W * 0.62, H * 0.7); c.lineTo(W * 0.66, H * 0.7); c.lineTo(W * 0.655, H * 0.8); c.lineTo(W * 0.625, H * 0.8); c.closePath(); }, "#efe7da", 0.8);
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
      return internDesk(variant);
    default:
      return null;
  }
}
