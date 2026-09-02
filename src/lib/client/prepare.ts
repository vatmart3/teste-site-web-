"use client";

/**
 * Tout le travail lourd est fait dans le navigateur : HEIC → JPEG, PDF → canvas,
 * redimensionnement, compression. Le serveur ne reçoit que des JPEG légers, et
 * les fichiers d'origine ne quittent jamais l'appareil.
 */

export const MAX_PAGES = 15;
export const MAX_EDGE = 1568;
export const JPEG_QUALITY = 0.85;

export type PreparedPage = {
  id: string;
  name: string;
  mime: "image/jpeg";
  data: string; // base64 sans en-tête
  preview: string; // data URL pour la vignette
  bytes: number;
};

export type PrepareProgress = {
  done: number;
  total: number;
  label: string;
};

export class PrepareError extends Error {
  readonly hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.name = "PrepareError";
    this.hint = hint;
  }
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const HEIC_TYPES = ["image/heic", "image/heif"];

export function isAccepted(file: File): boolean {
  const type = file.type.toLowerCase();
  if (IMAGE_TYPES.includes(type) || HEIC_TYPES.includes(type) || type === "application/pdf") {
    return true;
  }
  // iOS ne renseigne pas toujours le type MIME des HEIC
  return /\.(heic|heif|jpe?g|png|webp|pdf)$/i.test(file.name);
}

export async function prepareFiles(
  files: File[],
  onProgress: (progress: PrepareProgress) => void,
  budget: number,
): Promise<PreparedPage[]> {
  const pages: PreparedPage[] = [];
  const total = files.length;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (!file) continue;
    if (pages.length >= budget) break;

    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name);

    onProgress({
      done: index,
      total,
      label: isPdf ? `Découpage de ${short(file.name)}` : `Préparation de ${short(file.name)}`,
    });

    if (isPdf) {
      const rendered = await renderPdf(file, budget - pages.length, (page, count) => {
        onProgress({ done: index, total, label: `Page ${page} sur ${count} de ${short(file.name)}` });
      });
      pages.push(...rendered);
    } else {
      pages.push(await prepareImage(file));
    }
  }

  if (pages.length === 0) {
    throw new PrepareError(
      "Aucune page exploitable dans ce que tu as déposé.",
      "Dépose une photo (JPG, PNG, HEIC) ou un PDF.",
    );
  }
  onProgress({ done: total, total, label: "Pages prêtes" });
  return pages;
}

async function prepareImage(file: File): Promise<PreparedPage> {
  let blob: Blob = file;
  const type = file.type.toLowerCase();

  if (HEIC_TYPES.includes(type) || /\.(heic|heif)$/i.test(file.name)) {
    blob = await convertHeic(file);
  }

  const bitmap = await decode(blob, file.name);
  const { canvas } = drawScaled(bitmap, MAX_EDGE);
  if ("close" in bitmap) bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mime: "image/jpeg",
    data,
    preview: dataUrl,
    bytes: Math.round(data.length * 0.75),
  };
}

async function convertHeic(file: File): Promise<Blob> {
  try {
    const { default: heic2any } = await import("heic2any");
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    return Array.isArray(result) ? (result[0] as Blob) : (result as Blob);
  } catch {
    throw new PrepareError(
      `Impossible de lire ${short(file.name)}.`,
      "Dans Réglages > Appareil photo > Formats, choisis « Le plus compatible », ou renvoie la photo en JPG.",
    );
  }
}

async function decode(blob: Blob, name: string): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // on retombe sur <img>
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(
          new PrepareError(
            `Impossible de lire ${short(name)}.`,
            "Réessaie avec un JPG ou un PNG.",
          ),
        );
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

function drawScaled(
  source: ImageBitmap | HTMLImageElement,
  maxEdge: number,
): { canvas: HTMLCanvasElement } {
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  const ratio = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new PrepareError(
      "Ton navigateur bloque le traitement des images.",
      "Réessaie dans Safari ou Chrome sans mode économie de données.",
    );
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { canvas };
}

async function renderPdf(
  file: File,
  budget: number,
  onPage: (page: number, count: number) => void,
): Promise<PreparedPage[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  } catch {
    throw new PrepareError(
      `${short(file.name)} n'a pas pu être ouvert.`,
      "S'il est protégé par un mot de passe, enlève la protection puis redépose-le.",
    );
  }

  const count = Math.min(doc.numPages, budget);
  const pages: PreparedPage[] = [];

  for (let index = 1; index <= count; index += 1) {
    onPage(index, count);
    const page = await doc.getPage(index);
    const base = page.getViewport({ scale: 1 });
    const target = Math.min(2, MAX_EDGE / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale: target });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
    pages.push({
      id: crypto.randomUUID(),
      name: `${short(file.name)} · p.${index}`,
      mime: "image/jpeg",
      data,
      preview: dataUrl,
      bytes: Math.round(data.length * 0.75),
    });
    page.cleanup();
  }

  await doc.destroy();
  return pages;
}

function short(name: string): string {
  return name.length > 26 ? `${name.slice(0, 23)}…` : name;
}

/** SHA-256 du lot, dans l'ordre. Sert de clé de cache serveur. */
export async function hashPages(pages: PreparedPage[]): Promise<string> {
  const joined = pages.map((page) => page.data).join("|");
  const bytes = new TextEncoder().encode(joined);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
