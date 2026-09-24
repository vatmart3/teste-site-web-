"""
Accès aux données MakeHuman (CC0) : maillage de base hm08, cibles de morphologie, squelette CMU et poids.

Les données viennent de deux dépôts publics (tous deux CC0 pour les données) :
  - makehumancommunity/makehuman  (makehuman/data : maillage, yeux, cibles)
  - makehumancommunity/mpfb2      (src/mpfb/data : squelettes, poids, cibles d'expression, masques)
Chemins configurables par MH_DATA et MPFB_DATA.
"""
from __future__ import annotations

import gzip
import json
import os
from dataclasses import dataclass, field
from functools import lru_cache

import numpy as np

MH_DATA = os.environ.get("MH_DATA", "/home/user/makehumancommunity/makehuman/makehuman/data")
MPFB_DATA = os.environ.get("MPFB_DATA", "/tmp/claude-0/mpfb2/src/mpfb/data")

# Unités MakeHuman : décimètres.
UNIT = 0.1


@dataclass
class BaseMesh:
    v: np.ndarray  # (N,3) positions (dm)
    vt: np.ndarray  # (T,2) UV
    faces: list  # liste de listes d'indices de sommets
    fuv: list  # indices UV par face
    fgroup: np.ndarray  # groupe par face (index dans groups)
    groups: list
    vgroups: dict = field(default_factory=dict)  # nom -> tableau d'indices de sommets


@lru_cache(None)
def base_mesh() -> BaseMesh:
    v, vt, faces, fuv, fg, groups = [], [], [], [], [], []
    cur = -1
    with open(os.path.join(MH_DATA, "3dobjs/base.obj")) as f:
        for line in f:
            if line.startswith("v "):
                v.append([float(x) for x in line.split()[1:4]])
            elif line.startswith("vt "):
                vt.append([float(x) for x in line.split()[1:3]])
            elif line.startswith("g "):
                name = line.split()[1]
                if name not in groups:
                    groups.append(name)
                cur = groups.index(name)
            elif line.startswith("f "):
                a, b = [], []
                for tok in line.split()[1:]:
                    p = tok.split("/")
                    a.append(int(p[0]) - 1)
                    b.append(int(p[1]) - 1 if len(p) > 1 and p[1] else -1)
                faces.append(a)
                fuv.append(b)
                fg.append(cur)
    m = BaseMesh(np.array(v), np.array(vt), faces, fuv, np.array(fg), groups)
    for gi, name in enumerate(groups):
        idx = sorted({i for fi, fc in enumerate(faces) if fg[fi] == gi for i in fc})
        m.vgroups[name] = np.array(idx, dtype=np.int64)
    return m


def _read_target(path: str) -> tuple[np.ndarray, np.ndarray]:
    opener = gzip.open if path.endswith(".gz") else open
    idx, d = [], []
    with opener(path, "rt") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            p = line.split()
            idx.append(int(p[0]))
            d.append([float(p[1]), float(p[2]), float(p[3])])
    return np.array(idx, dtype=np.int64), np.array(d)


@lru_cache(None)
def target(name: str) -> tuple[np.ndarray, np.ndarray]:
    """Cible par nom relatif (sans extension), cherchée dans MPFB puis MakeHuman."""
    for root in (os.path.join(MPFB_DATA, "targets"), os.path.join(MH_DATA, "targets")):
        for ext in (".target.gz", ".target"):
            p = os.path.join(root, name + ext)
            if os.path.exists(p):
                return _read_target(p)
    raise FileNotFoundError(name)


def find_target(short: str) -> str:
    """Retrouve le chemin relatif d'une cible à partir de son nom court (ex. « nose-hump-incr »)."""
    for root in (os.path.join(MPFB_DATA, "targets"),):
        for dp, _, fs in os.walk(root):
            for f in fs:
                if f.startswith(short + ".target"):
                    return os.path.relpath(os.path.join(dp, f), root).split(".target")[0]
    raise FileNotFoundError(short)


# --- Macro-modificateurs (même logique que MakeHuman) --------------------------------------------------------

def _two(v: float, lo: str, mid: str, hi: str) -> dict:
    """Curseur 0..1 à trois paliers (min / moyen / max) : poids de chaque palier."""
    if v < 0.5:
        return {lo: 1 - v * 2, mid: v * 2}
    return {mid: 1 - (v - 0.5) * 2, hi: (v - 0.5) * 2}


def macro_weights(gender: float, age: float, muscle: float, weight: float, height: float, proportions: float, race: dict) -> dict:
    """
    Poids des cibles « universal », « race » et « height/proportions » pour une silhouette donnée.
    age : 0.5 = 25 ans, 1 = 90 ans (adultes uniquement ici).
    """
    g = {"female": 1 - gender, "male": gender}
    a = {"young": 1 - (age - 0.5) * 2, "old": (age - 0.5) * 2} if age >= 0.5 else {"child": 1 - (age - 0.1875) / 0.3125, "young": (age - 0.1875) / 0.3125}
    mu = _two(muscle, "minmuscle", "averagemuscle", "maxmuscle")
    we = _two(weight, "minweight", "averageweight", "maxweight")
    out: dict = {}
    for gk, gv in g.items():
        for ak, av in a.items():
            for mk, mv in mu.items():
                for wk, wv in we.items():
                    base = gv * av * mv * wv
                    if base < 1e-4:
                        continue
                    out[f"macrodetails/universal-{gk}-{ak}-{mk}-{wk}"] = base
                    if height < 0.5:
                        out[f"macrodetails/height/{gk}-{ak}-{mk}-{wk}-minheight"] = base * (0.5 - height) * 2
                    elif height > 0.5:
                        out[f"macrodetails/height/{gk}-{ak}-{mk}-{wk}-maxheight"] = base * (height - 0.5) * 2
                    if proportions > 0.5:
                        out[f"macrodetails/proportions/{gk}-{ak}-{mk}-{wk}-idealproportions"] = base * (proportions - 0.5) * 2
                    elif proportions < 0.5:
                        out[f"macrodetails/proportions/{gk}-{ak}-{mk}-{wk}-uncommonproportions"] = base * (0.5 - proportions) * 2
            for rk, rv in race.items():
                if gv * av * rv > 1e-4:
                    out[f"macrodetails/{rk}-{gk}-{ak}"] = gv * av * rv
    return out


