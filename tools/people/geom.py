"""Outils géométriques : triangulation, normales lissées, découpe par UV, lissage laplacien."""
from __future__ import annotations

import numpy as np


def triangulate(faces: list, fuv: list) -> tuple[np.ndarray, np.ndarray]:
    tv, tu = [], []
    for f, u in zip(faces, fuv):
        for k in range(1, len(f) - 1):
            tv.append([f[0], f[k], f[k + 1]])
            tu.append([u[0], u[k], u[k + 1]])
    return np.array(tv, dtype=np.int64), np.array(tu, dtype=np.int64)


def vertex_normals(v: np.ndarray, tris: np.ndarray) -> np.ndarray:
    a, b, c = v[tris[:, 0]], v[tris[:, 1]], v[tris[:, 2]]
    fn = np.cross(b - a, c - a)
    n = np.zeros_like(v)
    for k in range(3):
        np.add.at(n, tris[:, k], fn)
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    ln[ln == 0] = 1
    return n / ln


def unweld(tris: np.ndarray, tuv: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Sommets uniques par couple (sommet, UV). Rend : index du sommet d'origine, index UV, triangles réindexés."""
    pairs = np.stack([tris.reshape(-1), tuv.reshape(-1)], 1)
    uniq, inv = np.unique(pairs, axis=0, return_inverse=True)
    return uniq[:, 0], uniq[:, 1], inv.reshape(-1, 3)


def adjacency(n: int, tris: np.ndarray):
    """Voisins de chaque sommet (liste d'ensembles → tableaux)."""
    nb = [set() for _ in range(n)]
    for a, b, c in tris:
        nb[a].update((b, c))
        nb[b].update((a, c))
        nb[c].update((a, b))
    return [np.fromiter(s, dtype=np.int64) if s else np.zeros(0, dtype=np.int64) for s in nb]


def laplacian(v: np.ndarray, nb: list, iters: int, amount: np.ndarray | float, mask: np.ndarray | None = None) -> np.ndarray:
    out = v.copy()
    amt = np.broadcast_to(np.asarray(amount, dtype=float), (len(v),)).copy()
    if mask is not None:
        amt = amt * mask
    # Voisinage en CSR pour aller vite.
    lens = np.array([len(x) for x in nb])
    ptr = np.concatenate([[0], np.cumsum(lens)])
    flat = np.concatenate([x for x in nb if len(x)]) if lens.sum() else np.zeros(0, dtype=np.int64)
    owner = np.repeat(np.arange(len(v)), lens)
    for _ in range(iters):
        acc = np.zeros_like(out)
        np.add.at(acc, owner, out[flat])
        cnt = np.maximum(lens, 1)[:, None]
        mean = acc / cnt
        has = (lens > 0)[:, None]
        out = np.where(has, out + (mean - out) * amt[:, None], out)
    return out


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)
