/**
 * Manifeste des assets réellement présents dans /public (généré par `npm run assets:manifest`,
 * appelé automatiquement par tools/depth.py). Évite les requêtes 404 : si un fichier n'est pas listé,
 * le moteur utilise directement son fallback (plate procédurale, son synthétisé…).
 */
import type { LightVariant } from "@/content/types";

export interface AssetManifest {
  files: Set<string>;
}

let manifestPromise: Promise<AssetManifest> | null = null;

export function loadManifest(): Promise<AssetManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch("/assets-manifest.json", { cache: "no-cache" })
      .then((r) => (r.ok ? (r.json() as Promise<{ files?: string[] }>) : { files: [] }))
      .then((j) => ({ files: new Set(j.files ?? []) }))
      .catch(() => ({ files: new Set<string>() }));
  }
  return manifestPromise;
}

export function manifestFrom(files: string[]): AssetManifest {
  return { files: new Set(files) };
}

const IMAGE_EXT = ["avif", "webp", "jpg", "png"] as const;

function firstExisting(m: AssetManifest, candidates: string[]): string | null {
  for (const c of candidates) if (m.files.has(c)) return "/" + c;
  return null;
}

/** Nom de fichier d'une plate pour une variante de lumière (`06a-openspace-night`). */
export function plateName(sceneId: string, variant?: LightVariant): string {
  return variant && variant !== "day" ? `${sceneId}-${variant}` : sceneId;
}

export interface PlateSources {
  color: string | null;
  depth: string | null;
  video: { webm: string | null; mp4: string | null } | null;
  layers: Record<string, string | null>;
}

/**
 * Choisit les fichiers d'une plate. Ordre : variante demandée puis variante « day » ;
 * version mobile (@1280) sur petit écran, sinon desktop ; AVIF > WebP > JPG > PNG.
 */
export function resolvePlate(
  m: AssetManifest,
  sceneId: string,
  opts: { variant?: LightVariant; mobile?: boolean; layers?: string[] } = {},
): PlateSources {
  const names = [plateName(sceneId, opts.variant)];
  if (opts.variant && opts.variant !== "day") names.push(sceneId);

  for (const name of names) {
    const sizes = opts.mobile ? [`${name}@1280`, name] : [name, `${name}@1280`];
    const color = firstExisting(
      m,
      sizes.flatMap((s) => IMAGE_EXT.map((e) => `scenes/${s}.${e}`)),
    );
    if (!color) continue;
    const depth = firstExisting(m, [`scenes/${name}.depth.png`, `scenes/${sceneId}.depth.png`]);
    const webm = firstExisting(m, [`scenes/${name}.webm`]);
    const mp4 = firstExisting(m, [`scenes/${name}.mp4`]);
    const layers: Record<string, string | null> = {};
    for (const l of opts.layers ?? []) layers[l] = firstExisting(m, [`scenes/${l}.png`, `scenes/${l}.webp`]);
    return { color, depth, video: webm || mp4 ? { webm, mp4 } : null, layers };
  }
  const layers: Record<string, string | null> = {};
  for (const l of opts.layers ?? []) layers[l] = null;
  return { color: null, depth: null, video: null, layers };
}

const AUDIO_EXT = ["webm", "ogg", "mp3", "m4a", "wav"] as const;

export function resolveAudio(m: AssetManifest, name: string): string | null {
  return firstExisting(
    m,
    AUDIO_EXT.map((e) => `audio/${name}.${e}`),
  );
}

/** Vidéo d'état d'un personnage (`characters/rourke-tense.webm` + `.mp4`), ou null. */
export function resolveCharacterVideo(m: AssetManifest, id: string, state: string): { webm: string | null; mp4: string | null } | null {
  const webm = firstExisting(m, [`characters/${id}-${state}.webm`]);
  const mp4 = firstExisting(m, [`characters/${id}-${state}.mp4`]);
  return webm || mp4 ? { webm, mp4 } : null;
}

/** Portrait de joueur proposé à l'accueil (`characters/player-1.png` … `player-6.png`). */
export function resolvePlayerPortrait(m: AssetManifest, index: number): string | null {
  return firstExisting(
    m,
    IMAGE_EXT.map((e) => `characters/player-${index + 1}.${e}`),
  );
}
