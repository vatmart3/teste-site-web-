"""
Cheveux procéduraux.

On lance des rayons depuis le centre du crâne sur une grille (azimut φ, angle polaire θ) : chaque rayon
touche le cuir chevelu, la chevelure est cette surface poussée vers l'extérieur de l'épaisseur voulue.
La grille s'arrête à la lisière (front, tempes, au-dessus des oreilles, nuque) propre à chaque coiffure ;
les coupes longues continuent verticalement (rideau). Trois coques superposées, mèches en alpha, lisière
effilée : du volume et des bords doux. UV alignés sur les mèches (u = φ, v = le long de la grille).
"""
from __future__ import annotations

import numpy as np
from PIL import Image

from geom import smoothstep, vertex_normals


def strand_texture(seed: int, W: int = 512, H: int = 512) -> Image.Image:
    """Mèches (gris + alpha) : fibres verticales irrégulières, pointes effilées en bas de tuile."""
    rng = np.random.default_rng(seed)
    img = np.zeros((H, W), np.float32)
    alpha = np.zeros((H, W), np.float32)
    for _ in range(3200):
        x = rng.uniform(0, W)
        y0 = rng.uniform(-H * 0.3, H * 0.8)
        ln = rng.uniform(0.3, 1.0) * H
        tone = rng.uniform(0.35, 1.0)
        ys = np.arange(int(max(0, y0)), int(min(H, y0 + ln)))
        if not len(ys):
            continue
        t = (ys - y0) / ln
        xs = x + np.sin(t * rng.uniform(1, 4) + rng.uniform(0, 6)) * rng.uniform(0.5, 2.5)
        for dx in (-1, 0, 1):
            xi = (np.round(xs).astype(int) + dx) % W
            k = np.clip(1 - np.abs(xs - np.round(xs) - dx), 0, 1) * (1 - t ** 4)
            img[ys, xi] = np.maximum(img[ys, xi], k * tone)
            alpha[ys, xi] = np.maximum(alpha[ys, xi], k)
    base = 0.18 + 0.82 * img
    a = np.clip(alpha * 1.6, 0, 1)
    rgba = np.stack([base, base, base, a], -1)
    return Image.fromarray((rgba * 255).astype(np.uint8), "RGBA")


STYLES = {
    # front : lisière au-dessus des yeux ; recede : golfes ; top/side/back : épaisseurs (m) ;
    # nape : nuque sous la base du crâne ; comb : direction du peigné (« back » plaqué, « side » raie, « down »).
    "short": dict(front=0.062, recede=0.01, top=0.022, side=0.007, back=0.01, nape=0.03, comb="side"),
    "slick": dict(front=0.064, recede=0.014, top=0.018, side=0.006, back=0.009, nape=0.03, comb="back"),
    "crop": dict(front=0.06, recede=0.005, top=0.009, side=0.004, back=0.005, nape=0.005, comb="down"),
    "thin": dict(front=0.085, recede=0.03, top=0.006, side=0.005, back=0.006, nape=0.0, comb="back", sparse=0.55),
    "bald": dict(front=0.2, recede=0.0, top=0.0, side=0.005, back=0.006, nape=0.0, comb="down", ring=True),
    "bun": dict(front=0.058, recede=0.0, top=0.007, side=0.006, back=0.007, nape=0.01, comb="back", bun=True),
    "bob": dict(front=0.04, recede=0.0, top=0.018, side=0.012, back=0.014, nape=0.0, comb="down", drape=0.12, fringe=True),
    "long": dict(front=0.056, recede=0.0, top=0.016, side=0.011, back=0.013, nape=0.0, comb="side", drape=0.3),
    "ponytail": dict(front=0.058, recede=0.0, top=0.008, side=0.006, back=0.008, nape=0.01, comb="back", tail=0.26),
}


