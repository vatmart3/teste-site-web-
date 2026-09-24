"""
Reciblage des captures de mouvement CMU (BVH) sur le squelette des personnages (même nommage « cmu_mb »).

Pour chaque os : direction de repos dans la capture (pose en T, repères alignés sur le monde) et dans le
personnage (pose en A MakeHuman, repères alignés sur le monde). La rotation globale cible est
G_cible = G_capture · C⁻¹ où C amène la direction « T » sur la direction « A ». On repasse en local.
Les clips en boucle sont recousus (l'écart entre fin et début est réparti sur tout le clip), les
déplacements sont ramenés sur place (vitesse notée) et orientés vers +z.

  python3 tools/people/retarget.py      → public/models/people/anims.glb + anims.json
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from scipy.spatial.transform import Rotation as R
from scipy.spatial.transform import Slerp

sys.path.insert(0, os.path.dirname(__file__))
import mh  # noqa: E402
from build import OUT, body_shape  # noqa: E402
from bvh import Bvh  # noqa: E402
from gltf import FLOAT, Gltf  # noqa: E402

CMU = os.environ.get("CMU_DIR", "/tmp/claude-0/cmu/data")
FPS = 30

# nom : (fichier, début s, fin s, boucle, sur place)
CLIPS = {
    "idle": ("139/139_02", 0.6, 7.7, True, True),
    "idleWait": ("137/137_28", 2.5, 15.5, True, True),
    "walk": ("016/16_15", 0.5, 3.7, True, True),
    "walkSlow": ("132/132_45", 2.0, 10.0, True, True),
    "jog": ("016/16_35", 0.15, 1.3, True, True),
    "talk": ("018/18_08", 1.0, 16.5, True, True),
    "argue": ("080/80_48", 0.6, 9.3, True, True),
    "phone": ("079/79_36", 1.0, 4.2, False, True),
    "type": ("079/79_85", 1.2, 8.4, True, True),
    "sitDown": ("113/113_15", 0.9, 2.7, False, False),
    "sitIdle": ("086/86_15", 19.0, 33.0, True, False, "restHands"),
    "sitTalk": ("018/18_12", 1.6, 9.0, True, False),
    "standUp": ("113/113_15", 4.9, 6.9, False, False),
    "coffee": ("137/137_26", 2.5, 12.5, False, True),
    "give": ("080/80_06", 1.2, 6.8, False, True),
    "handshake": ("080/80_01", 0.8, 6.5, False, True),
    "shrug": ("111/111_25", 0.3, 2.3, False, True),
    "wave": ("111/111_37", 0.25, 2.6, False, True),
    "think": ("013/13_04", 4.0, 16.0, True, False),
    "pickup": ("137/137_27", 1.0, 8.0, False, True),
    "explain": ("139/139_25", 0.5, 5.4, False, True),
}


def find(path):
    sub, f = path.split("/")
    for d in (sub, f"{int(sub):03d}"):
        p = os.path.join(CMU, d, f + ".bvh")
        if os.path.exists(p):
            return p
    p = os.path.join(CMU, f"{int(sub):03d}", f.split("_")[0].lstrip("0") + "_" + f.split("_")[1] + ".bvh")
    return p


def shortest_arc(a, b):
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    v = np.cross(a, b)
    c = a @ b
    if c < -0.9999:
        ax = np.cross(a, [1, 0, 0])
        if np.linalg.norm(ax) < 1e-3:
            ax = np.cross(a, [0, 1, 0])
        return R.from_rotvec(ax / np.linalg.norm(ax) * np.pi)
    s = np.sqrt((1 + c) * 2)
    return R.from_quat([v[0] / s, v[1] / s, v[2] / s, s / 2])


def reference():
    c = {"gender": 0.8, "age": 0.55, "muscle": 0.5, "weight": 0.5, "height": 0.5, "proportions": 0.7}
    m = mh.base_mesh()
    v = body_shape(c)
    ground = v[m.vgroups["body"], 1].min()
    order, parent, head, tail = mh.skeleton(m, v)
    w = lambda p: (np.asarray(p) - [0, ground, 0]) * mh.UNIT  # noqa: E731
    return order, parent, {b: w(head[b]) for b in order}, {b: w(tail[b]) for b in order}


def fk(order, parent, head, Gt, hips):
    """Positions globales (par image) des têtes d'os à partir des rotations globales cibles."""
    P = {}
    for bn in order:
        p = parent[bn]
        if not p:
            P[bn] = hips.copy()
        else:
            P[bn] = P[p] + Gt[p].apply(head[bn] - head[p])
    return P


