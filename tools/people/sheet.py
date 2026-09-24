"""Planche-contact d'un BVH : silhouettes filaires (face) à intervalles réguliers, pour choisir les extraits."""
import sys
import numpy as np
from PIL import Image, ImageDraw
from bvh import Bvh

def sheet(path, out, cols=12, t0=None, t1=None):
    b = Bvh(path)
    rots, rp = b.local()
    G, P = b.globals(rots, rp)
    n = b.n
    a = 0 if t0 is None else int(t0 / b.dt)
    z = n if t1 is None else int(t1 / b.dt)
    idx = np.linspace(a, z - 1, cols).astype(int)
    W, H = 110, 190
    img = Image.new("RGB", (W * cols, H * 2 + 16), "white")
    d = ImageDraw.Draw(img)
    for k, f in enumerate(idx):
        pts = np.array([P[j][f] for j in range(len(b.names))])
        root = pts[0].copy()
        for row, (ax0, ax1) in enumerate(((0, 1), (2, 1))):
            ox = k * W + W / 2
            oy = row * H + H - 12
            def pr(p):
                return (ox + (p[ax0] - root[ax0]) * 90 * (1 if row == 0 else 1), oy - p[1] * 90)
            for j, pa in enumerate(b.parent):
                if pa >= 0:
                    c = (200, 40, 40) if "Left" in b.names[j] or b.names[j].startswith("L") else (40, 40, 200) if "Right" in b.names[j] or b.names[j].startswith("R") else (0, 0, 0)
                    d.line([pr(pts[pa]), pr(pts[j])], fill=c, width=2)
        d.text((k * W + 4, 2 * H + 2), f"{f * b.dt:.1f}s", fill=(0, 0, 0))
    img.save(out)
    print(path, f"{n * b.dt:.1f}s", n)

if __name__ == "__main__":
    sheet(sys.argv[1], sys.argv[2], *(float(x) for x in sys.argv[3:5]) if len(sys.argv) > 3 else ())
