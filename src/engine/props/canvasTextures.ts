/** Textures peintes des accessoires : écran de téléphone, badge, chemise « MERIDIAN », feuilles. */
import type { PhoneScreen } from "./model";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, x: c.getContext("2d")! };
}

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";

function wrap(x: CanvasRenderingContext2D, text: string, left: number, top: number, width: number, lh: number): number {
  const words = text.split(" ");
  let line = "";
  let y = top;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (x.measureText(test).width > width && line) {
      x.fillText(line, left, y);
      line = w;
      y += lh;
    } else line = test;
  }
  if (line) x.fillText(line, left, y);
  return y + lh;
}

// ------------------------------------------------------------------ Téléphone
export function drawPhoneScreen(target: HTMLCanvasElement, s: PhoneScreen, progress = 0): void {
  const x = target.getContext("2d")!;
  const W = target.width;
  const H = target.height;
  x.clearRect(0, 0, W, H);
  if (s.mode === "off") {
    x.fillStyle = "#020203";
    x.fillRect(0, 0, W, H);
    return;
  }
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0b1a33");
  g.addColorStop(0.6, "#1d1030");
  g.addColorStop(1, "#070a12");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  x.fillStyle = "rgba(255,255,255,0.92)";
  x.textAlign = "center";
  if (s.mode === "lock") {
    x.font = `300 ${W * 0.26}px ${SANS}`;
    x.fillText(s.time, W / 2, H * 0.24);
    x.font = `400 ${W * 0.05}px ${SANS}`;
    x.fillStyle = "rgba(255,255,255,0.7)";
    x.fillText(s.date, W / 2, H * 0.3);
    if (s.sms) {
      const top = H * 0.4;
      x.fillStyle = "rgba(255,255,255,0.16)";
      x.beginPath();
      x.roundRect(W * 0.05, top, W * 0.9, H * 0.17, W * 0.05);
      x.fill();
      x.textAlign = "left";
      x.fillStyle = "rgba(255,255,255,0.6)";
      x.font = `500 ${W * 0.04}px ${SANS}`;
      x.fillText("MESSAGES · maintenant", W * 0.1, top + H * 0.035);
      x.fillStyle = "#fff";
      x.font = `600 ${W * 0.055}px ${SANS}`;
      x.fillText(s.sms.from, W * 0.1, top + H * 0.075);
      x.font = `400 ${W * 0.05}px ${SANS}`;
      wrap(x, s.sms.text, W * 0.1, top + H * 0.11, W * 0.8, W * 0.065);
    }
  } else {
    x.font = `500 ${W * 0.055}px ${SANS}`;
    x.fillStyle = "rgba(255,255,255,0.6)";
    x.fillText("Messagerie vocale", W / 2, H * 0.14);
    x.fillStyle = "#fff";
    x.font = `600 ${W * 0.08}px ${SANS}`;
    x.fillText(s.from, W / 2, H * 0.22);
    // Forme d'onde + progression.
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.37));
      const done = i / n < progress;
      x.fillStyle = done ? "#e7c878" : "rgba(255,255,255,0.35)";
      const bw = (W * 0.8) / n;
      const bh = H * 0.12 * a;
      x.fillRect(W * 0.1 + i * bw + 1, H * 0.42 - bh / 2, bw - 2, bh);
    }
    const t = Math.round(progress * s.duration);
    x.font = `400 ${W * 0.05}px ${SANS}`;
    x.fillStyle = "rgba(255,255,255,0.7)";
    x.fillText(`0:${String(t).padStart(2, "0")} / 0:${String(s.duration).padStart(2, "0")}`, W / 2, H * 0.52);
    x.beginPath();
    x.arc(W / 2, H * 0.68, W * 0.1, 0, Math.PI * 2);
    x.fillStyle = "rgba(255,255,255,0.15)";
    x.fill();
    x.fillStyle = "#fff";
    x.fillRect(W / 2 - W * 0.035, H * 0.68 - W * 0.04, W * 0.025, W * 0.08);
    x.fillRect(W / 2 + W * 0.01, H * 0.68 - W * 0.04, W * 0.025, W * 0.08);
  }
}

export function phoneCanvas(): HTMLCanvasElement {
  return canvas(540, 1170).c;
}

// ------------------------------------------------------------------ Badge
export interface BadgeInfo {
  firstName: string;
  lastName: string;
  photo: CanvasImageSource | null;
  id: string;
}