def apply_targets(v: np.ndarray, weights: dict) -> np.ndarray:
    out = v.copy()
    for name, w in weights.items():
        if abs(w) < 1e-5:
            continue
        try:
            idx, d = target(name)
        except FileNotFoundError:
            continue
        if len(idx):
            out[idx] += d * w
    return out


# --- Squelette ------------------------------------------------------------------------------------------------

@lru_cache(None)
def rig_def(name: str = "cmu_mb") -> dict:
    return json.load(open(os.path.join(MPFB_DATA, f"rigs/standard/rig.{name}.json")))


@lru_cache(None)
def rig_weights(name: str = "cmu_mb") -> dict:
    return json.load(open(os.path.join(MPFB_DATA, f"rigs/standard/weights.{name}.json")))["weights"]


def joint_pos(m: BaseMesh, v: np.ndarray, spec: dict) -> np.ndarray:
    if spec["strategy"] == "CUBE":
        return v[m.vgroups[spec["cube_name"]]].mean(0)
    return v[np.array(spec["vertex_indices"])].mean(0)


def skeleton(m: BaseMesh, v: np.ndarray, name: str = "cmu_mb") -> tuple[list, dict, dict, dict]:
    """Os ordonnés parents d'abord, parent, tête et queue (dm)."""
    rd = rig_def(name)
    order: list = []

    def visit(b):
        if b in order:
            return
        p = rd[b]["parent"]
        if p:
            visit(p)
        order.append(b)

    for b in rd:
        visit(b)
    parent = {b: rd[b]["parent"] or None for b in order}
    head = {b: joint_pos(m, v, rd[b]["head"]) for b in order}
    tail = {b: joint_pos(m, v, rd[b]["tail"]) for b in order}
    return order, parent, head, tail


def vertex_weights(nverts: int, bones: list, name: str = "cmu_mb", limit: int = 4) -> tuple[np.ndarray, np.ndarray]:
    """Influences par sommet (4 max, normalisées) : indices d'os et poids."""
    W = np.zeros((nverts, len(bones)), dtype=np.float32)
    bi = {b: i for i, b in enumerate(bones)}
    for b, lst in rig_weights(name).items():
        if b not in bi:
            continue
        for vi, w in lst:
            if vi < nverts:
                W[vi, bi[b]] += w
    J = np.argsort(-W, axis=1)[:, :limit]
    Wt = np.take_along_axis(W, J, 1)
    s = Wt.sum(1, keepdims=True)
    s[s == 0] = 1
    return J.astype(np.uint16), (Wt / s).astype(np.float32)


# --- Proxies (.mhclo) : yeux haute définition -----------------------------------------------------------------

def load_obj(path: str):
    v, vt, faces, fuv = [], [], [], []
    for line in open(path):
        if line.startswith("v "):
            v.append([float(x) for x in line.split()[1:4]])
        elif line.startswith("vt "):
            vt.append([float(x) for x in line.split()[1:3]])
        elif line.startswith("f "):
            a, b = [], []
            for tok in line.split()[1:]:
                p = tok.split("/")
                a.append(int(p[0]) - 1)
                b.append(int(p[1]) - 1 if len(p) > 1 and p[1] else -1)
            faces.append(a)
            fuv.append(b)
    return np.array(v), np.array(vt), faces, fuv


def fit_mhclo(path: str, v: np.ndarray):
    """Ajuste un proxy MakeHuman sur le maillage déformé : barycentres + décalages mis à l'échelle."""
    refs, scales = [], {}
    obj = None
    in_verts = False
    for line in open(path):
        s = line.split()
        if not s or s[0].startswith("#"):
            continue
        if s[0] == "obj_file":
            obj = os.path.join(os.path.dirname(path), s[1])
        elif s[0] in ("x_scale", "y_scale", "z_scale"):
            scales[s[0][0]] = (int(s[1]), int(s[2]), float(s[3]))
        elif s[0] == "verts":
            in_verts = True
        elif in_verts and len(s) == 9:
            refs.append([float(x) for x in s])
        elif in_verts and len(s) == 1 and s[0].isdigit():
            refs.append([float(s[0]), 0, 0, 1, 0, 0, 0, 0, 0])
    pv, vt, faces, fuv = load_obj(obj)
    r = np.array(refs)
    i = r[:, :3].astype(int)
    w = r[:, 3:6]
    off = r[:, 6:9]
    sc = np.ones(3)
    for k, ax in (("x", 0), ("y", 1), ("z", 2)):
        if k in scales:
            a, b, d = scales[k]
            sc[ax] = abs(v[a, ax] - v[b, ax]) / d
    out = (v[i[:, 0]] * w[:, 0:1] + v[i[:, 1]] * w[:, 1:2] + v[i[:, 2]] * w[:, 2:3]) + off * sc
    return out, vt, faces, fuv, i, w