def ray_hits(orig, dirs, V, T):
    """Distance le long de chaque rayon jusqu'à l'intersection la plus lointaine avec les triangles (Möller–Trumbore)."""
    v0, v1, v2 = V[T[:, 0]], V[T[:, 1]], V[T[:, 2]]
    e1, e2 = v1 - v0, v2 - v0
    out = np.full(len(dirs), np.nan)
    for i0 in range(0, len(dirs), 64):
        d = dirs[i0:i0 + 64][:, None, :]
        p = np.cross(d, e2[None])
        det = (e1[None] * p).sum(-1)
        ok = np.abs(det) > 1e-12
        inv = np.where(ok, 1 / np.where(ok, det, 1), 0)
        s = orig - v0
        u = (s[None] * p).sum(-1) * inv
        q = np.cross(s, e1)[None].repeat(len(d), 0)
        v = (d * q).sum(-1) * inv
        t = (e2[None] * q).sum(-1) * inv
        hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 0)
        tt = np.where(hit, t, -1).max(1)
        out[i0:i0 + 64] = np.where(tt > 0, tt, np.nan)
    return out


def make(c, m, vw, normals, tris, J, Wt, bones, head, world):
    style = c.get("hair")
    if not style:
        return None
    S = STYLES[style]
    seed = abs(hash(c.get("name", "x"))) % 991
    n = len(vw)
    hb = bones.index("Head")
    nb_ = bones.index("Neck1")
    headw = np.zeros(n)
    for k in range(4):
        headw += np.where(J[:, k] == hb, Wt[:, k], 0)
    eye = (vw[m.vgroups["helper-l-eye"]].mean(0) + vw[m.vgroups["helper-r-eye"]].mean(0)) / 2
    H0 = world(head["Head"])
    neck_y = world(head["Neck1"])[1]
    bodyv = vw[m.vgroups["body"]]
    top_y = bodyv[:, 1].max()
    C = np.array([0.0, eye[1] + 0.02, H0[2] - 0.01])
    # Triangles de la tête (et du cou) pour les rayons.
    from bake import mask_img

    em = mask_img("ears", 512)
    ears = np.zeros(n)
    for f, fu in zip(m.faces, m.fuv):
        for vi, ui in zip(f, fu):
            if ui >= 0:
                u, v = m.vt[ui]
                ears[vi] = max(ears[vi], em[int((1 - v) * 511), int(u * 511)])
    earbox = (np.abs(vw[:, 0]) > 0.066) & (np.abs(vw[:, 1] - (eye[1] - 0.02)) < 0.045) & (vw[:, 2] > H0[2] - 0.015) & (vw[:, 2] < H0[2] + 0.05)
    ear = (ears > 0.05) | earbox
    ht = tris[(headw[tris] > 0.05).all(1) & ~ear[tris].any(1)]

    NU = 72
    NR = 26
    phis = np.linspace(-np.pi, np.pi, NU, endpoint=False) + np.pi / NU
    thetas = np.linspace(0.02, 2.75, 110)

    def edge_y(phi):
        """Hauteur de la lisière selon l'azimut (0 = devant)."""
        a = np.abs(phi)
        front = eye[1] + S["front"] + S["recede"] * smoothstep(0.25, 0.7, a)
        temple = eye[1] + 0.015
        burn = eye[1] - 0.022
        above_ear = eye[1] + 0.028
        nape = neck_y + 0.035 - S["nape"]
        return np.interp(a, [0, 0.62, 0.95, 1.25, 1.42, 1.62, 1.85, 2.2, np.pi], [front, front + 0.004, temple, burn, burn, above_ear, above_ear - 0.03, nape + 0.012, nape])

    thick_top, thick_side, thick_back = S["top"], S["side"], S["back"]
    Pp, UV, Jn, Wn, Col, Tt = [], [], [], [], [], []
    grid = np.zeros((NU, NR, 3))
    gn = np.zeros((NU, NR, 3))
    drape_ok = np.zeros(NU, bool)
    for ui, ph in enumerate(phis):
        dirs = np.stack([np.sin(thetas) * np.sin(ph), np.cos(thetas), np.sin(thetas) * np.cos(ph)], 1)
        t = ray_hits(C, dirs, vw, ht)
        pts = C + dirs * np.nan_to_num(t)[:, None]
        valid = ~np.isnan(t)
        ey = edge_y(ph)
        keep = valid & (pts[:, 1] > ey)
        # Front : la lisière est une courbe sur le front, on s'arrête au premier point sous la lisière.
        last = np.nonzero(keep)[0]
        k_end = last.max() if len(last) else 1
        th_end = thetas[k_end]
        drape_col = S.get("drape", 0.0) and np.cos(ph) < 0.62
        if drape_col:
            # Le rideau part du point le plus large de la calotte (pas de marche).
            hr = np.where(valid, np.hypot(pts[:, 0] - C[0], pts[:, 2] - C[2]), 0)
            k_eq = int(np.argmax(np.where(thetas < 2.1, hr, 0)))
            th_end = thetas[max(k_eq, 5)]
        ths = np.linspace(0.02, th_end, NR)
        d2 = np.stack([np.sin(ths) * np.sin(ph), np.cos(ths), np.sin(ths) * np.cos(ph)], 1)
        t2 = ray_hits(C, d2, vw, ht)
        t2 = np.where(np.isnan(t2), np.nanmean(t2) if np.isfinite(np.nanmean(t2)) else 0.09, t2)
        grid[ui] = C + d2 * t2[:, None]
        gn[ui] = d2
        drape_ok[ui] = bool(drape_col)
    # Épaisseur selon la région.
    up = smoothstep(eye[1] + 0.03, top_y - 0.015, grid[..., 1])
    sidef = np.abs(np.sin(phis))[:, None] * (1 - up)
    backf = smoothstep(-0.2, -0.9, np.cos(phis))[:, None] * (1 - up)
    frontf = smoothstep(0.3, 0.9, np.cos(phis))[:, None] * (1 - up)
    thick = thick_side * sidef + thick_back * backf + thick_top * np.maximum(up, frontf * 0.8) + 0.003
    # Raie / peigné : volume un peu asymétrique.
    if S["comb"] == "side":
        thick *= 1 + 0.25 * np.clip(np.sin(phis), 0, 1)[:, None] * up
    rowt = np.linspace(0, 1, NR)[None, :].repeat(NU, 0)
    edge_fade = 1 - smoothstep(0.82, 1.0, rowt)
    if S.get("drape"):
        edge_fade[drape_ok] = 1.0

    drape = S.get("drape", 0.0)
    NDR = 12 if drape else 0

    def add_layer(k, dens, uoff, alpha_edge):
        base = len(Pp)
        rows = NR + NDR
        for ui in range(NU):
            ph = phis[ui]
            outward = np.array([np.sin(ph), 0, np.cos(ph)])
            for ri in range(NR):
                q = grid[ui, ri] + gn[ui, ri] * (thick[ui, ri] * k * (0.35 + 0.65 * edge_fade[ui, ri]) + 0.0012 * k)
                Pp.append(q)
                UV.append([ui / NU * 10 + uoff, rowt[ui, ri] * 1.6])
                Jn.append([hb, 0, 0, 0])
                Wn.append([1, 0, 0, 0])
                a = dens * (1 - alpha_edge * smoothstep(0.75, 1.0, rowt[ui, ri]) * (0 if drape else 1))
                Col.append([1, 1, 1, float(a) * S.get("sparse", 1.0)])
            if drape:
                top = np.array(Pp[-1])
                bottom = eye[1] - 0.1 if drape < 0.2 else neck_y - 0.2
                L = max(top[1] - bottom, 0.01) if drape_ok[ui] else 0.0
                for di in range(1, NDR + 1):
                    t = di / NDR
                    q = top + np.array([0, -L * t, 0]) + outward * (0.006 * k * np.sin(t * np.pi * 0.8))
                    if drape < 0.2:
                        q -= outward * 0.02 * t ** 3
                    if drape >= 0.2 and q[1] < neck_y - 0.03:
                        q[2] = min(q[2], C[2] - 0.06 - 0.04 * t)
                    Pp.append(q)
                    UV.append([ui / NU * 10 + uoff, 1.6 + t * 2.2])
                    w = smoothstep(0.0, 0.9, t) * (0.6 if drape >= 0.2 else 0.25)
                    Jn.append([hb, nb_, 0, 0])
                    Wn.append([1 - w, w, 0, 0])
                    Col.append([1, 1, 1, float(dens * (1 - 0.85 * t ** 3))])
        for ui in range(NU):
            u2 = (ui + 1) % NU
            ph = phis[ui]
            face_col = np.cos(ph) > 0.62 and np.cos(phis[u2]) > 0.62
            for ri in range(rows - 1):
                if drape and ri >= NR - 1 and not (drape_ok[ui] and drape_ok[u2]):
                    continue
                a = base + ui * rows + ri
                b = base + u2 * rows + ri
                Tt.extend([[a, a + 1, b], [b, a + 1, b + 1]])
            del face_col

    for li, (k, dens, ae) in enumerate([(0.55, 1.0, 0.6), (1.0, 0.95, 1.0), (1.3, 0.7, 1.0)]):
        add_layer(k, dens, li * 0.37, ae)

    # Chignon / queue de cheval.
    back_pt = grid[np.argmin(np.abs(np.abs(phis) - np.pi))]
    if S.get("bun"):
        bp = back_pt[np.argmin(np.abs(back_pt[:, 1] - (eye[1] - 0.0)))]
        ctr = bp + np.array([0, 0, -0.03])
        base = len(Pp)
        nu, nv = 20, 12
        for i in range(nv + 1):
            th = np.pi * i / nv
            for j in range(nu):
                ph = 2 * np.pi * j / nu
                d = np.array([np.sin(th) * np.cos(ph), np.cos(th), np.sin(th) * np.sin(ph)])
                Pp.append(ctr + d * [0.047, 0.04, 0.036])
                UV.append([j / nu * 3, i / nv * 1.5])
                Jn.append([hb, 0, 0, 0])
                Wn.append([1, 0, 0, 0])
                Col.append([1, 1, 1, 1])
        for i in range(nv):
            for j in range(nu):
                a, b = base + i * nu + j, base + i * nu + (j + 1) % nu
                Tt += [[a, b, a + nu], [b, b + nu, a + nu]]
    if S.get("tail"):
        bp = back_pt[np.argmin(np.abs(back_pt[:, 1] - (eye[1] + 0.02)))]
        start = bp + np.array([0, 0, -0.012])
        base = len(Pp)
        nu, nv = 14, 16
        L = S["tail"]
        for i in range(nv + 1):
            t = i / nv
            cp = start + np.array([0, -L * t, -0.03 * np.sin(t * np.pi * 0.9) - 0.012 * t])
            r = 0.024 * (1 - t * 0.75) + 0.005
            for j in range(nu):
                ph = 2 * np.pi * j / nu
                d = np.array([np.cos(ph), 0, np.sin(ph)])
                Pp.append(cp + d * r)
                UV.append([j / nu * 2, t * 2])
                w = smoothstep(0.1, 0.8, t) * 0.6
                Jn.append([hb, nb_, 0, 0])
                Wn.append([1 - w, w, 0, 0])
                Col.append([1, 1, 1, float(1 - 0.8 * t ** 3)])
        for i in range(nv):
            for j in range(nu):
                a, b = base + i * nu + j, base + i * nu + (j + 1) % nu
                Tt += [[a, a + nu, b], [b, a + nu, b + nu]]

    Pp = np.array(Pp, np.float64)
    Tt = np.array(Tt, np.int64)
    Nc = vertex_normals(Pp, Tt)
    bad = np.linalg.norm(Nc, axis=1) < 0.5
    Nc[bad] = [0, 1, 0]
    img = strand_texture(seed)
    return {"pos": Pp.astype(np.float32), "nrm": Nc.astype(np.float32), "uv": np.array(UV, np.float32), "tris": Tt, "joints": np.array(Jn, np.uint16), "weights": np.array(Wn, np.float32), "colors": np.array(Col, np.float32), "albedo": img, "tint": c.get("hair_color", "#2a1d15")}
