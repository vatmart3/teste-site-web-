"""
Cuisson des textures dans l'espace UV du corps : chaque texel connaît sa position 3D et sa normale
(rastérisation des triangles en UV), les motifs sont donc peints « sur le corps » (sourcils au-dessus des
yeux, barbe sur la mâchoire, revers de veste sur la poitrine...) quel que soit le découpage UV.
"""
from __future__ import annotations

import os

import numpy as np
from PIL import Image, ImageFilter

import mh
from geom import smoothstep

_cache: dict = {}


def raster(pos: np.ndarray, nrm: np.ndarray, tris: np.ndarray, tuv: np.ndarray, uvs: np.ndarray, size: int, extra: np.ndarray | None = None):
    """Rastérise les triangles dans l'espace UV. Rend P (H,W,3), N (H,W,3), masque (H,W), et l'attribut extra."""
    key = (id(tris), size, float(pos.sum()), None if extra is None else float(extra.sum()))
    if key in _cache:
        return _cache[key]
    H = W = size
    P = np.zeros((H, W, 3), np.float32)
    N = np.zeros((H, W, 3), np.float32)
    E = np.zeros((H, W, extra.shape[1]), np.float32) if extra is not None else None
    M = np.zeros((H, W), bool)
    uv = uvs[tuv] * [W, H]
    uv[..., 1] = H - uv[..., 1]
    for t in range(len(tris)):
        a, b, c = uv[t]
        x0, y0 = np.floor(np.minimum(np.minimum(a, b), c)).astype(int)
        x1, y1 = np.ceil(np.maximum(np.maximum(a, b), c)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0)
        x1, y1 = min(x1, W - 1), min(y1, H - 1)
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-9:
            continue
        l1 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / d
        l2 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / d
        l3 = 1 - l1 - l2
        e = -0.02
        inside = (l1 >= e) & (l2 >= e) & (l3 >= e)
        if not inside.any():
            continue
        yy, xx = np.nonzero(inside)
        yy += y0
        xx += x0
        L = np.stack([l1[inside], l2[inside], l3[inside]], 1)
        i0, i1, i2 = tris[t]
        P[yy, xx] = L @ pos[[i0, i1, i2]]
        N[yy, xx] = L @ nrm[[i0, i1, i2]]
        if E is not None:
            E[yy, xx] = L @ extra[[i0, i1, i2]]
        M[yy, xx] = True
    n = np.linalg.norm(N, axis=2, keepdims=True)
    n[n == 0] = 1
    N /= n
    out = (P, N, M, E)
    _cache[key] = out
    return out


def dilate(img: np.ndarray, mask: np.ndarray, iters: int = 8) -> np.ndarray:
    """Étend les couleurs au-delà des bords des îlots UV (évite les coutures visibles au mipmapping)."""
    img = img.copy()
    m = mask.copy()
    for _ in range(iters):
        acc = np.zeros_like(img, dtype=np.float32)
        cnt = np.zeros(m.shape, np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            sm = np.roll(np.roll(m, dy, 0), dx, 1)
            si = np.roll(np.roll(img, dy, 0), dx, 1)
            acc += si * sm[..., None] if img.ndim == 3 else si * sm
            cnt += sm
        new = (~m) & (cnt > 0)
        if img.ndim == 3:
            img[new] = acc[new] / cnt[new][:, None]
        else:
            img[new] = acc[new] / cnt[new]
        m = m | new
    return img


# --- Bruit 3D (valeur, fractal) évalué sur les positions -----------------------------------------------------

def _hash(ix, iy, iz, seed):
    h = (ix * 374761393 + iy * 668265263 + iz * 2147483647 + seed * 144665) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 65535.0


def noise3(p: np.ndarray, freq: float, seed: int = 0) -> np.ndarray:
    q = p * freq
    i = np.floor(q).astype(np.int64)
    f = q - i
    u = f * f * (3 - 2 * f)
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (u[..., 0] if dx else 1 - u[..., 0]) * (u[..., 1] if dy else 1 - u[..., 1]) * (u[..., 2] if dz else 1 - u[..., 2])
                out = out + w * _hash(i[..., 0] + dx, i[..., 1] + dy, i[..., 2] + dz, seed)
    return out


def fbm(p: np.ndarray, freq: float, octaves: int = 4, seed: int = 0) -> np.ndarray:
    a, s, tot = 1.0, 0.0, 0.0
    for o in range(octaves):
        s = s + a * noise3(p, freq * (2 ** o), seed + o * 17)
        tot += a
        a *= 0.5
    return s / tot


def hex2rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


def mask_img(name: str, size: int) -> np.ndarray:
    p = os.path.join(mh.MPFB_DATA, "textures", f"mpfb_{name}.jpg")
    im = Image.open(p).convert("L").resize((size, size), Image.BILINEAR)
    return np.asarray(im, np.float32) / 255


def height_to_normal(h: np.ndarray, strength: float) -> Image.Image:
    gy, gx = np.gradient(h)
    n = np.stack([-gx * strength, gy * strength, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8))


def pixel_noise(shape, seed, blur=0.0):
    rng = np.random.default_rng(seed)
    n = rng.random(shape).astype(np.float32)
    if blur:
        n = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur)), np.float32) / 255
    return n


