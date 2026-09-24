"""
Vêtements tirés de la surface du corps.

Chaque pièce (veste, chemise, pantalon, chaussures) est une coque décalée le long des normales du corps,
lissée par endroits (la veste tombe au lieu de coller). Ses limites exactes (encolure en V, col, ourlets,
manches) sont des fonctions analytiques de la position 3D : la géométrie déborde de quelques centimètres et
la texture découpe le bord au texel près (alpha), ce qui donne des bords nets quel que soit le maillage.
Les sommets gardent les poids du corps : aucun passage au travers en animation. Le corps couvert est retiré.
"""
from __future__ import annotations

import numpy as np
from PIL import Image
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra

from bake import dilate, fbm, hex2rgb, raster
from geom import adjacency, laplacian, smoothstep, triangulate, unweld, vertex_normals

TEX = 1024


def lin(rgb):
    """sRGB → linéaire (facteurs de couleur glTF)."""
    return tuple(float(x) for x in np.power(np.asarray(rgb, float), 2.2))


def bone_weight(J, Wt, bones, names) -> np.ndarray:
    ids = [bones.index(n) for n in names if n in bones]
    out = np.zeros(len(J), np.float32)
    for k in range(J.shape[1]):
        out += np.where(np.isin(J[:, k], ids), Wt[:, k], 0)
    return out


def seg_t(p, a, b):
    ab = b - a
    return ((p - a) @ ab) / (ab @ ab)


def graph_dist(vw, tris, sources: np.ndarray) -> np.ndarray:
    """Distance le long de la surface (m) à l'ensemble de sommets `sources`."""
    e = np.unique(np.sort(np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]]), 1), axis=0)
    w = np.linalg.norm(vw[e[:, 0]] - vw[e[:, 1]], axis=1) + 1e-9
    n = len(vw)
    g = coo_matrix((np.concatenate([w, w]), (np.concatenate([e[:, 0], e[:, 1]]), np.concatenate([e[:, 1], e[:, 0]]))), shape=(n, n)).tocsr()
    src = np.nonzero(sources)[0]
    if len(src) == 0:
        return np.full(n, np.inf)
    return dijkstra(g, indices=src, min_only=True)


def limb_angle(p, a, b, ref):
    """Angle autour de l'axe a→b (0 dans la direction `ref`)."""
    ax = (b - a) / np.linalg.norm(b - a)
    r = ref - ax * (ref @ ax)
    r /= np.linalg.norm(r)
    s = np.cross(ax, r)
    d = p - a
    return np.arctan2(d @ s, d @ r)


def shell(vw, normals, tris, tuv, uvs, sel_tris, offset, smooth_mask=None, smooth_iters=0, shrink=False, post=None):
    """
    Coque : triangles choisis, décalés le long de la normale, lissés (sur les sommets soudés), puis dé-soudés
    selon les UV du corps (coutures respectées). Rend (sommet d'origine, UV, positions, triangles).
    """
    ts = tris[sel_tris]
    us = tuv[sel_tris]
    used = np.unique(ts)
    remap = -np.ones(len(vw), np.int64)
    remap[used] = np.arange(len(used))
    loc = remap[ts]
    pos = vw[used] + normals[used] * offset[used, None]
    if smooth_iters and smooth_mask is not None:
        nbl = adjacency(len(used), loc)
        if shrink:
            pos = laplacian(pos, nbl, smooth_iters, 0.5, smooth_mask[used])
        else:
            for _ in range(smooth_iters):
                pos = laplacian(pos, nbl, 1, 0.5, smooth_mask[used])
                pos = laplacian(pos, nbl, 1, -0.52, smooth_mask[used])
            d = ((pos - vw[used]) * normals[used]).sum(1)
            need = offset[used] * 0.75
            low = d < need
            pos[low] += normals[used][low] * (need[low] - d[low])[:, None]
    if post is not None:
        pos = post(pos, used, loc)
    vi, ui, nt = unweld(loc, us)
    return used[vi], uvs[ui], pos[vi], nt, (pos, loc, vi)


