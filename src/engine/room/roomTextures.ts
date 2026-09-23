/** Textures peintes des pièces 3D : écran, cadran, notes punaisées, dos de livres, vue de la fenêtre… */
import * as THREE from "three";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";
const cache = new Map<string, THREE.CanvasTexture>();

function make(key: string, w: number, h: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

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

/** Écran d'accueil du « H&V Terminal ». */
export function monitorScreen(): THREE.CanvasTexture {
  return make("monitor", 1280, 760, (x, W, H) => {
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0b2448");
    g.addColorStop(1, "#050d1c");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 18; i++) x.fillRect(0, i * 44, W, 1);
    x.fillStyle = "#0e1c34";
    x.fillRect(0, 0, W, 54);
    x.fillStyle = "#c9a24a";
    x.font = `600 30px ${SERIF}`;
    x.fillText("H&V Terminal", 28, 37);
    x.fillStyle = "rgba(200,220,255,0.6)";
    x.font = `400 22px ${SANS}`;
    x.fillText("Réseau sécurisé · Harlow & Vance LLP", W - 430, 36);
    x.textAlign = "center";
    x.fillStyle = "#e7c878";
    x.font = `500 76px ${SERIF}`;
    x.fillText("HARLOW & VANCE", W / 2, H * 0.45);
    x.fillStyle = "rgba(200,220,255,0.75)";
    x.font = `400 26px ${SANS}`;
    x.fillText("Session ouverte — dossiers, messagerie, classement", W / 2, H * 0.55);
    x.strokeStyle = "rgba(201,162,74,0.7)";
    x.lineWidth = 2;
    x.strokeRect(W / 2 - 180, H * 0.63, 360, 60);
    x.fillStyle = "#e7c878";
    x.font = `600 24px ${SANS}`;
    x.fillText("OUVRIR", W / 2, H * 0.63 + 39);
  });
}