# --- Peau ---------------------------------------------------------------------------------------------------

SKIN_SIZE = 2048


def skin(c: dict, m, vw, normals, tris, tuv, head, world):
    size = c.get("tex", SKIN_SIZE)
    P, N, M, _ = raster(vw, normals, tris, tuv, m.vt, size)
    seed = abs(hash(c.get("name", "x"))) % 1000
    base = hex2rgb(c.get("skin", "#c8987c"))
    # Repères du visage (mètres).
    eyeL = vw[m.vgroups["helper-l-eye"]].mean(0)
    eyeR = vw[m.vgroups["helper-r-eye"]].mean(0)
    eyeC = (eyeL + eyeR) / 2
    iod = np.linalg.norm(eyeL - eyeR)
    mouth = vw[m.vgroups["joint-mouth"]].mean(0)
    headc = world(head["Head"])
    rel = P - eyeC  # x latéral, y haut, z avant

    col = np.ones((size, size, 3), np.float32) * base
    # Variations lentes (marbrures, rougeurs) et fines (grain).
    lo = fbm(P, 9, 3, seed) - 0.5
    hi = fbm(P, 90, 2, seed + 5) - 0.5
    col *= (1 + lo[..., None] * 0.10 + hi[..., None] * 0.05)
    redden = np.array([1.05, 0.93, 0.92], np.float32)
    # Joues, nez, oreilles, articulations plus rouges.
    front = smoothstep(-0.02, 0.04, rel[..., 2])
    cheeks = np.exp(-(((np.abs(rel[..., 0]) - iod * 0.62) / 0.022) ** 2 + ((rel[..., 1] + 0.035) / 0.025) ** 2)) * front
    nose = np.exp(-((rel[..., 0] / 0.012) ** 2 + ((rel[..., 1] + 0.03) / 0.02) ** 2)) * smoothstep(0.03, 0.06, rel[..., 2])
    ears = mask_img("ears", size)
    blush = np.clip(cheeks * c.get("blush", 0.5) + nose * 0.6 + ears * 0.35, 0, 1)
    col = col + blush[..., None] * np.array([0.05, -0.012, -0.008], np.float32)
    # Paumes et plantes plus claires.
    # Lèvres.
    lips = mask_img("lips", size)
    lipcol = hex2rgb(c.get("lips", "#a8605a"))
    col = col * (1 - lips[..., None] * 0.75) + lipcol * lips[..., None] * 0.75 * (0.9 + hi[..., None] * 0.3)
    # Paupières légèrement plus sombres / fard.
    lids = mask_img("eyelids", size)
    shadow = hex2rgb(c.get("eyeshadow", "#7a5a50"))
    col = col * (1 - lids[..., None] * c.get("shadow", 0.25)) + shadow * lids[..., None] * c.get("shadow", 0.25)
    nails = mask_img("fingernails", size)
    col = col * (1 - nails[..., None] * 0.5) + np.array([0.93, 0.78, 0.74], np.float32) * col * nails[..., None] * 0.6
    inside = mask_img("inside-mouth", size)
    col = col * (1 - inside[..., None] * 0.8) + np.array([0.45, 0.16, 0.16]) * inside[..., None] * 0.8

    # Sourcils : arc au-dessus de chaque œil, poils orientés vers l'extérieur.
    brow_col = hex2rgb(c.get("brows", c.get("hair_color", "#2a1d15")))
    dens = c.get("brow_density", 0.9)
    thick = c.get("brow_thickness", 0.0055)
    brow = np.zeros(M.shape, np.float32)
    for ex in (eyeL, eyeR):
        d = P - ex
        sx = np.sign(ex[0] - eyeC[0])
        lat = d[..., 0] * sx  # vers l'extérieur
        t = (lat + iod * 0.28) / (iod * 0.62)  # 0 = intérieur, 1 = extérieur
        arch = 0.019 + 0.006 * np.sin(np.clip(t, 0, 1) * np.pi * 0.9) - 0.004 * np.clip(t - 0.7, 0, 1) * 3
        w = thick * (1.25 - 0.7 * np.clip(t, 0, 1))
        band = np.exp(-(((d[..., 1] - arch) / w) ** 2)) * smoothstep(-0.05, 0.02, t) * (1 - smoothstep(0.95, 1.1, t))
        band *= smoothstep(-0.03, 0.0, d[..., 2] + 0.02) * (P[..., 2] > eyeC[2] - 0.035)
        strands = np.clip(noise3(np.stack([P[..., 0] * 3, P[..., 1] * 0.8, P[..., 2]], -1), 900, seed + 3) * 1.6 - 0.3, 0, 1)
        brow = np.maximum(brow, band * (0.55 + 0.45 * strands) * dens)
    col = col * (1 - brow[..., None] * 0.85) + brow_col * brow[..., None] * 0.85

    # Barbe de quelques jours / barbe.
    stub = c.get("stubble", 0.0)
    if stub > 0:
        ax = np.abs(rel[..., 0])
        # Bord supérieur : pattes à hauteur d'oreille sur les côtés, descend vers les commissures.
        top = eyeC[1] - 0.05 - 0.035 * (1 - smoothstep(0.025, 0.06, ax))
        upper = smoothstep(top + 0.006, top - 0.006, P[..., 1])
        # Bord inférieur : sous la mâchoire, jusqu'au cou.
        lower = smoothstep(mouth[1] - 0.09, mouth[1] - 0.065, P[..., 1])
        side = 1 - smoothstep(0.068, 0.078, ax)
        front = smoothstep(-0.06, -0.03, P[..., 2] - headc[2])
        beard = upper * lower * side * front * np.clip(1 - lips * 1.5, 0, 1)
        must = np.exp(-(((P[..., 1] - (mouth[1] + 0.013)) / 0.007) ** 2)) * (1 - smoothstep(0.022, 0.03, ax)) * smoothstep(0.0, 0.02, rel[..., 2])
        beard = np.clip(beard + must * 0.9 * np.clip(1 - lips * 1.5, 0, 1), 0, 1)
        edge = fbm(P, 400, 2, seed + 8)
        beard *= np.clip(0.6 + edge, 0, 1)
        grain = (pixel_noise(M.shape, seed + 9) > 0.45).astype(np.float32)
        bc = hex2rgb(c.get("beard_color", c.get("hair_color", "#2a1d15")))
        amt = beard * stub * (0.5 + 0.5 * grain)
        col = col * (1 - amt[..., None] * 0.5) + bc * amt[..., None] * 0.5

    # Âge : taches, teint plus inégal.
    if c.get("age", 0.6) > 0.7:
        spots = np.clip((fbm(P, 60, 2, seed + 11) - 0.62) * 6, 0, 1) * (c["age"] - 0.7) * 2
        col *= 1 - spots[..., None] * 0.25

    col = dilate(np.clip(col, 0, 1), M, 10)
    img = Image.fromarray((col * 255).astype(np.uint8))

    # Normales de détail : pores (visage), plis légers.
    pores = pixel_noise(M.shape, seed + 21, 1.1) - 0.5
    face = mask_img("face", size)
    h = pores * (0.15 + face * 0.45) + (fbm(P, 220, 2, seed + 4) - 0.5) * 0.35
    if c.get("age", 0.6) > 0.62:
        # Rides du front et pattes d'oie.
        fore = np.exp(-(((rel[..., 1] - 0.045) / 0.02) ** 2)) * front * (np.abs(rel[..., 0]) < 0.05)
        h += np.sin(P[..., 1] * 900) * fore * (c["age"] - 0.62) * 2.5
    h = dilate(h.astype(np.float32), M, 6)
    nimg = height_to_normal(h, 0.9)
    return img, nimg


