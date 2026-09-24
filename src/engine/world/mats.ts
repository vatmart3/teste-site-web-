/** Matériaux partagés de l'étage (créés une fois, à la demande : les textures n'existent que côté navigateur). */
import * as THREE from "three";
import { PBR } from "../three/pbr";

const cache = new Map<string, THREE.Material>();

function get<T extends THREE.Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined;
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m;
}

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
const phys = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);

export const MAT = {
  walnut: () => get("walnut", () => PBR.wood("walnut", { repeat: [1, 1] })),
  walnutFloor: () => get("walnutFloor", () => PBR.wood("walnut", { repeat: [3, 3], color: "#b89a86" })),
  oak: () => get("oak", () => PBR.wood("oak", { repeat: [1, 1] })),
  oakFloor: () => get("oakFloor", () => PBR.wood("oak", { repeat: [4, 4], color: "#d8c8b4" })),
  laminate: () => get("laminate", () => PBR.wood("laminate", { repeat: [1, 1], color: "#e8e4dc" })),
  whiteTop: () => get("whiteTop", () => phys({ color: "#eeece8", roughness: 0.35, clearcoat: 0.3 })),
  plaster: () => get("plaster", () => PBR.plaster({ repeat: [3, 1.2], color: "#e4e0d8" })),
  panel: () => get("panel", () => PBR.wood("walnut", { repeat: [2, 1.5], color: "#8a6a58" })),
  carpet: (c = "#343a48") => get(`carpet:${c}`, () => PBR.carpet({ repeat: [10, 10], color: c })),
  marble: () => get("marble", () => PBR.marble({ repeat: [4, 4] })),
  tile: () => get("tile", () => phys({ color: "#9aa0a6", roughness: 0.4, clearcoat: 0.2 })),
  ceiling: () => get("ceiling", () => std({ color: "#f2f1ee", roughness: 0.95 })),
  lampShade: () => get("lampShade", () => std({ color: "#efe6d4", roughness: 0.9, emissive: new THREE.Color("#ffcf90"), emissiveIntensity: 0.9 })),
  lightPanel: () => get("lightPanel", () => std({ color: "#ffffff", emissive: new THREE.Color("#fff4e2"), emissiveIntensity: 2.2 })),
  glass: () => get("glass", () => PBR.glass({ opacity: 0.12 })),
  frosted: () => get("frosted", () => phys({ color: "#eef3f6", roughness: 0.6, transparent: true, opacity: 0.55, depthWrite: false })),
  windowGlass: () => get("windowGlass", () => PBR.glass({ opacity: 0.06, color: "#dfe9f0" })),
  mullion: () => get("mullion", () => std({ color: "#2a2d33", roughness: 0.4, metalness: 0.8 })),
  chrome: () => get("chrome", () => std({ color: "#dfe3e8", roughness: 0.12, metalness: 1 })),
  steel: () => get("steel", () => PBR.steel({ repeat: [2, 2] })),
  brass: () => get("brass", () => PBR.brass()),
  blackMetal: () => get("blackMetal", () => std({ color: "#18191c", roughness: 0.35, metalness: 0.7 })),
  leather: (c = "#1c1512") => get(`leather:${c}`, () => PBR.leather({ color: c, repeat: [3, 3] })),
  fabric: (c = "#6b6e74") => get(`fabric:${c}`, () => phys({ color: c, roughness: 0.95, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(c).lerp(new THREE.Color("#ffffff"), 0.3) })),
  plastic: (c = "#222326") => get(`plastic:${c}`, () => std({ color: c, roughness: 0.5 })),
  paper: () => get("paper", () => PBR.paper()),
  leaf: (c = "#2f5a2c") => get(`leaf:${c}`, () => phys({ color: c, roughness: 0.55, side: THREE.DoubleSide, sheen: 0.3, sheenColor: new THREE.Color("#8fd070") })),
  soil: () => get("soil", () => std({ color: "#2a1d14", roughness: 1 })),
  ceramic: (c = "#e9e6df") => get(`ceramic:${c}`, () => phys({ color: c, roughness: 0.25, clearcoat: 0.6 })),
  screen: () => get("screen", () => std({ color: "#0a0e14", roughness: 0.15, metalness: 0.2, emissive: new THREE.Color("#3a6a9a"), emissiveIntensity: 0.55 })),
  screenOff: () => get("screenOff", () => std({ color: "#08090b", roughness: 0.1, metalness: 0.3 })),
  water: () => get("water", () => phys({ color: "#5aa0c0", roughness: 0.05, transparent: true, opacity: 0.35, emissive: new THREE.Color("#1a5070"), emissiveIntensity: 0.4, depthWrite: false })),
  rug: (v = 0) => get(`rug:${v}`, () => std({ map: rugTexture(v), roughness: 1 })),
  art: (v = 0) => get(`art:${v}`, () => std({ map: artTexture(v), roughness: 0.8 })),
  books: () => get("books", () => std({ map: booksTexture(), roughness: 0.85 })),
  diploma: () => get("diploma", () => std({ map: diplomaTexture(), roughness: 0.7 })),
  cork: () => get("cork", () => PBR.cork()),
};

