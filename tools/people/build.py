"""
Génère les personnages du jeu (GLB skinnés) à partir du corps MakeHuman CC0.

  python3 tools/people/build.py [id ...]      → public/models/people/<id>.glb

Chaque personnage : corps (tête séparée avec cibles d'expression), yeux, dents, cils, cheveux, vêtements,
textures cuites (peau, tenue), squelette CMU (compatible avec les captures de mouvement CMU).
"""
from __future__ import annotations

import io
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import mh  # noqa: E402
from geom import triangulate, unweld, vertex_normals  # noqa: E402
from gltf import Gltf  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "models", "people")

# Cibles d'expression exportées comme morphoses (noms courts côté jeu).
EXPRESSIONS = {
    "jawOpen": "mouth-open",
    "blinkL": "eye-left-closure",
    "blinkR": "eye-right-closure",
    "smile": "mouth-corner-puller",
    "frown": "mouth-depression",
    "pucker": "mouth-pursing",
    "press": "mouth-compression",
    "wide": "mouth-retraction",
    "browUpL": "eyebrows-left-up",
    "browUpR": "eyebrows-right-up",
    "browDownL": "eyebrows-left-down",
    "browDownR": "eyebrows-right-down",
    "browInnerL": "eyebrows-left-inner-up",
    "browInnerR": "eyebrows-right-inner-up",
    "squintL": "eye-left-slit",
    "squintR": "eye-right-slit",
    "sneer": "nose-left-elevation",
}


def expression_target(name: str, race: dict) -> tuple[np.ndarray, np.ndarray]:
    """Cible d'expression pondérée par l'origine (les unités existent en trois variantes)."""
    acc: dict = {}
    for r, w in race.items():
        if w <= 0:
            continue
        idx, d = mh.target(f"expression/units/{r}/{name}")
        for i, dd in zip(idx, d):
            acc[i] = acc.get(i, 0) + dd * w
    idx = np.array(sorted(acc))
    return idx, np.array([acc[i] for i in idx])


def body_shape(c: dict) -> np.ndarray:
    m = mh.base_mesh()
    w = mh.macro_weights(c.get("gender", 1), c.get("age", 0.6), c.get("muscle", 0.5), c.get("weight", 0.5), c.get("height", 0.5), c.get("proportions", 0.7), c.get("race", {"caucasian": 1}))
    for k, val in c.get("face", {}).items():
        names = [f"{k}-incr" if val >= 0 else f"{k}-decr", k] if not k.endswith(("incr", "decr")) else [k]
        done = False
        for nm in names:
            for pre in ("", "l-", "r-"):
                try:
                    w[mh.find_target(pre + nm)] = abs(val)
                    done = done or pre == ""
                    if pre:
                        done = True
                except FileNotFoundError:
                    pass
            if done:
                break
        if not done:
            print("  cible inconnue", k)
    return mh.apply_targets(m.v, w)


def encode(img: Image.Image, fmt: str = "WEBP", q: int = 86) -> tuple[bytes, str]:
    b = io.BytesIO()
    if fmt == "WEBP":
        img.save(b, "WEBP", quality=q, method=5)
        return b.getvalue(), "image/webp"
    if fmt == "PNG":
        img.save(b, "PNG", optimize=True)
        return b.getvalue(), "image/png"
    img.convert("RGB").save(b, "JPEG", quality=q, optimize=True)
    return b.getvalue(), "image/jpeg"


