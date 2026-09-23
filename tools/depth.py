#!/usr/bin/env python3
"""
Préparation des plates 2,5D de « Billable Hours ».

Pour chaque image source de assets-src/scenes/ (PNG/JPG/WebP/AVIF sortis du générateur d'images) :
  1. export AVIF desktop (2560 px de large) + mobile (@1280) dans public/scenes/ ;
  2. carte de profondeur Depth Anything V2 → <nom>.depth.png (1024 px, niveaux de gris, blanc = proche) ;
  3. calques détourés <nom>.layer-*.png recopiés (redimensionnés comme la plate) ;
  4. boucles vidéo <nom>.mp4/.mov/.webm → WebM VP9 + MP4 H.264 < 3 Mo (si ffmpeg est installé) ;
puis régénère public/assets-manifest.json.

Installation :
    python3 -m venv tools/.venv && source tools/.venv/bin/activate
    pip install -r tools/requirements.txt

Utilisation :
    python3 tools/depth.py                      # toutes les plates
    python3 tools/depth.py 03-lobby 07-corner-office
    python3 tools/depth.py --force --smooth 3   # tout recalculer, profondeur adoucie

Licence du modèle : par défaut « Small » (Apache-2.0, utilisable dans un produit commercial).
Les modèles Base/Large sont sous CC-BY-NC-4.0 : --model large seulement pour des essais non commerciaux.
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "scenes"
OUT = ROOT / "public" / "scenes"
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".avif"}
VIDEO_EXT = {".mp4", ".mov", ".webm", ".mkv"}
MODELS = {
    "small": "depth-anything/Depth-Anything-V2-Small-hf",
    "base": "depth-anything/Depth-Anything-V2-Base-hf",
    "large": "depth-anything/Depth-Anything-V2-Large-hf",
}

DESKTOP_W = 2560
MOBILE_W = 1280
DEPTH_LONG_SIDE = 1024
VIDEO_MAX_BYTES = 3 * 1024 * 1024


def log(msg: str) -> None:
    print(f"  {msg}", flush=True)


def is_plate_source(p: Path) -> bool:
    return p.suffix.lower() in IMAGE_EXT and ".layer-" not in p.stem and not p.stem.endswith(".depth")


def resize_w(img, width: int):
    from PIL import Image

    if img.width <= width:
        return img.copy()
    h = round(img.height * width / img.width)
    return img.resize((width, h), Image.Resampling.LANCZOS)


def export_plate(src: Path, name: str, quality: int, force: bool) -> None:
    from PIL import Image

    desktop = OUT / f"{name}.avif"
    mobile = OUT / f"{name}@1280.avif"
    if not force and desktop.exists() and mobile.exists():
        log("plate AVIF déjà présente")
        return
    img = Image.open(src).convert("RGB")
    if img.width < DESKTOP_W:
        log(f"attention : {img.width} px de large (< {DESKTOP_W} recommandés)")
    resize_w(img, DESKTOP_W).save(desktop, "AVIF", quality=quality, speed=4)
    resize_w(img, MOBILE_W).save(mobile, "AVIF", quality=quality, speed=4)
    log(f"plate → {desktop.name}, {mobile.name}")


_pipe = None


def depth_pipeline(model: str):
    global _pipe
    if _pipe is None:
        import torch
        from transformers import pipeline

        device = 0 if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else -1)
        log(f"chargement de {MODELS[model]} ({'GPU' if device != -1 else 'CPU'})…")
        _pipe = pipeline("depth-estimation", model=MODELS[model], device=device)
    return _pipe


def export_depth(src: Path, name: str, model: str, smooth: int, force: bool) -> None:
    import numpy as np
    from PIL import Image, ImageFilter

    out = OUT / f"{name}.depth.png"
    if not force and out.exists():
        log("profondeur déjà présente")
        return
    img = Image.open(src).convert("RGB")
    # Inférence sur une version ~1536 px : bon compromis détail / mémoire.
    work = resize_w(img, 1536)
    result = depth_pipeline(model)(work)
    d = np.asarray(result["predicted_depth"].squeeze().cpu().numpy(), dtype=np.float32)
    # Depth Anything renvoie une profondeur relative inverse (grand = proche) : on normalise
    # en coupant les extrêmes pour exploiter toute la dynamique.
    lo, hi = np.percentile(d, 1.0), np.percentile(d, 99.5)
    d = np.clip((d - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    depth = Image.fromarray((d * 255.0 + 0.5).astype(np.uint8), mode="L")
    scale = DEPTH_LONG_SIDE / max(img.width, img.height)
    depth = depth.resize((round(img.width * scale), round(img.height * scale)), Image.Resampling.BICUBIC)
    if smooth > 0:
        # Médian : supprime le bruit sans baver sur les contours (évite l'effet « caoutchouc »).
        depth = depth.filter(ImageFilter.MedianFilter(smooth * 2 + 1))
    depth.save(out, optimize=True)
    log(f"profondeur → {out.name} ({depth.width}×{depth.height})")


def export_layers(name: str, force: bool) -> None:
    from PIL import Image

    for layer in sorted(SRC.glob(f"{name}.layer-*.png")):
        out = OUT / layer.name
        if not force and out.exists():
            continue
        img = Image.open(layer).convert("RGBA")
        resize_w(img, DESKTOP_W).save(out, optimize=True)
        log(f"calque → {out.name}")


def encode_video(src: Path, name: str, force: bool) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        log("ffmpeg introuvable : boucle vidéo ignorée")
        return
    targets = [
        (OUT / f"{name}.webm", ["-c:v", "libvpx-vp9", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2"]),
        (OUT / f"{name}.mp4", ["-c:v", "libx264", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]),
    ]
    for out, codec in targets:
        if not force and out.exists():
            continue
        # On baisse le débit jusqu'à passer sous 3 Mo (boucles de 4 à 8 s, sans audio).
        for crf in (30, 34, 38, 42):
            cmd = [ffmpeg, "-y", "-loglevel", "error", "-i", str(src), "-an", "-vf", "scale='min(1920,iw)':-2", *codec, "-crf", str(crf)]
            if out.suffix == ".webm":
                cmd += ["-b:v", "0"]
            subprocess.run([*cmd, str(out)], check=True)
            if out.stat().st_size <= VIDEO_MAX_BYTES:
                break
        log(f"vidéo → {out.name} ({out.stat().st_size / 1e6:.1f} Mo)")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("names", nargs="*", help="plates à traiter (sans extension) ; toutes par défaut")
    ap.add_argument("--model", choices=MODELS.keys(), default="small")
    ap.add_argument("--quality", type=int, default=62, help="qualité AVIF (0-100)")
    ap.add_argument("--smooth", type=int, default=1, help="rayon du filtre médian sur la profondeur (0 = aucun)")
    ap.add_argument("--force", action="store_true", help="recalcule même si les fichiers existent")
    ap.add_argument("--no-depth", action="store_true", help="n'exporte que les images")
    args = ap.parse_args()

    if args.model != "small":
        print("⚠  Ce modèle est sous licence CC-BY-NC-4.0 : pas d'usage commercial.", file=sys.stderr)

    OUT.mkdir(parents=True, exist_ok=True)
    SRC.mkdir(parents=True, exist_ok=True)
    sources = sorted(p for p in SRC.iterdir() if is_plate_source(p))
    if args.names:
        sources = [p for p in sources if p.stem in args.names]
    if not sources:
        print(f"Aucune image dans {SRC.relative_to(ROOT)} (ex. 03-lobby.png, 06a-openspace-night.png).")

    for src in sources:
        name = src.stem
        print(f"▸ {name}")
        export_plate(src, name, args.quality, args.force)
        if not args.no_depth:
            export_depth(src, name, args.model, args.smooth, args.force)
        export_layers(name, args.force)

    for vid in sorted(p for p in SRC.iterdir() if p.suffix.lower() in VIDEO_EXT):
        if args.names and vid.stem not in args.names:
            continue
        print(f"▸ {vid.stem} (vidéo)")
        encode_video(vid, vid.stem, args.force)

    subprocess.run(["node", str(ROOT / "tools" / "build-manifest.mjs")], check=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