def make(c, m, vw, normals, tris, tuv, J, Wt, bones, H=None, T=None):
    style = c.get("outfit", "suit")
    n = len(vw)
    if style == "none":
        return {"hidden_tris": np.zeros(len(tris), bool), "pieces": []}
    female = c.get("gender", 1) < 0.5
    body = np.zeros(n, bool)
    body[m.vgroups["body"]] = True
    bt = tris
    seed = abs(hash(c.get("name", "x"))) % 997

    # --- Repères.
    neck_y = H["Neck"][1]
    chest = H["Spine1"]
    spine = H["Spine"]
    low_back = H["LowerBack"]
    hips = H["Hips"]
    bodyv = vw[body]
    band = bodyv[(np.abs(bodyv[:, 0]) < 0.03) & (np.abs(bodyv[:, 1] - chest[1]) < 0.03)]
    cz = (band[:, 2].max() + band[:, 2].min()) / 2
    crotch = bodyv[(np.abs(bodyv[:, 0]) < 0.015) & (bodyv[:, 1] < hips[1])][:, 1].min()
    ankle_y = (H["LeftFoot"][1] + H["RightFoot"][1]) / 2
    knee_y = (H["LeftLeg"][1] + H["RightLeg"][1]) / 2
    waist = low_back[1] - 0.015

    # --- Attributs par sommet : parties du corps, position le long de l'avant-bras, coordonnée « tissu ».
    arm = bone_weight(J, Wt, bones, ["LeftArm", "LeftForeArm", "LeftHand", "LeftFingerBase", "LeftHandFinger1", "LThumb", "RightArm", "RightForeArm", "RightHand", "RightFingerBase", "RightHandFinger1", "RThumb"])
    hand = bone_weight(J, Wt, bones, ["LeftHand", "RightHand", "LeftFingerBase", "RightFingerBase", "LeftHandFinger1", "RightHandFinger1", "LThumb", "RThumb"])
    leg = bone_weight(J, Wt, bones, ["LeftUpLeg", "RightUpLeg", "LeftLeg", "RightLeg", "LeftFoot", "RightFoot", "LeftToeBase", "RightToeBase"])
    foot = bone_weight(J, Wt, bones, ["LeftFoot", "RightFoot", "LeftToeBase", "RightToeBase"])
    headw = bone_weight(J, Wt, bones, ["Head", "Neck1"])
    t_arm = np.zeros(n)
    ufab = np.arctan2(vw[:, 0], vw[:, 2] - cz) * 0.16
    for s, side in (("Left", vw[:, 0] > 0), ("Right", vw[:, 0] <= 0)):
        t_arm = np.where(side, seg_t(vw, H[f"{s}ForeArm"], H[f"{s}Hand"]), t_arm)
        isarm = side & (arm > 0.5)
        ang = limb_angle(vw, H[f"{s}Arm"], H[f"{s}Hand"], np.array([0, 1.0, 0]))
        ufab = np.where(isarm, ang * 0.05, ufab)
        isleg = side & (leg > 0.5)
        ang = limb_angle(vw, H[f"{s}UpLeg"], H[f"{s}Foot"], np.array([-np.sign(H[f"{s}UpLeg"][0]), 0, 0.0]))
        ufab = np.where(isleg, ang * 0.075, ufab)
    attrs = np.stack([arm, hand, leg, foot, headw, t_arm, ufab], 1).astype(np.float32)
    P, N, M, E = raster(vw, normals, bt, tuv, m.vt, TEX, attrs)

    def fields(p, a):
        return {"x": p[..., 0], "y": p[..., 1], "z": p[..., 2], "arm": a[..., 0], "hand": a[..., 1], "leg": a[..., 2], "foot": a[..., 3], "head": a[..., 4], "t": a[..., 5], "u": a[..., 6]}

    FV = fields(vw, attrs)
    FT = fields(P, E)

    # --- Régions analytiques (fonctionnent sur sommets et sur texels).
    robe = style == "robe"
    yV = spine[1] + (0.03 if not female else 0.0) + c.get("v_depth", 0.0) + (0.1 if robe else 0.0)
    y_top = neck_y + 0.012
    vw_top = 0.085 if not female else 0.1
    hem = crotch + (0.015 if not female else 0.09) + c.get("hem", 0.0)
    sleeve = c.get("sleeve", 0.88)

    def is_front(f):
        return f["z"] > cz

    def v_open(f):
        w = np.clip((f["y"] - yV) / (y_top - yV), 0, 1.3) * vw_top
        return is_front(f) & (np.abs(f["x"]) < w) & (f["y"] > yV) & (f["arm"] < 0.5)

    def torso(f):
        return (f["arm"] < 0.5) & (f["leg"] < 0.5) & (f["y"] < neck_y + 0.09)

    def neck_angle(f):
        return np.arctan2(f["x"], f["z"] - (H["Neck"][2]))

    def jacket_r(f):
        back = np.where(is_front(f), 0.0, 0.03 * smoothstep(0.9, 2.2, np.abs(neck_angle(f))))
        top = f["y"] < neck_y + 0.004 + back
        t = torso(f) | ((f["leg"] >= 0.5) & (f["y"] > hem))
        return ((t & (f["y"] > hem)) | ((f["arm"] >= 0.5) & (f["t"] < sleeve) & (f["hand"] < 0.35))) & top & ~v_open(f)

    def collar_top(f):
        th = np.abs(neck_angle(f))
        notch = 0.05 * smoothstep(0.55, 0.0, th)
        return neck_y + 0.05 - notch

    def shirt_r(f):
        t = torso(f) & (f["y"] > hips[1] - 0.06)
        a = (f["arm"] >= 0.5) & (f["t"] < sleeve + 0.075) & (f["hand"] < 0.35)
        top = f["y"] < (collar_top(f) if style != "blouse" else neck_y + 0.004)
        scoop = is_front(f) & (np.abs(f["x"]) < 0.06 * smoothstep(neck_y - 0.09, neck_y, f["y"])) & (f["y"] > neck_y - 0.09)
        return (t | a) & top & ~(scoop & (style == "blouse" or female))

    def pants_r(f):
        return (f["y"] < waist) & (f["y"] > ankle_y - 0.02) & (f["arm"] < 0.5) & ((f["foot"] < 0.6) | (f["y"] > ankle_y))

    def shoes_r(f):
        return (f["y"] < ankle_y + 0.03) & (f["leg"] > 0.5)

    def tube(kind):
        """Manches et jambes de pantalon tubulaires (le tissu ne suit pas chaque muscle)."""
        if kind == "leg":
            chain = lambda s: [H[f"{s}UpLeg"], H[f"{s}Leg"], H[f"{s}Foot"]]  # noqa: E731
            prof = lambda a: np.interp(a, [0, 0.25, 0.55, 1.0], [0.0, 0.085, 0.074, 0.068])  # noqa: E731
            wkey = leg
        else:
            chain = lambda s: [H[f"{s}Arm"], H[f"{s}ForeArm"], H[f"{s}Hand"]]  # noqa: E731
            sr = 1.45 if robe else 1.0
            prof = lambda a: np.interp(a, [0, 0.2, 0.5, 1.0], [0.0, 0.062 * sr, 0.057 * sr, 0.05 * sr])  # noqa: E731
            wkey = arm

        def post(pos, used, loc):
            out = pos.copy()
            for s, sgn in (("Left", 1), ("Right", -1)):
                a, b, cc = chain(s)
                sel = np.nonzero((np.sign(vw[used, 0]) == sgn) & (wkey[used] > 0.5))[0]
                if not len(sel):
                    continue
                p = out[sel]
                best_d = np.full(len(sel), np.inf)
                best_q = np.zeros_like(p)
                best_a = np.zeros(len(sel))
                l1, l2 = np.linalg.norm(b - a), np.linalg.norm(cc - b)
                for (s0, s1, a0, a1) in ((a, b, 0, l1 / (l1 + l2)), (b, cc, l1 / (l1 + l2), 1.0)):
                    d = s1 - s0
                    t = np.clip(((p - s0) @ d) / (d @ d), 0, 1)
                    q = s0 + t[:, None] * d
                    dist = np.linalg.norm(p - q, axis=1)
                    better = dist < best_d
                    best_d = np.where(better, dist, best_d)
                    best_q[better] = q[better]
                    best_a = np.where(better, a0 + t * (a1 - a0), best_a)
                r = p - best_q
                rl = np.linalg.norm(r, axis=1)
                target = np.maximum(rl, prof(best_a))
                k = smoothstep(0.02, 0.18, best_a)
                out[sel] = best_q + r / np.maximum(rl, 1e-6)[:, None] * (rl + (target - rl) * k)[:, None]
            return out

        return post

    has_jacket = style in ("suit", "skirt", "robe") and c.get("jacket", True)
    has_pants = style in ("suit", "casual", "shirt")
    has_skirt = style in ("skirt", "robe")
    if robe:
        c = {**c, "skirt_len": c.get("skirt_len", 0.78), "skirt": c.get("suit")}

    pieces = []
    hidden_cov = np.zeros(n, bool)

    def rgba(col, alpha):
        col = dilate(np.clip(col, 0, 1), M, 8)
        a = dilate(alpha.astype(np.float32), M, 8)
        img = np.concatenate([col, a[..., None]], 2)
        return Image.fromarray((img * 255).astype(np.uint8), "RGBA")

    def geometry(region_v, margin, off, smooth=None, iters=0, shrink=False, post=None):
        near = graph_dist(vw, bt, body & region_v) <= margin
        cov_t = (near[bt].all(1)) & body[bt].all(1)
        o, uv, p, tr, (wp, wt, vi) = shell(vw, normals, bt, tuv, m.vt, cov_t, off, smooth, iters, shrink, post)
        pn = vertex_normals(wp, wt)[vi]
        return o, uv, p, pn, tr

    def piece(name, o, uv, p, pn, tr, img, rough, kind, extras=None, double=True, color=(1, 1, 1, 1), alpha=True):
        pieces.append({"name": name, "pos": p.astype(np.float32), "nrm": pn.astype(np.float32), "uv": uv.astype(np.float32), "tris": tr, "joints": J[o], "weights": Wt[o], "albedo": img, "rough": rough, "kind": kind, "double": double, "extras": extras or {}, "color": color, "alpha": alpha})

    def fabric(base, pat, f):
        col = np.ones(f["x"].shape + (3,), np.float32) * base
        g = fbm(np.stack([f["x"], f["y"], f["z"]], -1), 160, 2, seed) - 0.5
        col *= 1 + g[..., None] * 0.07
        u = f["u"]
        if pat == "pinstripe":
            s = np.abs(((u / 0.0125) % 1) - 0.5)
            col = col + smoothstep(0.07, 0.0, s)[..., None] * 0.055
        elif pat == "chalk":
            s = np.abs(((u / 0.02) % 1) - 0.5)
            col = col + smoothstep(0.09, 0.0, s)[..., None] * 0.04
        elif pat == "check":
            s1 = np.abs(((u / 0.028) % 1) - 0.5)
            s2 = np.abs(((f["y"] / 0.028) % 1) - 0.5)
            col = col + (smoothstep(0.05, 0.0, s1) + smoothstep(0.05, 0.0, s2))[..., None] * 0.035
        return col

    suit = hex2rgb(c.get("suit", "#2b2f38"))
    pattern = c.get("pattern", "plain")

    # --- Veste.
    if has_jacket:
        reg = jacket_r(FV)
        x, y = FV["x"], FV["y"]
        off = np.where(FV["arm"] > 0.5, 0.012, 0.015).astype(np.float32)
        lowf = smoothstep(chest[1] - 0.05, hem, y) * (FV["arm"] < 0.5)
        off = off + lowf * 0.014
        # Col de la veste : roulé plus épais autour du cou (il recouvre le col de chemise).
        off = off + smoothstep(neck_y - 0.06, neck_y, y) * (FV["arm"] < 0.5) * 0.008
        # Poitrine lissée (la veste ne marque pas le corps), bas du dos et ventre aussi.
        chestf = smoothstep(yV - 0.1, yV + 0.05, y) * smoothstep(neck_y, neck_y - 0.06, y) * is_front(FV) * (FV["arm"] < 0.5)
        smooth = np.clip(lowf + chestf * (1.0 if female else 0.5) + 0.15, 0, 1).astype(np.float32)
        o, uv, p, pn, tr = geometry(reg, 0.03, off, smooth, 14, post=tube("arm"))
        f = FT
        col = fabric(suit, pattern, f)
        alpha = jacket_r(f)
        # Revers : ton un peu plus clair, bord piqué ; cran du revers.
        w = np.clip((f["y"] - yV) / (y_top - yV), 0, 1.3) * vw_top
        lapel = is_front(f) & (np.abs(f["x"]) >= w) & (np.abs(f["x"]) < w + 0.06) & (f["y"] > yV - 0.01)
        col = np.where(lapel[..., None], col * 1.08, col)
        edge = is_front(f) & (np.abs(np.abs(f["x"]) - w) < 0.0022) & (f["y"] > yV - 0.01)
        col = np.where(edge[..., None], col * 0.6, col)
        lap_out = is_front(f) & (np.abs(np.abs(f["x"]) - w - 0.06) < 0.0015) & (f["y"] > yV - 0.01) & (f["y"] < neck_y - 0.03)
        col = np.where(lap_out[..., None], col * 0.72, col)
        # Fermeture sous le V (légèrement évasée), boutons.
        below = is_front(f) & (f["y"] < yV) & (f["arm"] < 0.5)
        closing = below & (np.abs(f["x"] - 0.004) < 0.0015 + (yV - f["y"]) * 0.0)
        col = np.where(closing[..., None], col * 0.5, col)
        buttons = [yV - 0.012, yV - 0.112] if not female else [yV - 0.015]
        for by in buttons:
            d = np.hypot(f["x"] + 0.012, f["y"] - by)
            btn = below & (d < 0.0095)
            col = np.where(btn[..., None], hex2rgb(c.get("buttons", "#16120f")) * (1 + 0.5 * smoothstep(0.005, 0.0, d))[..., None], col)
            col = np.where((below & (np.abs(d - 0.0095) < 0.0013))[..., None], col * 0.5, col)
        # Poches à rabat, poche poitrine (+ pochette).
        py = hem + 0.11
        flap = is_front(f) & (np.abs(f["x"]) > 0.07) & (np.abs(f["x"]) < 0.19) & (f["arm"] < 0.5)
        col = np.where((flap & (np.abs(f["y"] - (py - 0.028)) < 0.0017))[..., None], col * 0.5, col)
        col = np.where((flap & (np.abs(f["y"] - py) < 0.0013))[..., None], col * 0.72, col)
        col = np.where((flap & (f["y"] < py) & (f["y"] > py - 0.028))[..., None], col * 0.96, col)
        bpy = chest[1] + 0.005
        bp = is_front(f) & (f["x"] > 0.055) & (f["x"] < 0.155) & (f["arm"] < 0.5)
        col = np.where((bp & (np.abs(f["y"] - bpy) < 0.0015))[..., None], col * 0.5, col)
        if c.get("pocket_square"):
            sq = bp & (f["x"] > 0.07) & (f["x"] < 0.13) & (f["y"] > bpy) & (f["y"] < bpy + 0.024 - np.abs(f["x"] - 0.1) * 0.5)
            col = np.where(sq[..., None], hex2rgb(c["pocket_square"]), col)
        # Coutures latérales et d'emmanchure, ombre aux bords.
        ang = np.abs(np.arctan2(f["x"], f["z"] - cz))
        col = np.where(((np.abs(ang - 1.55) < 0.01) & (f["arm"] < 0.5))[..., None], col * 0.78, col)
        col = np.where(((f["arm"] >= 0.5) & (np.abs(f["t"] - sleeve) < 0.02))[..., None], col * 0.8, col)
        piece("Jacket", o, uv, p, pn, tr, rgba(col, alpha), 0.8, "wool", {"sheen": 0.6})
        hidden_cov |= reg

    # --- Chemise / chemisier.
    if style != "none":
        reg = shirt_r(FV)
        if has_jacket:
            jd = graph_dist(vw, bt, body & ~jacket_r(FV))
            reg_geo = reg & ((~jacket_r(FV)) | (jd < 0.04))
        else:
            reg_geo = reg
        off = np.full(n, 0.0045, np.float32)
        th = np.abs(neck_angle(FV))
        coll = (FV["y"] > neck_y - 0.02) & (FV["arm"] < 0.5)
        under = jacket_r(FV) if has_jacket else np.zeros(n, bool)
        off = np.where(under & ~coll, 0.003, off + coll * (0.004 + 0.004 * smoothstep(0.3, 1.5, th))).astype(np.float32)
        chestf = smoothstep(yV - 0.1, yV + 0.05, FV["y"]) * is_front(FV) * (FV["arm"] < 0.5) * smoothstep(neck_y - 0.02, neck_y - 0.08, FV["y"])
        smooth = np.clip(chestf * (1.0 if female else 0.3), 0, 1).astype(np.float32)
        o, uv, p, pn, tr = geometry(reg_geo, 0.02, off, smooth, 8)
        f = FT
        sc = hex2rgb(c.get("shirt", "#e9ecef"))
        col = np.ones(f["x"].shape + (3,), np.float32) * sc
        col *= 1 + (fbm(P, 380, 2, seed + 2)[..., None] - 0.5) * 0.04
        if c.get("shirt_pattern") == "stripe":
            s = np.abs(((f["u"] / 0.006) % 1) - 0.5)
            col = np.where((s < 0.12)[..., None], col * np.array([0.75, 0.83, 0.97]), col)
        ct = collar_top(f)
        # Col : bande légèrement ombrée, bord, pointe du col.
        cb = (f["y"] > ct - 0.035) & (f["arm"] < 0.5)
        col = np.where(cb[..., None], col * 0.97, col)
        col = np.where(((np.abs(f["y"] - (ct - 0.035)) < 0.0015) & (f["arm"] < 0.5) & (f["y"] > neck_y - 0.03))[..., None], col * 0.8, col)
        if not female and style != "blouse":
            pl = is_front(f) & (np.abs(f["x"]) < 0.0012) & (f["y"] < neck_y - 0.01) & (f["arm"] < 0.5)
            col = np.where(pl[..., None], col * 0.84, col)
        # Poignets.
        col = np.where(((f["arm"] >= 0.5) & (np.abs(f["t"] - (sleeve + 0.045)) < 0.0015))[..., None], col * 0.82, col)
        piece("Shirt", o, uv, p, pn, tr, rgba(col, shirt_r(f)), 0.6, "cotton", {"sheen": 0.3})
        hidden_cov |= reg

    # --- Pantalon.
    if has_pants:
        reg = pants_r(FV)
        y = FV["y"]
        lowf = smoothstep(knee_y + 0.1, ankle_y, y)
        off = (0.012 + lowf * 0.014).astype(np.float32)
        crotchf = smoothstep(0.1, 0.0, np.abs(FV["x"])) * smoothstep(crotch + 0.08, crotch - 0.12, y)
        seat = (~is_front(FV)) * smoothstep(waist, crotch, y) * smoothstep(crotch - 0.1, crotch, y)
        smooth = np.clip(crotchf + seat + lowf * 0.8 + 0.25, 0, 1).astype(np.float32)
        o, uv, p, pn, tr = geometry(reg, 0.025, off, smooth, 14, post=tube("leg"))
        f = FT
        pc = hex2rgb(c.get("pants", c.get("suit", "#2b2f38")))
        col = fabric(pc, pattern if "pants" not in c else "plain", f)
        for s in ("Left", "Right"):
            kx = H[f"{s}Leg"][0]
            crease = (np.abs(f["x"] - kx) < 0.0022) & (f["z"] > H[f"{s}Leg"][2]) & (f["y"] < crotch - 0.03) & (f["leg"] > 0.5)
            col = np.where(crease[..., None], col * 1.18, col)
        belt = (f["y"] > waist - 0.034) & (f["y"] < waist - 0.002)
        col = np.where(belt[..., None], hex2rgb(c.get("belt", "#1b1310")), col)
        piece("Pants", o, uv, p, pn, tr, rgba(col, pants_r(f)), 0.82, "wool", {"sheen": 0.5})
        hidden_cov |= reg & (FV["y"] > ankle_y + 0.02)

    # --- Jupe crayon (géométrie d'aide MakeHuman « skirt »).
    if has_skirt:
        all_t, all_u = triangulate(m.faces, m.fuv)
        gname = np.array(m.groups)[np.repeat(m.fgroup, [len(fc) - 2 for fc in m.faces])]
        st, su = all_t[gname == "helper-skirt"], all_u[gname == "helper-skirt"]
        ybot = waist - c.get("skirt_len", 0.55)
        keep = (vw[st][:, :, 1] > ybot).all(1)
        st, su = st[keep], su[keep]
        sn = vertex_normals(vw, st)
        vi, ui, nt = unweld(st, su)
        pos = vw[vi] + sn[vi] * 0.007
        col = lin(hex2rgb(c.get("skirt", c.get("suit", "#2b2f38"))))
        pieces.append({"name": "Skirt", "pos": pos.astype(np.float32), "nrm": sn[vi].astype(np.float32), "uv": m.vt[ui].astype(np.float32), "tris": nt, "joints": J[vi], "weights": Wt[vi], "albedo": None, "rough": 0.78, "kind": "wool", "double": True, "extras": {"sheen": 0.5}, "color": (*col, 1.0), "alpha": False})
        hidden_cov |= body & (FV["y"] < waist) & (FV["y"] > ybot + 0.04) & (FV["arm"] < 0.5)

    # --- Chaussures : chaque sommet du pied est projeté sur l'enveloppe convexe du pied (plus d'orteils,
    # voûte comblée), puis légèrement lissé ; semelle plate.
    collar_front = 0.045 if female else ankle_y + 0.03
    collar_back = 0.075 if female else ankle_y + 0.03

    def shoes_r2(f):
        zc = np.where(f["x"] > 0, H["LeftFoot"][2], H["RightFoot"][2])
        lim = np.where(f["z"] > zc + 0.03, collar_front, collar_back)
        return (f["y"] < lim) & (f["leg"] > 0.5)

    def hull_post(pos, used, loc):
        from scipy.spatial import ConvexHull

        out = pos.copy()
        base = vw[used]
        nrm = normals[used]
        for sgn in (1, -1):
            sel = np.nonzero(np.sign(base[:, 0]) == sgn)[0]
            if len(sel) < 10:
                continue
            h = ConvexHull(base[sel])
            A, b = h.equations[:, :3], h.equations[:, 3]
            p, nn = base[sel], nrm[sel]
            an = nn @ A.T
            dist = -(p @ A.T + b)
            t = np.where(an > 1e-4, dist / np.maximum(an, 1e-4), np.inf).min(1)
            t = np.where(np.isfinite(t), t, 0)
            out[sel] = p + nn * (t + 0.006)[:, None]
        nbl = adjacency(len(used), loc)
        for _ in range(6):
            out = laplacian(out, nbl, 1, 0.5, None)
            out = laplacian(out, nbl, 1, -0.52, None)
        out[:, 1] = np.maximum(out[:, 1], 0.0)
        out[out[:, 1] < 0.014, 1] = 0.0
        return out

    reg = shoes_r2(FV)
    o, uv, p, pn, tr = geometry(reg, 0.0, np.zeros(n, np.float32), post=hull_post)
    f = FT
    sh = hex2rgb(c.get("shoes", "#140f0c"))
    col = np.ones(f["x"].shape + (3,), np.float32) * sh
    col = np.where((f["y"] < 0.02)[..., None], sh * 0.5 + np.array([0.06, 0.04, 0.03]), col)
    img = Image.fromarray((dilate(np.clip(col, 0, 1), M, 8) * 255).astype(np.uint8)).resize((512, 512))
    piece("Shoes", o, uv, p, pn, tr, img, 0.3, "leather", {"clearcoat": 0.8}, double=True, alpha=False)
    hidden_cov |= reg & (FV["y"] < (0.03 if female else ankle_y + 0.02))

    if c.get("tie") and not female:
        pieces.append(tie(c, vw, normals, J, Wt, cz, neck_y, yV, waist, collar_top(FV)))

    far = graph_dist(vw, bt, body & ~hidden_cov)
    hidden = (hidden_cov[bt].all(1)) & (far[bt].min(1) > 0.015)
    return {"hidden_tris": hidden, "pieces": pieces}