function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
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

/** Tapis : persan (motifs concentriques) ou moderne (bandes). */
function rugTexture(v: number): THREE.CanvasTexture {
  return canvas(512, 360, (g) => {
    const r = rng(v * 13 + 5);
    if (v % 2 === 1) {
      g.fillStyle = "#6a1c1c";
      g.fillRect(0, 0, 512, 360);
      for (let i = 0; i < 9; i++) {
        g.strokeStyle = ["#c9a24a", "#1a2a4a", "#e8dcc0", "#3a0c0c"][i % 4]!;
        g.lineWidth = 6 + r() * 6;
        g.strokeRect(14 + i * 16, 14 + i * 16, 512 - 28 - i * 32, 360 - 28 - i * 32);
      }
      g.fillStyle = "#1a2a4a";
      g.beginPath();
      g.ellipse(256, 180, 90, 60, 0, 0, Math.PI * 2);
      g.fill();
      for (let k = 0; k < 900; k++) {
        g.fillStyle = `rgba(0,0,0,${r() * 0.12})`;
        g.fillRect(r() * 512, r() * 360, 2, 2);
      }
    } else {
      g.fillStyle = "#b8b2a6";
      g.fillRect(0, 0, 512, 360);
      for (let i = 0; i < 14; i++) {
        g.fillStyle = i % 3 === 0 ? "#5a6470" : "#cfc9bd";
        g.fillRect(0, i * 26 + 4, 512, 8);
      }
      for (let k = 0; k < 2500; k++) {
        g.fillStyle = `rgba(0,0,0,${r() * 0.06})`;
        g.fillRect(r() * 512, r() * 360, 2, 1);
      }
    }
  });
}

/** Toiles abstraites (originales) : aplats et coups de pinceau générés. */
function artTexture(v: number): THREE.CanvasTexture {
  return canvas(512, 384, (g) => {
    const r = rng(v * 71 + 3);
    const palettes = [
      ["#1b2a41", "#c9a24a", "#e8e1d4", "#8a2c2c"],
      ["#f0e6d8", "#2d4f6a", "#d97b4a", "#1d1d1d"],
      ["#0f1d2b", "#3e6d8a", "#b9c7cf", "#e0b24a"],
    ];
    const p = palettes[v % palettes.length]!;
    g.fillStyle = p[0]!;
    g.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = p[1 + Math.floor(r() * 3)]!;
      g.globalAlpha = 0.35 + r() * 0.55;
      if (r() < 0.5) g.fillRect(r() * 480, r() * 360, 30 + r() * 220, 8 + r() * 90);
      else {
        g.beginPath();
        g.arc(r() * 512, r() * 384, 10 + r() * 80, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  });
}

function booksTexture(): THREE.CanvasTexture {
  return canvas(512, 256, (g) => {
    const r = rng(9);
    g.fillStyle = "#1a120c";
    g.fillRect(0, 0, 512, 256);
    for (let row = 0; row < 4; row++) {
      let x = 4;
      while (x < 508) {
        const w = 8 + r() * 14;
        const h = 44 + r() * 14;
        g.fillStyle = ["#5a1c1c", "#1c2a4a", "#2a3a2a", "#6a5a3a", "#1a1a1a", "#7a6a50", "#3a2a1a"][Math.floor(r() * 7)]!;
        g.fillRect(x, row * 64 + 64 - h, w - 1, h);
        g.fillStyle = "rgba(210,180,100,0.7)";
        g.fillRect(x + 2, row * 64 + 64 - h + 8, w - 5, 2);
        x += w;
      }
    }
  });
}

function diplomaTexture(): THREE.CanvasTexture {
  return canvas(256, 320, (g) => {
    g.fillStyle = "#f3ecd8";
    g.fillRect(0, 0, 256, 320);
    g.strokeStyle = "#8a6a2a";
    g.lineWidth = 6;
    g.strokeRect(12, 12, 232, 296);
    g.fillStyle = "#2a2014";
    g.font = "bold 20px serif";
    g.textAlign = "center";
    g.fillText("JURIS DOCTOR", 128, 90);
    g.font = "14px serif";
    g.fillText("Columbia-on-Hudson", 128, 120);
    g.fillText("School of Law", 128, 140);
    g.fillStyle = "#8a1c1c";
    g.beginPath();
    g.arc(128, 240, 26, 0, Math.PI * 2);
    g.fill();
  });
}
