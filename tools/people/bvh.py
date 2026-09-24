"""Lecture BVH (captures CMU converties par cgspeed) et cinématique directe."""
from __future__ import annotations

import numpy as np
from scipy.spatial.transform import Rotation as R

CMU_SCALE = 0.056444  # unités cgspeed → mètres


class Bvh:
    def __init__(self, path: str):
        self.names: list = []
        self.parent: list = []
        self.offset: list = []
        self.channels: list = []
        self.end_offset: dict = {}
        tokens = open(path).read().split()
        i = 0
        stack = []
        cur = -1
        while tokens[i] != "MOTION":
            t = tokens[i]
            if t in ("ROOT", "JOINT"):
                self.names.append(tokens[i + 1])
                self.parent.append(stack[-1] if stack else -1)
                self.offset.append([0, 0, 0])
                self.channels.append([])
                cur = len(self.names) - 1
                i += 2
            elif t == "End":
                # End Site { OFFSET x y z }
                j = tokens.index("OFFSET", i)
                self.end_offset[stack[-1]] = [float(x) for x in tokens[j + 1:j + 4]]
                i = tokens.index("}", j) + 1
                continue
            elif t == "{":
                stack.append(cur)
                i += 1
            elif t == "}":
                stack.pop()
                cur = stack[-1] if stack else -1
                i += 1
            elif t == "OFFSET":
                self.offset[cur] = [float(x) for x in tokens[i + 1:i + 4]]
                i += 4
            elif t == "CHANNELS":
                k = int(tokens[i + 1])
                self.channels[cur] = tokens[i + 2:i + 2 + k]
                i += 2 + k
            else:
                i += 1
        i += 1
        nf = int(tokens[i + 1])
        self.dt = float(tokens[i + 4])
        vals = np.array(tokens[i + 5:], float)
        nch = sum(len(c) for c in self.channels)
        self.data = vals[: nf * nch].reshape(nf, nch)
        self.offset = np.array(self.offset) * CMU_SCALE
        self.n = nf

    def local(self):
        """Rotations locales (quaternions scipy, par articulation) et position de la racine (m)."""
        col = 0
        rots = []
        root_pos = np.zeros((self.n, 3))
        for j, ch in enumerate(self.channels):
            rot_axes = ""
            rot_vals = []
            for c in ch:
                v = self.data[:, col]
                col += 1
                if c.endswith("position"):
                    root_pos[:, "XYZ".index(c[0])] = v * CMU_SCALE
                else:
                    rot_axes += c[0]
                    rot_vals.append(v)
            if rot_axes:
                rots.append(R.from_euler(rot_axes.upper(), np.stack(rot_vals, 1), degrees=True))
            else:
                rots.append(R.identity(self.n))
        return rots, root_pos

    def globals(self, rots, root_pos):
        """Rotations et positions globales de chaque articulation, par image."""
        G = [None] * len(self.names)
        P = [None] * len(self.names)
        for j in range(len(self.names)):
            p = self.parent[j]
            if p < 0:
                G[j] = rots[j]
                P[j] = root_pos + self.offset[j]
            else:
                G[j] = G[p] * rots[j]
                P[j] = P[p] + G[p].apply(self.offset[j])
        return G, P