def rest_hands(order, parent, head, tail, Gt, hips):
    """Dos redressé, puis IK à deux os : les mains se posent sur le haut des cuisses (coude vers l'extérieur)."""
    loc = {bn: (Gt[bn] if not parent[bn] else Gt[parent[bn]].inv() * Gt[bn]) for bn in order}
    for bn in ("LowerBack", "Spine", "Spine1", "Neck", "Neck1", "Head"):
        loc[bn] = R.from_rotvec(loc[bn].as_rotvec() * 0.35)
    for bn in order:
        Gt[bn] = loc[bn] if not parent[bn] else Gt[parent[bn]] * loc[bn]
    P = fk(order, parent, head, Gt, hips)
    for side, sg in (("Left", 1), ("Right", -1)):
        S = P[f"{side}Arm"]
        E = P[f"{side}ForeArm"]
        W = P[f"{side}Hand"]
        a = np.linalg.norm(head[f"{side}ForeArm"] - head[f"{side}Arm"])
        b = np.linalg.norm(head[f"{side}Hand"] - head[f"{side}ForeArm"])
        hipj = P[f"{side}UpLeg"]
        knee = P[f"{side}Leg"]
        T = hipj + (knee - hipj) * 0.62 + np.array([sg * 0.02, 0.09, 0.0])
        d = T - S
        dl = np.linalg.norm(d, axis=1, keepdims=True)
        dl_c = np.clip(dl, 1e-4, (a + b) * 0.999)
        dn = d / dl
        # Direction du coude : vers l'extérieur et l'arrière.
        pole = np.tile(np.array([sg * 1.0, 0.0, -0.6]), (len(S), 1))
        pole = pole - dn * np.sum(pole * dn, axis=1, keepdims=True)
        pole /= np.linalg.norm(pole, axis=1, keepdims=True)
        cosA = np.clip((a * a + dl_c[:, 0] ** 2 - b * b) / (2 * a * dl_c[:, 0]), -1, 1)
        sinA = np.sqrt(1 - cosA ** 2)
        Enew = S + (dn * cosA[:, None] + pole * sinA[:, None]) * a
        Wnew = S + dn * dl_c
        # Rotations globales : on tourne les os pour aligner leurs directions actuelles sur les nouvelles.
        for bn, A0, B0, A1, B1 in ((f"{side}Arm", S, E, S, Enew), (f"{side}ForeArm", E, W, Enew, Wnew)):
            cur = B0 - A0
            new = B1 - A1
            rots = [shortest_arc(c, n_) for c, n_ in zip(cur, new)]
            dq = R.from_quat(np.array([r.as_quat() for r in rots]))
            # L'os et tous ses descendants suivent.
            desc = [bn]
            for x in order:
                if parent[x] in desc:
                    desc.append(x)
            for x in desc:
                Gt[x] = dq * Gt[x]
        P = fk(order, parent, head, Gt, hips)
    return Gt