/** Recto du badge (vertical, format CR80, 54 × 86 mm). */
export function drawBadgeFront(info: BadgeInfo): HTMLCanvasElement {
  const W = 540;
  const H = 860;
  const { c, x } = canvas(W, H);
  const r = 40;
  x.beginPath();
  x.roundRect(0, 0, W, H, r);
  x.clip();
  x.fillStyle = "#f6f3ec";
  x.fillRect(0, 0, W, H);
  // Bandeau.
  const g = x.createLinearGradient(0, 0, 0, 200);
  g.addColorStop(0, "#0b1426");
  g.addColorStop(1, "#16223a");
  x.fillStyle = g;
  x.fillRect(0, 0, W, 200);
  x.fillStyle = "#c9a24a";
  x.fillRect(0, 200, W, 8);
  // Fente de lanière.
  x.fillStyle = "#05070c";
  x.beginPath();
  x.roundRect(W / 2 - 60, 30, 120, 22, 11);
  x.fill();
  x.textAlign = "center";
  x.fillStyle = "#e2c173";
  x.font = `600 46px ${SERIF}`;
  x.fillText("HARLOW & VANCE", W / 2, 118);
  x.font = `400 20px ${SERIF}`;
  x.fillStyle = "rgba(226,193,115,0.8)";
  x.fillText("A T T O R N E Y S   A T   L A W", W / 2, 158);
  // Photo.
  const px = W / 2 - 130;
  const py = 250;
  x.fillStyle = "#d8d2c6";
  x.fillRect(px - 6, py - 6, 272, 332);
  if (info.photo) x.drawImage(info.photo, px, py, 260, 320);
  // Nom.
  x.fillStyle = "#0b1426";
  x.font = `600 50px ${SERIF}`;
  const first = info.firstName || "—";
  x.fillText(first, W / 2, 648);
  x.font = `700 38px ${SANS}`;
  x.fillText((info.lastName || "").toUpperCase(), W / 2, 700);
  x.font = `600 22px ${SANS}`;
  x.fillStyle = "#8a6a26";
  x.fillText("STAGIAIRE  ·  ÉTAGES 44 – 52", W / 2, 746);
  // Code-barres + numéro.
  let bx = 90;
  let seed = info.id.split("").reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
  x.fillStyle = "#111";
  while (bx < W - 90) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const w = 2 + (seed % 5);
    if (seed % 3) x.fillRect(bx, 772, w, 50);
    bx += w + 2;
  }
  x.font = `500 18px ${SANS}`;
  x.fillStyle = "#444";
  x.fillText(info.id, W / 2, 845);
  // Hologramme (reflets irisés simulés).
  const holo = x.createLinearGradient(W - 150, 560, W - 40, 640);
  holo.addColorStop(0, "rgba(255,120,200,0.25)");
  holo.addColorStop(0.5, "rgba(120,255,230,0.3)");
  holo.addColorStop(1, "rgba(255,230,120,0.25)");
  x.fillStyle = holo;
  x.beginPath();
  x.arc(W - 70, 600, 38, 0, Math.PI * 2);
  x.fill();
  return c;
}

export function drawBadgeBack(): HTMLCanvasElement {
  const W = 540;
  const H = 860;
  const { c, x } = canvas(W, H);
  x.beginPath();
  x.roundRect(0, 0, W, H, 40);
  x.clip();
  x.fillStyle = "#ece8df";
  x.fillRect(0, 0, W, H);
  x.fillStyle = "#16223a";
  x.fillRect(0, H - 120, W, 120);
  x.fillStyle = "#05070c";
  x.beginPath();
  x.roundRect(W / 2 - 60, 30, 120, 22, 11);
  x.fill();
  x.fillStyle = "#333";
  x.font = `400 24px ${SERIF}`;
  x.textAlign = "center";
  wrap(x, "Ce badge est la propriété de Harlow & Vance LLP. Il doit être porté de manière visible dans les étages 44 à 52.", W / 2, 360, W - 120, 34);
  x.fillStyle = "#c9a24a";
  x.font = `600 28px ${SERIF}`;
  x.fillText("H & V", W / 2, H - 50);
  return c;
}

