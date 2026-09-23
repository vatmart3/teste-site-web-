#!/usr/bin/env python3
"""
Textures PBR procédurales (licence : les nôtres) → public/textures/*.webp
Bois (noyer, chêne, stratifié), plâtre, liège, cuir, papier, métal brossé, moquette, marbre noir veiné d'or.

Chaque texture « tileable » est construite par bruit spectral (FFT) : le bruit obtenu est naturellement
périodique, donc sans raccord visible quand on la répète.

    python3 tools/make-textures.py          # (numpy + pillow)
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "textures"
rng = np.random.default_rng(2026)


# ---------------------------------------------------------------------------- outils
def spectral(h: int, w: int, beta: float, stretch=(1.0, 1.0), seed: int | None = None) -> np.ndarray:
    """Bruit fractal périodique (spectre en 1/f^beta), anisotrope si stretch != (1, 1). Sortie ∈ [0, 1]."""
    g = np.random.default_rng(seed) if seed is not None else rng
    white = g.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None] * h
    fx = np.fft.fftfreq(w)[None, :] * w
    f = np.sqrt((fx * stretch[0]) ** 2 + (fy * stretch[1]) ** 2)
    f[0, 0] = 1
    spec = np.fft.fft2(white) / f ** beta
    spec[0, 0] = 0
    n = np.real(np.fft.ifft2(spec))
    n -= n.min()
    return n / max(n.max(), 1e-9)


def normal_from_height(hgt: np.ndarray, strength: float) -> np.ndarray:
    dx = (np.roll(hgt, -1, axis=1) - np.roll(hgt, 1, axis=1)) * strength
    dy = (np.roll(hgt, -1, axis=0) - np.roll(hgt, 1, axis=0)) * strength
    nz = np.ones_like(hgt)
    n = np.stack([-dx, dy, nz], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return (n * 0.5 + 0.5)


def worley(h: int, w: int, cells: int, seed: int) -> tuple[np.ndarray, np.ndarray]:
    """Bruit cellulaire périodique : (F1, F2 - F1), normalisés par la taille de cellule."""
    g = np.random.default_rng(seed)
    cy, cx = cells, int(cells * w / h)
    pts = g.random((cy, cx, 2))
    yy, xx = np.mgrid[0:h, 0:w]
    u = xx / w * cx
    v = yy / h * cy
    iu, iv = np.floor(u).astype(int), np.floor(v).astype(int)
    f1 = np.full((h, w), 9.0)
    f2 = np.full((h, w), 9.0)
    for oy in (-1, 0, 1):
        for ox in (-1, 0, 1):
            ju, jv = iu + ox, iv + oy
            p = pts[jv % cy, ju % cx]
            d = np.sqrt((ju + p[..., 0] - u) ** 2 + (jv + p[..., 1] - v) ** 2)
            f2 = np.where(d < f1, f1, np.minimum(f2, d))
            f1 = np.minimum(f1, d)
    return f1, f2 - f1


def mix(a, b, t):
    t = np.clip(t, 0, 1)[..., None] if np.ndim(t) == 2 else t
    return a * (1 - t) + b * t


def rgb(hexs: str) -> np.ndarray:
    hexs = hexs.lstrip("#")
    return np.array([int(hexs[i : i + 2], 16) / 255 for i in (0, 2, 4)])


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def save(name: str, arr: np.ndarray, quality=86):
    a = np.clip(arr, 0, 1)
    if a.ndim == 3 and a.shape[-1] == 1:
        a = a[..., 0]
    if a.ndim == 2:
        a = np.repeat(a[..., None], 3, axis=-1)
    Image.fromarray((a * 255 + 0.5).astype(np.uint8)).save(OUT / f"{name}.webp", "WEBP", quality=quality, method=6)
    print(f"  {name}.webp")


# ---------------------------------------------------------------------------- bois
def warp_sample(img: np.ndarray, dx: np.ndarray, dy: np.ndarray) -> np.ndarray:
    """Échantillonnage bilinéaire périodique de img aux positions (x + dx, y + dy) (en pixels)."""
    h, w = img.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    x = xx + dx
    y = yy + dy
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx = x - x0
    fy = y - y0
    x0 %= w
    y0 %= h
    x1 = (x0 + 1) % w
    y1 = (y0 + 1) % h
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x1] * fx * (1 - fy) + img[y1, x0] * (1 - fx) * fy + img[y1, x1] * fx * fy)


def wood(name: str, light: str, dark: str, ring_px: float, contrast: float, pores: float, rough: float, planks=5, h=1024, w=2048, seed=1):
    """
    Placage « débit sur dosse » : chaque lame coupe des cernes cylindriques (axe de l'arbre ≈ x) par un plan,
    ce qui dessine les arches caractéristiques. Les cernes sont déformés par un bruit lent le long du fil.
    """
    g = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    wobble = (spectral(h, w, 2.2, (10.0, 1.0), seed) - 0.5) * 2  # lent le long de x
    wobble2 = (spectral(h, w, 1.6, (4.0, 1.0), seed + 1) - 0.5) * 2
    streak = spectral(h, w, 1.0, (30.0, 1.0), seed + 2)  # fil très fin, étiré en x
    pores_n = spectral(h, w, 0.3, (60.0, 1.0), seed + 3)
    tone = np.zeros((h, w))
    plank_id = np.minimum((yy / h * planks).astype(int), planks - 1)
    plank_shift = np.zeros((h, w))
    for k in range(planks):
        m = plank_id == k
        y_c = (k + 0.5) / planks * h + g.uniform(-0.3, 0.3) * h / planks  # moelle (en projection)
        depth = g.uniform(0.15, 0.6) * ring_px * 6  # distance du plan de coupe à la moelle
        tilt = g.uniform(-0.05, 0.05)  # l'axe de l'arbre n'est pas parfaitement parallèle
        dy = yy - y_c + wobble * ring_px * 1.4 + wobble2 * ring_px * 0.5
        dz = depth + (xx - w / 2) * tilt
        r = np.sqrt(dy ** 2 + dz ** 2) / ring_px + g.uniform(0, 1)
        # Largeur de cerne irrégulière : la fréquence varie doucement.
        r += (spectral(h, w, 2.8, (6.0, 1.0), seed + 10 + k) - 0.5) * 1.5
        ring = r - np.floor(r)
        late = smooth(0.62, 0.97, ring)
        tone[m] = late[m]
        plank_shift[m] = g.uniform(-0.08, 0.08)
    t = tone * contrast + (streak - 0.5) * 0.45 + plank_shift
    pore = smooth(0.8, 0.93, pores_n) * pores * (0.4 + tone * 0.6)
    col = mix(rgb(light)[None, None], rgb(dark)[None, None], np.clip(t + pore * 0.7, 0, 1))
    patch = spectral(h, w, 2.8, (3.0, 1.0), seed + 5)[..., None]
    col *= 0.9 + patch * 0.2
    # Joints entre les lames.
    seam = np.zeros((h, w))
    for k in range(1, planks):
        seam += np.exp(-((yy - k * h / planks) ** 2) / 2.0)
    col *= (1 - seam[..., None] * 0.55)
    height = 0.5 - tone * 0.12 - pore * 0.5 - seam * 0.6 + (streak - 0.5) * 0.04
    save(f"{name}_albedo", col)
    save(f"{name}_normal", normal_from_height(height, 2.0), 90)
    save(f"{name}_rough", rough + pore * 0.22 + (streak - 0.5) * 0.06 + seam * 0.3)


# ---------------------------------------------------------------------------- autres matériaux
def plaster(s=1024):
    hgt = spectral(s, s, 2.3, seed=11) * 0.55 + spectral(s, s, 1.2, seed=12) * 0.45
    mott = spectral(s, s, 2.6, seed=13)
    save("plaster_albedo", 0.86 + (mott - 0.5)[..., None] * np.array([0.08, 0.075, 0.07]) + (hgt - 0.5)[..., None] * 0.04)
    save("plaster_normal", normal_from_height(hgt, 1.6), 90)
    save("plaster_rough", 0.88 + (hgt - 0.5) * 0.1)


def cork(s=1024):
    f1, edge = worley(s, s, 70, 21)
    gran = smooth(0.0, 0.5, f1)
    speck = spectral(s, s, 0.4, seed=22)
    tone = np.clip(gran * 0.5 + (speck - 0.5) * 0.9, 0, 1)
    col = mix(rgb("#b88a55")[None, None], rgb("#6e4a26")[None, None], tone)
    dark_bits = smooth(0.8, 0.95, speck)[..., None]
    col = col * (1 - dark_bits * 0.5)
    save("cork_albedo", col)
    save("cork_normal", normal_from_height(1 - gran * 0.6 - dark_bits[..., 0] * 0.4, 3.5), 90)


def leather(s=1024):
    f1, edge = worley(s, s, 60, 31)
    crease = 1 - smooth(0.0, 0.12, edge)
    bump = smooth(0.0, 0.7, f1)
    micro = spectral(s, s, 0.8, seed=32)
    big = spectral(s, s, 2.0, seed=33)
    crease = crease * (0.35 + big * 0.65)
    hgt = 0.6 - crease * 0.3 + (1 - bump) * 0.22 + (micro - 0.5) * 0.1
    save("leather_normal", normal_from_height(hgt, 3.0), 90)
    save("leather_rough", 0.5 + crease * 0.3 + (micro - 0.5) * 0.12)
    save("leather_tint", 0.86 + (1 - crease) * 0.1 - (micro - 0.5) * 0.08 + (big - 0.5) * 0.1)


def paper(s=1024):
    fibers = np.zeros((s, s))
    for i, st in enumerate([(0.05, 1), (1, 0.05), (0.2, 1), (1, 0.3)]):
        fibers += spectral(s, s, 0.9, st, seed=41 + i)
    fibers /= fibers.max()
    cloud = spectral(s, s, 2.2, seed=45)
    col = rgb("#f6f2e8")[None, None] - (fibers - 0.5)[..., None] * 0.035 - (cloud - 0.5)[..., None] * np.array([0.01, 0.015, 0.03])
    save("paper_albedo", col)
    save("paper_normal", normal_from_height(fibers * 0.6 + cloud * 0.4, 1.1), 90)


def brushed(s=1024):
    streaks = spectral(s, s, 0.9, (0.004, 1.0), seed=51)
    dents = spectral(s, s, 2.5, seed=52)
    save("brushed_normal", normal_from_height(streaks * 0.8 + dents * 0.2, 1.2), 90)
    save("brushed_rough", 0.22 + (streaks - 0.5) * 0.18 + (dents - 0.5) * 0.08)


def carpet(s=1024):
    loops = spectral(s, s, 0.15, seed=61)
    wear = spectral(s, s, 2.4, seed=62)
    save("carpet_albedo", 0.55 + (loops - 0.5) * 0.35 + (wear - 0.5) * 0.12)
    save("carpet_normal", normal_from_height(loops, 4.0), 90)


def marble(s=2048):
    """Marbre noir « Portoro » : fond noir nuageux, grandes veines d'or torsadées, veines secondaires et cheveux."""
    # Champ de déformation : grandes torsions (basse fréquence) + frisures (moyenne fréquence).
    wx = (spectral(s, s, 3.0, seed=72) - 0.5) * s * 0.45 + (spectral(s, s, 2.3, seed=82) - 0.5) * s * 0.05
    wy = (spectral(s, s, 3.0, seed=73) - 0.5) * s * 0.45 + (spectral(s, s, 2.3, seed=83) - 0.5) * s * 0.05

    def ridge(beta: float, seed: int) -> np.ndarray:
        n = warp_sample(spectral(s, s, beta, seed=seed), wx, wy)
        return 1 - np.abs(n - 0.5) * 2

    r1, r2, r3, r4 = ridge(2.7, 74), ridge(2.5, 75), ridge(2.3, 76), ridge(2.2, 79)
    mask = smooth(0.3, 0.7, spectral(s, s, 3.2, seed=77))  # zones plus ou moins veinées
    main_core = smooth(0.975, 0.997, r1)
    sec_core = smooth(0.985, 0.998, r2) * (0.4 + 0.6 * mask)
    hair = np.maximum(smooth(0.992, 0.999, r3), smooth(0.994, 0.9993, r4) * 0.7) * mask
    cloud = spectral(s, s, 2.2, seed=78) - 0.5
    fog = smooth(0.55, 0.9, spectral(s, s, 2.6, seed=80)) * 0.5
    base = rgb("#0b0a0a")[None, None] + cloud[..., None] * np.array([0.05, 0.045, 0.04])
    col = mix(base, rgb("#1d1a17")[None, None], fog * 0.6)
    col = mix(col, rgb("#3a2f22")[None, None], np.clip(r1 ** 18 * 0.55 + r2 ** 20 * 0.25, 0, 1))
    col = mix(col, rgb("#b48a42")[None, None], np.clip(sec_core * 0.8 + hair * 0.55, 0, 1))
    col = mix(col, rgb("#b48a42")[None, None], main_core)
    col = mix(col, rgb("#e4d8bf")[None, None], smooth(0.993, 0.9995, r1) * 0.6)
    save("marble_albedo", col, 90)
    save("marble_rough", 0.06 + main_core * 0.18 + sec_core * 0.1 + hair * 0.05 + cloud * 0.03)

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    print("Textures →", OUT)
    wood("walnut", "#7d4d2c", "#2b160b", ring_px=15, contrast=0.85, pores=0.9, rough=0.3, planks=5, seed=1)
    wood("oak", "#c79a68", "#7a5030", ring_px=11, contrast=0.6, pores=0.8, rough=0.4, planks=6, seed=7)
    wood("laminate", "#a38a6c", "#735c44", ring_px=22, contrast=0.35, pores=0.15, rough=0.48, planks=3, seed=13)
    plaster()
    cork()
    leather()
    paper()
    brushed()
    carpet()
    marble()