def eye_texture(c: dict) -> Image.Image:
    im = Image.open(os.path.join(mh.MH_DATA, "eyes/materials/brown_eye.png")).convert("RGB")
    a = np.asarray(im, np.float32) / 255
    H, W = a.shape[:2]
    # Deux iris : centres repérés sur la texture d'origine (brun). Teinte recolorée à la demande.
    tint = hex2rgb(c.get("eyes", "#5a3a22"))
    yy, xx = np.mgrid[0:H, 0:W] / np.array([H, W])[:, None, None]
    out = a.copy()
    for cx, cy in ((0.705, 0.30), (0.29, 0.71)):
        r = np.hypot(xx - cx, yy - cy)
        iris = smoothstep(0.125, 0.105, r) * smoothstep(0.03, 0.045, r)
        lum = a.mean(2, keepdims=True)
        rec = np.clip(lum / 0.3 * tint, 0, 1)
        out = out * (1 - iris[..., None]) + rec * iris[..., None]
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS)


def lashes() -> Image.Image:
    W, H = 256, 64
    a = np.zeros((H, W), np.float32)
    rng = np.random.default_rng(3)
    for _ in range(140):
        x = rng.uniform(0, W)
        ln = rng.uniform(0.6, 1.0) * H
        for y in range(int(ln)):
            xx = int(x + (y / H) ** 2 * rng.uniform(-6, 6))
            if 0 <= xx < W:
                a[H - 1 - y, xx] = max(a[H - 1 - y, xx], 1 - y / ln * 0.6)
    img = np.zeros((H, W, 4), np.uint8)
    img[..., :3] = 255
    img[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(img, "RGBA")