// ------------------------------------------------------------------ Chemise « MERIDIAN »
export function drawFolderCover(): HTMLCanvasElement {
  const W = 768;
  const H = 1024;
  const { c, x } = canvas(W, H);
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#dcbc80");
  g.addColorStop(1, "#c9a466");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // Fibres du papier kraft.
  for (let i = 0; i < 600; i++) {
    x.fillStyle = `rgba(90,60,20,${Math.random() * 0.06})`;
    x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 30, 1);
  }
  x.fillStyle = "#3a2a14";
  x.font = `600 30px ${SANS}`;
  x.fillText("HARLOW & VANCE LLP — DOSSIER N° 2026-117", 60, 110);
  x.font = `700 92px ${SERIF}`;
  x.fillText("MERIDIAN", 60, 260);
  x.font = `400 36px ${SERIF}`;
  x.fillText("Logistics Inc. — Fonds de pension des chauffeurs", 60, 320);
  // Tampon CONFIDENTIEL.
  x.save();
  x.translate(W * 0.58, H * 0.68);
  x.rotate(-0.22);
  x.strokeStyle = "rgba(170,20,20,0.8)";
  x.lineWidth = 8;
  x.strokeRect(-250, -70, 500, 140);
  x.fillStyle = "rgba(170,20,20,0.8)";
  x.font = `800 72px ${SANS}`;
  x.textAlign = "center";
  x.fillText("CONFIDENTIEL", 0, 26);
  x.restore();
  return c;
}

const SHEETS = [
  {
    title: "BILAN CONSOLIDÉ AU 31 DÉCEMBRE",
    rows: [
      ["Immobilisations corporelles (flotte)", "1 842,6"],
      ["Stocks", "412,9"],
      ["Créances clients", "688,3"],
      ["Trésorerie", "96,1"],
      ["Total actif", "3 039,9"],
      ["Capitaux propres", "1 107,4"],
      ["Dettes financières", "1 390,2"],
      ["Fournisseurs", "542,3"],
    ],
  },
  {
    title: "COMPTE DE RÉSULTAT CONSOLIDÉ",
    rows: [
      ["Chiffre d'affaires", "2 311,7"],
      ["Variation vs N-1", "+13,7 %"],
      ["Achats consommés", "(1 402,5)"],
      ["Dotations aux amortissements", "(118,4)"],
      ["Résultat opérationnel", "261,0"],
      ["Résultat net", "164,8"],
    ],
  },
  {
    title: "NOTE 7 — IMMOBILISATIONS",
    rows: [
      ["Durée d'amortissement des camions", "9 ans"],
      ["(N-1 : 5 ans)", ""],
      ["Impact sur le résultat", "+71,2"],
      ["Contrat Halvorsen — reconnu au", "28/12"],
      ["Partie liée : Orca Partners", "voir note 19"],
    ],
  },
  {
    title: "NOTE 19 — PARTIES LIÉES",
    rows: [
      ["Orca Partners LLC", ""],
      ["Prestations facturées", "38,6"],
      ["Administrateur commun", "oui"],
      ["Stocks : variation", "+38 %"],
    ],
  },
];

export const SHEET_COUNT = SHEETS.length;

export function drawSheet(i: number): HTMLCanvasElement {
  const W = 768;
  const H = 1024;
  const { c, x } = canvas(W, H);
  x.fillStyle = "#fbf8f1";
  x.fillRect(0, 0, W, H);
  const sheet = SHEETS[i % SHEETS.length]!;
  x.fillStyle = "#1a1a1a";
  x.font = `700 20px ${SANS}`;
  x.fillText("MERIDIAN LOGISTICS INC. — ÉTATS FINANCIERS (en millions de dollars)", 50, 70);
  x.font = `700 34px ${SERIF}`;
  x.fillText(sheet.title, 50, 140);
  x.fillStyle = "#c9a24a";
  x.fillRect(50, 160, W - 100, 3);
  x.font = `400 26px ${SERIF}`;
  sheet.rows.forEach(([label, value], k) => {
    const y = 220 + k * 62;
    x.fillStyle = k % 2 ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0)";
    x.fillRect(50, y - 38, W - 100, 56);
    x.fillStyle = "#1a1a1a";
    x.textAlign = "left";
    x.fillText(label ?? "", 60, y);
    x.textAlign = "right";
    x.fillText(value ?? "", W - 60, y);
  });
  x.textAlign = "left";
  x.fillStyle = "rgba(0,0,0,0.35)";
  x.font = `400 18px ${SANS}`;
  x.fillText(`Page ${i + 1}`, W - 130, H - 40);
  return c;
}