def build(cid: str, c: dict):
    import bake
    import garments
    import hair as hairmod

    m = mh.base_mesh()
    v = body_shape(c)
    ground = v[m.vgroups["body"], 1].min()
    order, parent, head, tail = mh.skeleton(m, v)
    bones = order
    J, Wt = mh.vertex_weights(len(v), bones)

    def world(p):
        q = (np.asarray(p) - [0, ground, 0]) * mh.UNIT
        return q

    vw = world(v)
    g = Gltf()

    # --- Squelette : nœuds en pose de repos (rotations nulles), matrices de liaison inverses.
    node_of = {}
    root_nodes = []
    for b in bones:
        hp = world(head[b])
        pp = world(head[parent[b]]) if parent[b] else np.zeros(3)
        node_of[b] = g.node(name=b, translation=[float(x) for x in (hp - pp)])
    for b in bones:
        if parent[b]:
            g.j["nodes"][node_of[parent[b]]].setdefault("children", []).append(node_of[b])
        else:
            root_nodes.append(node_of[b])
    # Os supplémentaires (hors CMU) : yeux, pour le regard.
    eye_nodes = {}
    for side, grp in (("L", "helper-l-eye"), ("R", "helper-r-eye")):
        ctr = vw[m.vgroups[grp]].mean(0)
        hp = world(head["Head"])
        n = g.node(name=f"Eye{side}", translation=[float(x) for x in (ctr - hp)])
        g.j["nodes"][node_of["Head"]].setdefault("children", []).append(n)
        eye_nodes[side] = (n, ctr)
    joint_nodes = [node_of[b] for b in bones] + [eye_nodes["L"][0], eye_nodes["R"][0]]
    ibm = []
    for b in bones:
        mtx = np.eye(4)
        mtx[:3, 3] = -world(head[b])
        ibm.append(mtx.T.reshape(-1))
    for side in ("L", "R"):
        mtx = np.eye(4)
        mtx[:3, 3] = -eye_nodes[side][1]
        ibm.append(mtx.T.reshape(-1))
    skin = {"joints": joint_nodes, "inverseBindMatrices": g.accessor(np.array(ibm, dtype=np.float32)), "skeleton": root_nodes[0]}
    g.j["skins"].append(skin)
    eyeL, eyeR = len(bones), len(bones) + 1

    tris, tuv = triangulate(m.faces, m.fuv)
    tgroup = np.repeat(m.fgroup, [len(f) - 2 for f in m.faces])
    gname = np.array(m.groups)[tgroup]
    normals = vertex_normals(vw, tris[gname == "body"])

    # --- Tenue (vêtements dérivés de la surface du corps) : définit aussi les faces du corps cachées.
    Hw = {k: world(p) for k, p in head.items()}
    Tw = {k: world(p) for k, p in tail.items()}
    outfit = garments.make(c, m, vw, normals, tris[gname == "body"], tuv[gname == "body"], J, Wt, bones, Hw, Tw)
    hidden = outfit["hidden_tris"]

    # --- Textures : peau (cuite dans l'espace UV à partir des positions 3D) + normales de détail.
    skin_img, skin_nrm = bake.skin(c, m, vw, normals, tris[gname == "body"], tuv[gname == "body"], head, world)
    tex_skin = g.image(*encode(skin_img))
    tex_skin_n = g.image(*encode(skin_nrm, q=92))
    mat_skin = g.material("skin", tex=tex_skin, normal=tex_skin_n, rough=0.5, extras={"kind": "skin"})

    # --- Corps : tête (avec morphoses) et reste du corps séparés.
    body_t = tris[gname == "body"]
    body_u = tuv[gname == "body"]
    keep = ~hidden
    body_t, body_u = body_t[keep], body_u[keep]
    expr = {k: expression_target(t, c.get("race", {"caucasian": 1})) for k, t in EXPRESSIONS.items()}
    face_vs = set()
    for idx, _ in expr.values():
        face_vs.update(idx.tolist())
    hb = bones.index("Head")
    headw = np.zeros(len(v))
    for k in range(4):
        headw += np.where(J[:, k] == hb, Wt[:, k], 0)
    face_vs.update(np.nonzero(headw > 0.5)[0].tolist())
    is_face = np.zeros(len(v), bool)
    is_face[list(face_vs)] = True
    tri_face = is_face[body_t].any(1)

    def prim(ts, us, material, morph=False, pos=None, nrm=None, uvs=None, joints=None, weights=None):
        pos = vw if pos is None else pos
        nrm = normals if nrm is None else nrm
        uvs = m.vt if uvs is None else uvs
        joints = J if joints is None else joints
        weights = Wt if weights is None else weights
        vi, ui, nt = unweld(ts, us)
        uv = uvs[ui].copy()
        uv[:, 1] = 1 - uv[:, 1]
        morphs = None
        if morph:
            morphs = []
            for idx, d in expr.values():
                dd = np.zeros((len(pos), 3))
                dd[idx] = d * mh.UNIT
                morphs.append(dd[vi])
        return g.primitive(pos[vi], nrm[vi], uv, nt, material, joints[vi], weights[vi], morphs)

    head_prim = prim(body_t[tri_face], body_u[tri_face], mat_skin, morph=True)
    body_prim = prim(body_t[~tri_face], body_u[~tri_face], mat_skin)
    meshes = []
    meshes.append(g.mesh("Head", [head_prim], list(EXPRESSIONS.keys())))
    meshes.append(g.mesh("Body", [body_prim]))

    # --- Bouche : dents, langue (poids du maillage de base).
    mat_teeth = g.material("teeth", color=(0.86, 0.83, 0.76, 1), rough=0.35, extras={"kind": "teeth"})
    mat_tongue = g.material("tongue", color=(0.55, 0.22, 0.22, 1), rough=0.45)
    mouth_prims = []
    for grp, mat in (("helper-upper-teeth", mat_teeth), ("helper-lower-teeth", mat_teeth), ("helper-tongue", mat_tongue)):
        sel = gname == grp
        ts = tris[sel]
        n = vertex_normals(vw, ts)
        mouth_prims.append(prim(ts, tuv[sel], mat, nrm=n))
    meshes.append(g.mesh("Mouth", mouth_prims))

    # --- Yeux haute définition (proxy MakeHuman ajusté), liés aux os des yeux.
    eye_img = bake.eye_texture(c)
    tex_eye = g.image(*encode(eye_img))
    mat_eye = g.material("eye", tex=tex_eye, rough=0.08, extras={"kind": "eye"})
    ev, evt, ef, efu = mh.fit_mhclo(os.path.join(mh.MH_DATA, "eyes/high-poly/high-poly.mhclo"), v)[:4]
    evw = world(ev)
    et, eu = triangulate(ef, efu)
    en = vertex_normals(evw, et)
    # La cornée (îlot UV en bas à droite, transparent dans la texture) : coque brillante transparente.
    cu = evt[eu].mean(1)
    is_cornea = (cu[:, 0] > 0.8) & (cu[:, 1] < 0.2)
    side = np.where(evw[:, 0] > 0, eyeL, eyeR)
    ej = np.zeros((len(evw), 4), np.uint16)
    ej[:, 0] = side
    ew = np.zeros((len(evw), 4), np.float32)
    ew[:, 0] = 1
    mat_cornea = g.material("cornea", color=(1, 1, 1, 0.08), rough=0.02, blend="BLEND", extras={"kind": "cornea"})
    meshes.append(g.mesh("Eyes", [prim(et[~is_cornea], eu[~is_cornea], mat_eye, pos=evw, nrm=en, uvs=evt, joints=ej, weights=ew), prim(et[is_cornea], eu[is_cornea], mat_cornea, pos=evw, nrm=en, uvs=evt, joints=ej, weights=ew)]))

    # --- Cils (bandes de la géométrie d'aide), texture alpha.
    lash_img = bake.lashes()
    tex_lash = g.image(*encode(lash_img, "PNG"))
    mat_lash = g.material("lashes", color=(0.05, 0.035, 0.03, 1), tex=tex_lash, rough=0.7, blend="MASK", cutoff=0.4, double=True, extras={"kind": "lashes"})
    lash_prims = []
    for grp in ("helper-l-eyelashes-1", "helper-l-eyelashes-2", "helper-r-eyelashes-1", "helper-r-eyelashes-2"):
        sel = gname == grp
        ts = tris[sel]
        lash_prims.append(prim(ts, tuv[sel], mat_lash, nrm=vertex_normals(vw, ts)))
    meshes.append(g.mesh("Lashes", lash_prims))

    # --- Vêtements.
    for piece in outfit["pieces"]:
        tex = g.image(*encode(piece["albedo"])) if piece.get("albedo") is not None else None
        alpha = piece.get("alpha", False) and tex is not None
        mat = g.material(piece["name"], color=piece.get("color", (1, 1, 1, 1)), tex=tex, rough=piece.get("rough", 0.8), metal=piece.get("metal", 0), double=piece.get("double", False), blend="MASK" if alpha else None, cutoff=0.5 if alpha else None, extras={"kind": piece.get("kind", "cloth"), **piece.get("extras", {})})
        uv = piece["uv"].copy()
        uv[:, 1] = 1 - uv[:, 1]
        p = g.primitive(piece["pos"], piece["nrm"], uv, piece["tris"], mat, piece["joints"], piece["weights"])
        meshes.append(g.mesh(piece["name"], [p]))

    # --- Cheveux.
    hp = hairmod.make(c, m, vw, normals, tris[gname == "body"], J, Wt, bones, head, world)
    if hp:
        from garments import lin
        from bake import hex2rgb

        tex = g.image(*encode(hp["albedo"]))
        mat = g.material("hair", color=(*lin(hex2rgb(hp["tint"])), 1.0), tex=tex, rough=0.62, blend="MASK", cutoff=0.4, double=True, extras={"kind": "hair"})
        meshes.append(g.mesh("Hair", [g.primitive(hp["pos"], hp["nrm"], hp["uv"], hp["tris"], mat, hp["joints"], hp["weights"], colors=hp["colors"])]))

    # --- Lunettes : montures fines (cercles, pont, branches) liées à la tête.
    if c.get("glasses"):
        pts_all, tris_all = [], []
        eyes_c = [vw[m.vgroups[gname_]].mean(0) for gname_ in ("helper-l-eye", "helper-r-eye")]
        r = 0.019 if c["glasses"] == "round" else 0.017
        zf = max(e[2] for e in eyes_c) + 0.011

        def tube(path, rad, closed=False):
            base = len(pts_all)
            path = np.asarray(path)
            n = len(path)
            seg = 6
            for i in range(n):
                t = path[(i + 1) % n] - path[i - 1] if closed else path[min(i + 1, n - 1)] - path[max(i - 1, 0)]
                t = t / (np.linalg.norm(t) + 1e-9)
                a = np.cross(t, [0, 1, 0]) if abs(t[1]) < 0.9 else np.cross(t, [1, 0, 0])
                a /= np.linalg.norm(a)
                bb = np.cross(t, a)
                for k in range(seg):
                    ang = 2 * np.pi * k / seg
                    pts_all.append(path[i] + (a * np.cos(ang) + bb * np.sin(ang)) * rad)
            for i in range(n if closed else n - 1):
                for k in range(seg):
                    a0 = base + i * seg + k
                    a1 = base + i * seg + (k + 1) % seg
                    b0 = base + ((i + 1) % n) * seg + k
                    b1 = base + ((i + 1) % n) * seg + (k + 1) % seg
                    tris_all.extend([[a0, b0, a1], [a1, b0, b1]])

        for e in eyes_c:
            ring = [[e[0] + np.cos(a) * r * (1.15 if c["glasses"] != "round" else 1), e[1] + np.sin(a) * r * (0.8 if c["glasses"] != "round" else 1), zf] for a in np.linspace(0, 2 * np.pi, 24, endpoint=False)]
            tube(ring, 0.0014, closed=True)
        l, rr = eyes_c
        bx = (l[0] + rr[0]) / 2
        tube([[l[0] - r * 1.05, l[1] + 0.004, zf], [bx, l[1] + 0.008, zf + 0.002], [rr[0] + r * 1.05, rr[1] + 0.004, zf]], 0.0013)
        hw = vw[m.vgroups["body"]]
        for e in eyes_c:
            sx = np.sign(e[0])
            side = e[0] + sx * r * 1.15
            ear_x = hw[(np.abs(hw[:, 1] - e[1]) < 0.02) & (np.sign(hw[:, 0]) == sx)][:, 0]
            ex = (np.abs(ear_x).max() * sx) if len(ear_x) else side * 1.8
            tube([[side, e[1] + 0.003, zf - 0.002], [ex - sx * 0.004, e[1] + 0.006, zf - 0.02], [ex - sx * 0.006, e[1], zf - 0.1]], 0.0013)
        P_ = np.array(pts_all)
        T_ = np.array(tris_all)
        N_ = vertex_normals(P_, T_)
        jg = np.zeros((len(P_), 4), np.uint16)
        jg[:, 0] = bones.index("Head")
        wg = np.zeros((len(P_), 4), np.float32)
        wg[:, 0] = 1
        mat_g = g.material("glasses", color=(0.05, 0.04, 0.035, 1) if c["glasses"] == "round" else (0.6, 0.48, 0.25, 1), rough=0.3, metal=0.6 if c["glasses"] != "round" else 0.0, extras={"kind": "frame"})
        meshes.append(g.mesh("Glasses", [g.primitive(P_, N_, np.zeros((len(P_), 2)), T_, mat_g, jg, wg)]))

    char = g.node(name=cid, children=root_nodes)
    for i, mi in enumerate(meshes):
        n = g.node(name=g.j["meshes"][mi]["name"], mesh=mi, skin=0)
        g.j["nodes"][char].setdefault("children", []).append(n)
    height = float(vw[m.vgroups["body"], 1].max())
    g.j["nodes"][char]["extras"] = {"height": height, "hips": float(world(head["Hips"])[1]), "eyeY": float(eye_nodes["L"][1][1])}
    g.j["scenes"][0]["nodes"] = [char]
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{cid}.glb")
    g.save(path)
    print(f"{cid}: {os.path.getsize(path) / 1e6:.2f} Mo, taille {height:.2f} m")
    return path


if __name__ == "__main__":
    from cast import CAST

    ids = sys.argv[1:] or list(CAST)
    for cid in ids:
        build(cid, CAST[cid])