def retarget(name, spec, order, parent, head, tail):
    path, t0, t1, loop, inplace = spec[:5]
    post = spec[5] if len(spec) > 5 else None
    b = Bvh(find(path))
    rots, rp = b.local()
    G, P = b.globals(rots, rp)
    idx = {n: i for i, n in enumerate(b.names)}
    f0, f1 = int(t0 / b.dt), min(int(t1 / b.dt), b.n - 1)

    # Boucle : on cherche, près de la fin demandée, l'image la plus proche de la première.
    if loop:
        key_j = [idx[j] for j in ("Hips", "LeftUpLeg", "RightUpLeg", "LeftLeg", "RightLeg", "LeftArm", "RightArm", "Spine1") if j in idx]

        def pose_d(fa, fb):
            s = 0
            for j in key_j:
                s += (G[j][fa].inv() * G[j][fb]).magnitude()
            return s

        lo = max(f0 + int(0.6 / b.dt), f1 - int(0.8 / b.dt))
        hi = min(b.n - 1, f1 + int(0.4 / b.dt))
        cands = range(lo, hi, 2)
        f1 = min(cands, key=lambda f: pose_d(f0, f))

    frames = np.arange(f0, f1 + 1)
    # Orientation : marche vers +z, ou regard moyen vers +z.
    rootp = P[idx["Hips"]][frames]
    travel = rootp[-1] - rootp[0]
    travel[1] = 0
    if inplace and np.linalg.norm(travel) > 0.4:
        yaw = np.arctan2(travel[0], travel[2])
    else:
        fwd = G[idx["Hips"]][frames].apply([0, 0, 1])
        fwd = fwd.mean(0)
        yaw = np.arctan2(fwd[0], fwd[2])
    Ry = R.from_euler("y", -yaw)
    dur = (len(frames) - 1) * b.dt
    speed = float(np.linalg.norm(travel) / dur) if inplace else 0.0

    # Échelle de hauteur (hanches).
    rest_hip_src = P[idx["Hips"]][0][1]  # image 0 = pose en T de calibrage
    src_leg = np.linalg.norm(b.offset[idx["LeftLeg"]]) + np.linalg.norm(b.offset[idx["LeftFoot"]]) + np.linalg.norm(b.offset[idx["LeftUpLeg"]])
    tgt_leg = np.linalg.norm(head["LeftLeg"] - head["LeftUpLeg"]) + np.linalg.norm(head["LeftFoot"] - head["LeftLeg"]) + np.linalg.norm(head["LeftUpLeg"] - head["Hips"])
    scale = tgt_leg / src_leg

    # Corrections par os (T capture → A personnage).
    corr = {}
    for bn in order:
        if bn not in idx:
            continue
        j = idx[bn]
        # Direction « A » : tête → queue.
        dA = tail[bn] - head[bn]
        # Direction « T » : vers l'enfant correspondant (même nom que l'enfant cible dont la tête = notre queue).
        child_t = [c for c in order if parent[c] == bn and np.linalg.norm(head[c] - tail[bn]) < 0.01]
        src = None
        for ct in child_t:
            if ct in idx and np.linalg.norm(b.offset[idx[ct]]) > 1e-4:
                src = b.offset[idx[ct]]
                break
        if src is None:
            kids = [k for k in range(len(b.names)) if b.parent[k] == j and np.linalg.norm(b.offset[k]) > 1e-4]
            if kids:
                src = b.offset[kids[0]]
            elif j in b.end_offset:
                src = np.array(b.end_offset[j]) * 0.056444
        if src is None or np.linalg.norm(dA) < 1e-5:
            corr[bn] = R.identity()
        else:
            corr[bn] = shortest_arc(np.asarray(src, float), dA)

    Gt = {}
    for bn in order:
        if bn in idx:
            Gt[bn] = Ry * G[idx[bn]][frames] * corr[bn].inv()
        else:
            Gt[bn] = Gt[parent[bn]] if parent[bn] else R.identity(len(frames))
    # Translation des hanches (calculée ici pour l'IK éventuelle).
    rp2 = Ry.apply(rootp - rootp[0] * [1, 0, 1])
    if inplace:
        rp2[:, 0] = 0
        rp2[:, 2] = 0
    hips = np.tile(head["Hips"], (len(frames), 1))
    hips[:, 1] = head["Hips"][1] + (rootp[:, 1] - rest_hip_src) * scale
    hips[:, 0] += rp2[:, 0] * scale
    hips[:, 2] += rp2[:, 2] * scale
    if post == "restHands":
        Gt = rest_hands(order, parent, head, tail, Gt, hips)
    local = {}
    for bn in order:
        p = parent[bn]
        local[bn] = Gt[bn] if not p else Gt[p].inv() * Gt[bn]

    # Recouture de la boucle : l'écart fin/début réparti sur la durée.
    if loop:
        n = len(frames)
        k = np.linspace(0, 1, n)
        for bn in order:
            q = local[bn]
            d = (q[0] * q[n - 1].inv()).as_rotvec()
            fix = R.from_rotvec(np.outer(k, d))
            local[bn] = fix * q
        hips[:, 1] += np.outer(k, [hips[0, 1] - hips[-1, 1]])[:, 0]

    # Rééchantillonnage à 30 i/s.
    ts = np.arange(len(frames)) * b.dt
    out_t = np.arange(0, ts[-1] + 1e-6, 1 / FPS)
    res = {}
    for bn in order:
        res[bn] = Slerp(ts, local[bn])(out_t).as_quat()
    hip_res = np.stack([np.interp(out_t, ts, hips[:, i]) for i in range(3)], 1)
    return out_t, res, hip_res, {"duration": float(out_t[-1]), "loop": loop, "speed": round(speed * scale, 3)}


def main():
    order, parent, head, tail = reference()
    g = Gltf()
    nodes = {}
    for bn in order:
        pp = head[parent[bn]] if parent[bn] else np.zeros(3)
        nodes[bn] = g.node(name=bn, translation=[float(x) for x in head[bn] - pp])
    for bn in order:
        if parent[bn]:
            g.j["nodes"][nodes[parent[bn]]].setdefault("children", []).append(nodes[bn])
    g.j["scenes"][0]["nodes"] = [nodes[bn] for bn in order if not parent[bn]]
    meta = {}
    only = sys.argv[1:]
    for name, spec in CLIPS.items():
        if only and name not in only:
            continue
        try:
            t, rot, hip, info = retarget(name, spec, order, parent, head, tail)
        except FileNotFoundError as e:
            print("absent", name, e)
            continue
        tin = g.accessor(t.astype(np.float32), FLOAT, minmax=True)
        samplers, channels = [], []
        for bn in order:
            samplers.append({"input": tin, "output": g.accessor(rot[bn].astype(np.float32)), "interpolation": "LINEAR"})
            channels.append({"sampler": len(samplers) - 1, "target": {"node": nodes[bn], "path": "rotation"}})
        samplers.append({"input": tin, "output": g.accessor(hip.astype(np.float32)), "interpolation": "LINEAR"})
        channels.append({"sampler": len(samplers) - 1, "target": {"node": nodes["Hips"], "path": "translation"}})
        g.j["animations"].append({"name": name, "samplers": samplers, "channels": channels})
        meta[name] = info
        print(f"{name:10s} {info}")
    meta["_hips"] = float(head["Hips"][1])
    os.makedirs(OUT, exist_ok=True)
    if only:
        g.save("/tmp/anims-partial.glb")
        print("partiel : /tmp/anims-partial.glb (anims.glb inchangé)")
        return
    g.save(os.path.join(OUT, "anims.glb"))
    json.dump(meta, open(os.path.join(OUT, "anims.json"), "w"), indent=1)
    print("anims.glb", os.path.getsize(os.path.join(OUT, "anims.glb")) / 1e6, "Mo")


if __name__ == "__main__":
    main()
