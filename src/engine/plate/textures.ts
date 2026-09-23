/**
 * Chargement des textures d'une plate (réelles si présentes dans le manifeste, sinon procédurales),
 * avec cache et préchargement : la scène suivante se charge pendant la scène en cours.
 */
import * as THREE from "three";
import type { SceneDef, LightVariant } from "@/content/types";
import { loadManifest, resolvePlate } from "../assets/manifest";
import { isMobileViewport } from "../device";
import { placeholderPlate } from "./placeholders";

export interface PlateTextures {
  color: THREE.Texture;
  depth: THREE.Texture;
  layers: Record<string, THREE.Texture>;
  /** Boucle vidéo (texture qui remplace `color` une fois prête). */
  video: THREE.VideoTexture | null;
  /** Sources utilisables par le fallback CSS. */
  css: { color: string; video: { webm: string | null; mp4: string | null } | null; layers: Record<string, string> };
  placeholder: boolean;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image introuvable : ${url}`));
    img.src = url;
  });
}

function colorTexture(src: HTMLImageElement | HTMLCanvasElement): THREE.Texture {
  const t = src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : new THREE.Texture(src);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function depthTexture(src: HTMLImageElement | HTMLCanvasElement): THREE.Texture {
  const t = src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : new THREE.Texture(src);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

function flatDepth(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 4;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgb(128,128,128)";
  ctx.fillRect(0, 0, 4, 4);
  return c;
}

function makeVideo(v: { webm: string | null; mp4: string | null }): THREE.VideoTexture {
  const el = document.createElement("video");
  el.muted = true;
  el.loop = true;
  el.playsInline = true;
  el.preload = "auto";
  el.crossOrigin = "anonymous";
  for (const [src, type] of [
    [v.webm, "video/webm"],
    [v.mp4, "video/mp4"],
  ] as const) {
    if (!src) continue;
    const s = document.createElement("source");
    s.src = src;
    s.type = type;
    el.appendChild(s);
  }
  const t = new THREE.VideoTexture(el);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  void el.play().catch(() => undefined);
  return t;
}

const cache = new Map<string, Promise<PlateTextures>>();

function toDataUrl(c: HTMLCanvasElement): string {
  return c.toDataURL("image/jpeg", 0.88);
}

async function build(scene: SceneDef, variant?: LightVariant): Promise<PlateTextures> {
  const manifest = await loadManifest();
  const layerNames = (scene.layers ?? []).map((l) => l.name);
  const src = resolvePlate(manifest, scene.id, { variant, mobile: isMobileViewport(), layers: layerNames });
  const ph = () => placeholderPlate(scene.id, variant);

  let color: THREE.Texture;
  let depth: THREE.Texture;
  let cssColor: string;
  let placeholder = false;
  try {
    if (!src.color) throw new Error("pas de plate");
    const img = await loadImage(src.color);
    color = colorTexture(img);
    cssColor = src.color;
    depth = depthTexture(src.depth ? await loadImage(src.depth).catch(() => flatDepth()) : flatDepth());
  } catch {
    const p = ph();
    color = colorTexture(p.color);
    depth = depthTexture(p.depth);
    cssColor = toDataUrl(p.color);
    placeholder = true;
  }

  const layers: Record<string, THREE.Texture> = {};
  const cssLayers: Record<string, string> = {};
  for (const name of layerNames) {
    const url = src.layers[name];
    if (url) {
      const img = await loadImage(url).catch(() => null);
      if (img) {
        layers[name] = colorTexture(img);
        cssLayers[name] = url;
        continue;
      }
    }
    if (placeholder) {
      const c = ph().layers[name];
      if (c) {
        layers[name] = colorTexture(c);
        cssLayers[name] = c.toDataURL("image/png");
      }
    }
  }

  const video = scene.video && src.video ? makeVideo(src.video) : null;
  return { color, depth, layers, video, css: { color: cssColor, video: scene.video ? src.video : null, layers: cssLayers }, placeholder };
}

export function loadPlateTextures(scene: SceneDef, variant?: LightVariant): Promise<PlateTextures> {
  const key = `${scene.id}|${variant ?? "day"}`;
  let p = cache.get(key);
  if (!p) {
    p = build(scene, variant).catch((err: unknown) => {
      // Un plan ne doit jamais bloquer la séquence : plate de secours unie.
      console.error(`[plate] ${scene.id} :`, err);
      return emergencyPlate();
    });
    cache.set(key, p);
  }
  return p;
}

function emergencyPlate(): PlateTextures {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 36;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 36);
  g.addColorStop(0, "#0a1426");
  g.addColorStop(1, "#05070c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 36);
  return {
    color: colorTexture(c),
    depth: depthTexture(flatDepth()),
    layers: {},
    video: null,
    css: { color: c.toDataURL(), video: null, layers: {} },
    placeholder: true,
  };
}

/** Précharge un plan sans l'afficher (appelé par le directeur pendant le plan précédent). */
export function preloadPlate(scene: SceneDef, variant?: LightVariant): void {
  void loadPlateTextures(scene, variant);
}
