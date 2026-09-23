/**
 * Portraits proposés au joueur pour son badge : `characters/player-1..6.(png|webp|avif)` s'ils existent,
 * sinon six portraits stylisés peints à la volée, plus la silhouette (-1).
 */
import { loadManifest, resolvePlayerPortrait } from "../assets/manifest";

export const AVATAR_COUNT = 6;

const STYLES = [
  { bg: "#2a3346", skin: "#f0c8a8", hair: "#3a2416", hairShape: "short" },
  { bg: "#3a2e28", skin: "#8a5a3c", hair: "#140c08", hairShape: "curly" },
  { bg: "#26343a", skin: "#e8b894", hair: "#d8b060", hairShape: "long" },
  { bg: "#33283a", skin: "#c68e62", hair: "#231510", hairShape: "bun" },
  { bg: "#2f3a2e", skin: "#5a3a28", hair: "#0c0806", hairShape: "crop" },
  { bg: "#3a3326", skin: "#f3d4bc", hair: "#9a4a22", hairShape: "bob" },
] as const;

function paint(index: number, size = 256): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d")!;
  const s = size / 256;
  const st = index >= 0 ? STYLES[index % STYLES.length]! : null;
  const g = x.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, st ? st.bg : "#2a2f38");
  g.addColorStop(1, "#0e1014");
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  const skin = st ? st.skin : "#8a909a";
  const hair = st ? st.hair : "#6a707a";
  // Épaules.
  x.fillStyle = st ? "#1b2233" : "#5a606a";
  x.beginPath();
  x.ellipse(128 * s, 262 * s, 110 * s, 70 * s, 0, Math.PI, Math.PI * 2);
  x.fill();
  if (st) {
    x.fillStyle = "#e9ecf1";
    x.beginPath();
    x.moveTo(108 * s, 196 * s);
    x.lineTo(148 * s, 196 * s);
    x.lineTo(128 * s, 236 * s);
    x.fill();
  }
  // Cheveux longs derrière.
  if (st && (st.hairShape === "long" || st.hairShape === "bob")) {
    x.fillStyle = hair;
    x.beginPath();
    x.ellipse(128 * s, 128 * s, 62 * s, st.hairShape === "long" ? 92 * s : 72 * s, 0, 0, Math.PI * 2);
    x.fill();
  }
  // Cou + visage.
  x.fillStyle = skin;
  x.fillRect(112 * s, 160 * s, 32 * s, 40 * s);
  x.beginPath();
  x.ellipse(128 * s, 120 * s, 44 * s, 56 * s, 0, 0, Math.PI * 2);
  x.fill();
  const shade = x.createRadialGradient(110 * s, 105 * s, 10 * s, 128 * s, 125 * s, 70 * s);
  shade.addColorStop(0, "rgba(255,255,255,0.12)");
  shade.addColorStop(1, "rgba(0,0,0,0.25)");
  x.fillStyle = shade;
  x.beginPath();
  x.ellipse(128 * s, 120 * s, 44 * s, 56 * s, 0, 0, Math.PI * 2);
  x.fill();
  // Cheveux dessus.
  x.fillStyle = hair;
  x.beginPath();
  switch (st?.hairShape) {
    case "curly":
      for (let i = 0; i < 9; i++) x.ellipse((88 + i * 10) * s, (78 + Math.sin(i) * 6) * s, 16 * s, 16 * s, 0, 0, Math.PI * 2);
      break;
    case "bun":
      x.ellipse(128 * s, 86 * s, 46 * s, 30 * s, 0, Math.PI, Math.PI * 2);
      x.ellipse(128 * s, 56 * s, 20 * s, 18 * s, 0, 0, Math.PI * 2);
      break;
    case "crop":
      x.ellipse(128 * s, 84 * s, 44 * s, 22 * s, 0, Math.PI, Math.PI * 2);
      break;
    default:
      x.ellipse(128 * s, 86 * s, 48 * s, 34 * s, -0.1, Math.PI * 0.95, Math.PI * 2.05);
  }
  x.fill();
  if (!st) {
    x.fillStyle = "rgba(255,255,255,0.5)";
    x.font = `600 ${22 * s}px Georgia, serif`;
    x.textAlign = "center";
    x.fillText("?", 128 * s, 132 * s);
  }
  return c;
}

const cache = new Map<number, Promise<CanvasImageSource>>();

/** Image du portrait (réelle si fournie, sinon peinte). */
export function loadAvatar(index: number): Promise<CanvasImageSource> {
  let p = cache.get(index);
  if (!p) {
    p = loadManifest().then(
      (m) =>
        new Promise<CanvasImageSource>((resolve) => {
          const url = index >= 0 ? resolvePlayerPortrait(m, index) : null;
          if (!url) return resolve(paint(index));
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(paint(index));
          img.src = url;
        }),
    );
    cache.set(index, p);
  }
  return p;
}

/** URL affichable dans l'interface (formulaire d'accueil). */
export async function avatarUrl(index: number): Promise<string> {
  const img = await loadAvatar(index);
  if (img instanceof HTMLImageElement) return img.src;
  return (img as HTMLCanvasElement).toDataURL("image/jpeg", 0.9);
}