/** Cadran d'horloge murale (fond ivoire, index, « NEW YORK »). */
export function clockFace(): THREE.CanvasTexture {
  return make("clockface", 1024, 1024, (x, W) => {
    const c = W / 2;
    const g = x.createRadialGradient(c * 0.8, c * 0.7, 20, c, c, c);
    g.addColorStop(0, "#fbf7ec");
    g.addColorStop(1, "#e3dccb");
    x.fillStyle = g;
    x.fillRect(0, 0, W, W);
    x.translate(c, c);
    for (let i = 0; i < 60; i++) {
      x.save();
      x.rotate((i / 60) * Math.PI * 2);
      x.fillStyle = "#1a1a1a";
      if (i % 5 === 0) x.fillRect(-7, -c * 0.92, 14, c * 0.12);
      else x.fillRect(-2, -c * 0.92, 4, c * 0.05);
      x.restore();
    }
    x.fillStyle = "#1a1a1a";
    x.font = `500 ${c * 0.17}px ${SERIF}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    for (let h = 1; h <= 12; h++) {
      const a = (h / 12) * Math.PI * 2;
      x.fillText(String(h), Math.sin(a) * c * 0.66, -Math.cos(a) * c * 0.66);
    }
    x.font = `600 ${c * 0.07}px ${SANS}`;
    x.fillStyle = "#555";
    x.fillText("NEW YORK", 0, c * 0.32);
  });
}

/** Dos de livre : bandes dorées et titre (multiplié par la couleur d'instance). */
export function bookSpine(): THREE.CanvasTexture {
  return make("spine", 128, 512, (x, W, H) => {
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, W, H);
    const r = rng(5);
    for (let i = 0; i < 400; i++) {
      x.fillStyle = `rgba(0,0,0,${r() * 0.06})`;
      x.fillRect(r() * W, r() * H, 2, 2);
    }
    x.fillStyle = "rgba(0,0,0,0.25)";
    x.fillRect(0, 0, 10, H);
    x.fillRect(W - 10, 0, 10, H);
    // Bandes dorées : la couleur d'instance les teinte, d'où l'or « délavé » et crédible.
    x.fillStyle = "#e9d9a4";
    for (const y of [40, 56, H - 70, H - 54]) x.fillRect(12, y, W - 24, 5);
    x.fillRect(22, 120, W - 44, 170);
    x.fillStyle = "rgba(0,0,0,0.5)";
    x.fillRect(26, 124, W - 52, 162);
  });
}

export interface PinnedNote {
  title: string;
  lines: string[];
  kind: "paper" | "yellow" | "photo";
}

export function noteTexture(n: PinnedNote, key: string): THREE.CanvasTexture {
  return make(`note-${key}`, 512, 512, (x, W, H) => {
    x.fillStyle = n.kind === "yellow" ? "#f3e27a" : n.kind === "photo" ? "#1b1d22" : "#f6f1e3";
    x.fillRect(0, 0, W, H);
    if (n.kind === "photo") {
      // « Photo » de la tour Meridian : silhouette sous un ciel gris.
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#8d96a3");
      g.addColorStop(1, "#3a3f47");
      x.fillStyle = g;
      x.fillRect(24, 24, W - 48, H - 110);
      x.fillStyle = "#15171b";
      x.fillRect(W * 0.38, 110, W * 0.24, H - 196);
      x.fillRect(W * 0.2, 250, W * 0.14, H - 336);
      x.fillStyle = "#222";
      x.font = `500 30px ${SANS}`;
      x.fillText(n.title, 30, H - 40);
      return;
    }
    x.fillStyle = "#8a6a26";
    x.font = `700 28px ${SANS}`;
    x.fillText(n.title.toUpperCase(), 36, 70);
    x.fillStyle = "#2a2118";
    x.font = `400 34px ${SERIF}`;
    n.lines.forEach((l, i) => x.fillText(l, 36, 140 + i * 50));
  });
}

/** Vue de nuit depuis la fenêtre (immeubles éclairés), assez grande pour rester nette au flou près. */
export function cityView(variant: "day" | "dusk" | "night"): THREE.CanvasTexture {
  return make(`city-${variant}`, 2048, 1024, (x, W, H) => {
    const r = rng(9);
    const sky = x.createLinearGradient(0, 0, 0, H);
    if (variant === "night") {
      sky.addColorStop(0, "#04070f");
      sky.addColorStop(0.7, "#101a30");
      sky.addColorStop(1, "#2a3350");
    } else if (variant === "dusk") {
      sky.addColorStop(0, "#1b1432");
      sky.addColorStop(0.55, "#8a4848");
      sky.addColorStop(1, "#f2a060");
    } else {
      sky.addColorStop(0, "#7fa3c8");
      sky.addColorStop(1, "#dfe7ee");
    }
    x.fillStyle = sky;
    x.fillRect(0, 0, W, H);
    for (let layer = 0; layer < 4; layer++) {
      let bx = -20;
      const base = H * (0.55 + layer * 0.14);
      while (bx < W) {
        const bw = 40 + r() * 160;
        const bh = 120 + r() * (520 - layer * 90);
        const tone = variant === "day" ? 90 + layer * 18 : 14 + layer * 6;
        x.fillStyle = `rgb(${tone},${tone + 4},${tone + 14})`;
        x.fillRect(bx, base - bh, bw, bh + H);
        for (let wy = base - bh + 10; wy < H; wy += 14) {
          for (let wx = bx + 6; wx < bx + bw - 6; wx += 11) {
            const lit = variant === "night" ? 0.35 : variant === "dusk" ? 0.2 : 0.03;
            if (r() < lit) {
              x.fillStyle = r() < 0.85 ? "rgba(255,205,130,0.95)" : "rgba(170,210,255,0.9)";
              x.fillRect(wx, wy, 5, 7);
            }
          }
        }
        bx += bw + r() * 10;
      }
    }
  });
}

/** Silhouette de collègue (derrière la porte dépolie). */
export function silhouette(): THREE.CanvasTexture {
  return make("silhouette", 256, 512, (x, W, H) => {
    x.clearRect(0, 0, W, H);
    x.fillStyle = "#101216";
    x.beginPath();
    x.ellipse(W / 2, H * 0.14, W * 0.13, H * 0.075, 0, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.roundRect(W * 0.22, H * 0.22, W * 0.56, H * 0.78, 40);
    x.fill();
  });
}

/** Diplôme encadré. */
export function diploma(): THREE.CanvasTexture {
  return make("diploma", 768, 560, (x, W, H) => {
    x.fillStyle = "#f3ecda";
    x.fillRect(0, 0, W, H);
    x.strokeStyle = "#8a6a26";
    x.lineWidth = 6;
    x.strokeRect(24, 24, W - 48, H - 48);
    x.textAlign = "center";
    x.fillStyle = "#2a2118";
    x.font = `italic 500 58px ${SERIF}`;
    x.fillText("Juris Doctor", W / 2, 190);
    x.font = `400 26px ${SERIF}`;
    x.fillText("conféré avec toutes les prérogatives attachées à ce grade", W / 2, 260);
    x.beginPath();
    x.arc(W / 2, 400, 52, 0, Math.PI * 2);
    x.fillStyle = "#9a1a1a";
    x.fill();
  });
}

/** Tableau abstrait (bureau d'associé). */
export function painting(): THREE.CanvasTexture {
  return make("painting", 768, 1024, (x, W, H) => {
    const r = rng(13);
    x.fillStyle = "#e8e0d0";
    x.fillRect(0, 0, W, H);
    const cols = ["#1b2a4a", "#c9a24a", "#8a2a1e", "#2a2a2a", "#d8cfbf"];
    for (let i = 0; i < 14; i++) {
      x.globalAlpha = 0.6 + r() * 0.4;
      x.fillStyle = cols[Math.floor(r() * cols.length)]!;
      x.fillRect(r() * W * 0.8, r() * H * 0.9, W * (0.1 + r() * 0.5), H * (0.02 + r() * 0.2));
    }
  });
}