def tie(c, vw, normals, J, Wt, cz, neck_y, yV, waist, ctop):
    """Cravate : ruban posé sur la chemise, du nœud à la ceinture, pointe en bas."""
    body_front = (np.abs(vw[:, 0]) < 0.02) & (np.arange(len(vw)) < 13380)
    fv = np.nonzero(body_front)[0]
    knot_y = neck_y + 0.012
    ys = np.linspace(knot_y - 0.03, waist + 0.02, 36)
    pts, near = [], []
    for yy in ys:
        sel = fv[np.abs(vw[fv, 1] - yy) < 0.012]
        if not len(sel):
            sel = fv[np.argsort(np.abs(vw[fv, 1] - yy))[:6]]
        k = sel[np.argmax(vw[sel, 2])]
        pts.append([0.0, yy, vw[k, 2]])
        near.append(k)
    pts = np.array(pts)
    pts[:, 2] += np.where(ys > yV, 0.012, 0.009)
    # Pas de creux : la cravate tombe tendue sur le ventre.
    for _ in range(40):
        pts[1:-1, 2] = np.maximum(pts[1:-1, 2], (pts[:-2, 2] + pts[2:, 2]) / 2)
    width = np.interp(ys, [ys[-1], ys[-1] + 0.12, ys[0]], [0.082, 0.078, 0.04])
    Pp, UV, Jn, Wn = [], [], [], []
    for i, (p, w) in enumerate(zip(pts, width)):
        for s in (-1, 1):
            Pp.append(p + [s * w / 2, 0, -0.002])
            UV.append([(s + 1) / 2, i / (len(pts) - 1) * 0.9])
            Jn.append(J[near[i]])
            Wn.append(Wt[near[i]])
    tip = pts[-1] + [0, -0.04, 0]
    Pp.append(tip)
    UV.append([0.5, 0.95])
    Jn.append(J[near[-1]])
    Wn.append(Wt[near[-1]])
    Tt = []
    for i in range(len(pts) - 1):
        a, b, cc, d = 2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 3
        Tt += [[a, cc, b], [b, cc, d]]
    last = len(Pp) - 1
    Tt += [[2 * (len(pts) - 1), last, 2 * (len(pts) - 1) + 1]]
    # Nœud : tronc de pyramide (large en haut), bombé.
    kn = np.array([0.0, knot_y - 0.005, pts[0, 2] + 0.004])
    base = len(Pp)
    for dy, w in ((0.016, 0.046), (-0.026, 0.026)):
        for s in (-1, 1):
            for fz in (-0.004, 0.012):
                Pp.append(kn + [s * w / 2, dy, fz])
                UV.append([0.5 + s * 0.2, 0.97])
                Jn.append(J[near[0]])
                Wn.append(Wt[near[0]])

    def q(a, b, cc, d):
        return [[base + a, base + b, base + cc], [base + a, base + cc, base + d]]

    # indices : ((haut,bas) × (gauche,droite) × (arrière,avant)) → h*4 + s*2 + f
    Tt += q(1, 3, 7, 5) + q(0, 1, 5, 4) + q(3, 2, 6, 7) + q(0, 2, 3, 1)
    Pp = np.array(Pp, np.float64)
    Tt = np.array(Tt, np.int64)
    Nn = vertex_normals(Pp, Tt)
    Nn[np.linalg.norm(Nn, axis=1) < 0.5] = [0, 0, 1]
    W, Hh = 128, 512
    uu, vv = np.meshgrid(np.linspace(0, 1, W), np.linspace(0, 1, Hh))
    base_c = hex2rgb(c.get("tie", "#6a1b22"))
    col = np.ones((Hh, W, 3), np.float32) * base_c
    pat = c.get("tie_pattern", "stripe")
    if pat == "stripe":
        s = ((uu * 0.08 + vv * 0.5) / 0.02) % 1
        col = np.where((s < 0.16)[..., None], col * 0.5 + hex2rgb(c.get("tie2", "#c9a24a")) * 0.5, col)
    elif pat == "dots":
        d = np.hypot(((uu * 7) % 1) - 0.5, ((vv * 40) % 1) - 0.5)
        col = np.where((d < 0.16)[..., None], hex2rgb(c.get("tie2", "#d8d0c0")), col)
    col *= 0.94 + 0.06 * np.sin(uu * np.pi)[..., None]
    img = Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8))
    return {"name": "Tie", "pos": Pp.astype(np.float32), "nrm": Nn.astype(np.float32), "uv": np.array(UV, np.float32), "tris": Tt, "joints": np.array(Jn), "weights": np.array(Wn), "albedo": img, "rough": 0.35, "kind": "silk", "double": True, "extras": {"sheen": 1.0}, "color": (1, 1, 1, 1), "alpha": False}
