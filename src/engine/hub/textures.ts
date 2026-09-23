/** Textures peintes du bureau : couvertures des affaires, écran du téléphone, plaque de porte, cartons. */
import type { CaseMeta } from "@/content/cases";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, x: c.getContext("2d")! };
}

function kraft(x: CanvasRenderingContext2D, W: number, H: number, tint = "#d7b77c") {
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, tint);
  g.addColorStop(1, "#c29f62");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  for (let i = 0; i < 500; i++) {
    x.fillStyle = `rgba(90,60,20,${Math.random() * 0.05})`;
    x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 30, 1);
  }
}

function stamp(x: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, color: string, angle = -0.2) {
  x.save();
  x.translate(cx, cy);
  x.rotate(angle);
  x.strokeStyle = color;
  x.fillStyle = color;
  x.lineWidth = size * 0.08;
  x.font = `800 ${size}px ${SANS}`;
  const w = x.measureText(text).width + size * 0.7;
  x.strokeRect(-w / 2, -size * 0.8, w, size * 1.4);
  x.textAlign = "center";
  x.fillText(text, 0, size * 0.35);
  x.restore();
}

export type CaseCoverStatus = "completed" | "available" | "soon" | "sealed";

/** Couverture d'une chemise d'affaire (768 × 1024). */
export function drawCaseCover(meta: CaseMeta, status: CaseCoverStatus, grade: string | null): HTMLCanvasElement {
  const W = 768;
  const H = 1024;
  const { c, x } = canvas(W, H);
  kraft(x, W, H);
  // Onglet coloré en haut à droite.
  x.fillStyle = meta.tab;
  x.fillRect(W * 0.62, 0, W * 0.38, 56);
  x.fillStyle = "rgba(255,255,255,0.9)";
  x.font = `700 30px ${SANS}`;
  x.fillText(`N° ${meta.number}`, W * 0.66, 40);
  x.fillStyle = "#3a2a14";
  x.font = `600 24px ${SANS}`;
  x.fillText("HARLOW & VANCE LLP — MERIDIAN", 50, 110);
  x.font = `700 70px ${SERIF}`;
  const words = meta.title.split(" ");
  let line = "";
  let y = 230;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (x.measureText(t).width > W - 100 && line) {
      x.fillText(line, 50, y);
      line = w;
      y += 80;
    } else line = t;
  }
  x.fillText(line, 50, y);
  x.font = `italic 400 34px ${SERIF}`;
  x.fillText(meta.kind, 50, y + 60);
  if (status === "completed" && grade) {
    stamp(x, grade, W * 0.7, H * 0.72, 150, grade === "S" ? "rgba(160,120,20,0.9)" : "rgba(30,90,40,0.85)", -0.15);
  } else if (status === "sealed") {
    // Scellés : ruban rouge en croix + cachet de cire.
    x.fillStyle = "rgba(150,20,20,0.9)";
    x.save();
    x.translate(W / 2, H / 2);
    x.rotate(-0.5);
    x.fillRect(-W, -30, W * 2, 60);
    x.rotate(1);
    x.fillRect(-W, -30, W * 2, 60);
    x.restore();
    x.beginPath();
    x.arc(W / 2, H / 2, 80, 0, Math.PI * 2);
    x.fillStyle = "#7a0f12";
    x.fill();
    x.fillStyle = "rgba(255,200,150,0.5)";
    x.font = `700 44px ${SERIF}`;
    x.textAlign = "center";
    x.fillText("H&V", W / 2, H / 2 + 15);
    x.textAlign = "left";
    stamp(x, "SOUS SCELLÉS", W * 0.5, H * 0.86, 56, "rgba(150,20,20,0.85)", 0.05);
  } else if (status === "soon") {
    stamp(x, "À VENIR", W * 0.68, H * 0.78, 64, "rgba(60,60,70,0.7)", -0.12);
  } else {
    stamp(x, "OUVERT", W * 0.68, H * 0.78, 64, "rgba(170,20,20,0.8)", -0.12);
  }
  return c;
}

/** Écran LCD du téléphone de bureau (256 × 96). */
export function drawPhoneLcd(target: HTMLCanvasElement, unread: number, time: string): void {
  const x = target.getContext("2d")!;
  const W = target.width;
  const H = target.height;
  x.fillStyle = "#9fb88a";
  x.fillRect(0, 0, W, H);
  x.fillStyle = "rgba(20,40,20,0.9)";
  x.font = `700 30px monospace`;
  x.fillText(time, 12, 38);
  x.font = `600 24px monospace`;
  x.fillText(unread > 0 ? `${unread} MESSAGE${unread > 1 ? "S" : ""}` : "AUCUN MESSAGE", 12, 80);
}

/** Plaque de porte en laiton gravée (1024 × 256). */
export function drawNameplate(name: string, title: string): HTMLCanvasElement {
  const W = 1024;
  const H = 256;
  const { c, x } = canvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#f0d48c");
  g.addColorStop(0.45, "#c9a24a");
  g.addColorStop(1, "#8a6a26");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // Brossage horizontal.
  for (let i = 0; i < 400; i++) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
    x.fillRect(0, Math.random() * H, W, 1);
  }
  x.strokeStyle = "rgba(90,60,20,0.6)";
  x.lineWidth = 6;
  x.strokeRect(14, 14, W - 28, H - 28);
  x.textAlign = "center";
  // Gravure : texte sombre + liseré clair décalé.
  const engrave = (t: string, y: number, font: string) => {
    x.font = font;
    x.fillStyle = "rgba(255,240,200,0.6)";
    x.fillText(t, W / 2 + 2, y + 2);
    x.fillStyle = "#2a1e0a";
    x.fillText(t, W / 2, y);
  };
  engrave(name, 128, `600 78px ${SERIF}`);
  engrave(title.toUpperCase(), 196, `500 36px ${SANS}`);
  return c;
}

/** Côté d'un carton de déménagement (512 × 512). */
export function drawBoxSide(label: string): HTMLCanvasElement {
  const { c, x } = canvas(512, 512);
  x.fillStyle = "#b88a55";
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) {
    x.fillStyle = `rgba(80,50,20,${Math.random() * 0.08})`;
    x.fillRect(0, Math.random() * 512, 512, 1);
  }
  x.fillStyle = "rgba(210,190,150,0.7)";
  x.fillRect(0, 230, 512, 52); // ruban adhésif
  x.fillStyle = "#1a1a1a";
  x.font = `700 54px 'Marker Felt', 'Comic Sans MS', ${SANS}`;
  x.textAlign = "center";
  x.save();
  x.translate(256, 380);
  x.rotate(-0.05);
  x.fillText(label, 0, 0);
  x.restore();
  return c;
}
