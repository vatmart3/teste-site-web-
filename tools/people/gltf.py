"""Écriture minimale de glTF 2.0 binaire (GLB) : maillages skinnés, cibles de morphose, textures, animations."""
from __future__ import annotations

import json
import struct

import numpy as np

FLOAT, USHORT, UINT, UBYTE = 5126, 5123, 5125, 5121
ARRAY, ELEMENT = 34962, 34963
TYPES = {1: "SCALAR", 2: "VEC2", 3: "VEC3", 4: "VEC4", 16: "MAT4"}


class Gltf:
    def __init__(self):
        self.j: dict = {"asset": {"version": "2.0", "generator": "billable-hours people"}, "scene": 0, "scenes": [{"nodes": []}], "nodes": [], "meshes": [], "accessors": [], "bufferViews": [], "buffers": [], "materials": [], "textures": [], "images": [], "samplers": [], "skins": [], "animations": []}
        self.bin = bytearray()

    def _view(self, data: bytes, target: int | None = None) -> int:
        while len(self.bin) % 4:
            self.bin.append(0)
        off = len(self.bin)
        self.bin += data
        bv = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target:
            bv["target"] = target
        self.j["bufferViews"].append(bv)
        return len(self.j["bufferViews"]) - 1

    def accessor(self, arr: np.ndarray, ctype: int | None = None, target: int | None = None, minmax: bool = False, normalized: bool = False) -> int:
        arr = np.ascontiguousarray(arr)
        if ctype is None:
            ctype = {np.dtype(np.float32): FLOAT, np.dtype(np.uint16): USHORT, np.dtype(np.uint32): UINT, np.dtype(np.uint8): UBYTE}[arr.dtype]
        comps = 1 if arr.ndim == 1 else arr.shape[1]
        view = self._view(arr.tobytes(), target)
        acc = {"bufferView": view, "componentType": ctype, "count": int(arr.shape[0]), "type": TYPES[comps]}
        if normalized:
            acc["normalized"] = True
        if minmax:
            a2 = arr.reshape(arr.shape[0], -1)
            acc["min"] = [float(x) for x in a2.min(0)]
            acc["max"] = [float(x) for x in a2.max(0)]
        self.j["accessors"].append(acc)
        return len(self.j["accessors"]) - 1

    def image(self, data: bytes, mime: str) -> int:
        view = self._view(data)
        self.j["images"].append({"bufferView": view, "mimeType": mime})
        if not self.j["samplers"]:
            self.j["samplers"].append({"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497})
        self.j["textures"].append({"source": len(self.j["images"]) - 1, "sampler": 0})
        return len(self.j["textures"]) - 1

    def material(self, name: str, color=(1, 1, 1, 1), tex: int | None = None, normal: int | None = None, rough: float = 0.6, metal: float = 0.0, orm: int | None = None, blend: str | None = None, double: bool = False, cutoff: float | None = None, extras: dict | None = None) -> int:
        pbr: dict = {"baseColorFactor": [float(x) for x in color], "roughnessFactor": rough, "metallicFactor": metal}
        if tex is not None:
            pbr["baseColorTexture"] = {"index": tex}
        if orm is not None:
            pbr["metallicRoughnessTexture"] = {"index": orm}
        m: dict = {"name": name, "pbrMetallicRoughness": pbr}
        if normal is not None:
            m["normalTexture"] = {"index": normal}
        if blend:
            m["alphaMode"] = blend
        if cutoff is not None:
            m["alphaCutoff"] = cutoff
        if double:
            m["doubleSided"] = True
        if extras:
            m["extras"] = extras
        self.j["materials"].append(m)
        return len(self.j["materials"]) - 1

    def primitive(self, pos, nrm, uv, idx, material: int, joints=None, weights=None, morphs=None, colors=None) -> dict:
        attrs = {"POSITION": self.accessor(pos.astype(np.float32), target=ARRAY, minmax=True), "NORMAL": self.accessor(nrm.astype(np.float32), target=ARRAY)}
        if uv is not None:
            attrs["TEXCOORD_0"] = self.accessor(uv.astype(np.float32), target=ARRAY)
        if joints is not None:
            attrs["JOINTS_0"] = self.accessor(joints.astype(np.uint16), target=ARRAY)
            attrs["WEIGHTS_0"] = self.accessor(weights.astype(np.float32), target=ARRAY)
        if colors is not None:
            attrs["COLOR_0"] = self.accessor(colors.astype(np.float32), target=ARRAY)
        itype = np.uint32 if pos.shape[0] > 65535 else np.uint16
        p = {"attributes": attrs, "indices": self.accessor(idx.astype(itype).reshape(-1), target=ELEMENT), "material": material}
        if morphs:
            p["targets"] = [{"POSITION": self.accessor(d.astype(np.float32), target=ARRAY, minmax=True)} for d in morphs]
        return p

    def mesh(self, name: str, prims: list, morph_names: list | None = None) -> int:
        m: dict = {"name": name, "primitives": prims}
        if morph_names:
            m["extras"] = {"targetNames": morph_names}
            m["weights"] = [0.0] * len(morph_names)
        self.j["meshes"].append(m)
        return len(self.j["meshes"]) - 1

    def node(self, **kw) -> int:
        self.j["nodes"].append({k: v for k, v in kw.items() if v is not None})
        return len(self.j["nodes"]) - 1

    def save(self, path: str):
        j = {k: v for k, v in self.j.items() if v != []}
        while len(self.bin) % 4:
            self.bin.append(0)
        j["buffers"] = [{"byteLength": len(self.bin)}]
        js = json.dumps(j, separators=(",", ":")).encode()
        while len(js) % 4:
            js += b" "
        with open(path, "wb") as f:
            f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(self.bin)))
            f.write(struct.pack("<II", len(js), 0x4E4F534A))
            f.write(js)
            f.write(struct.pack("<II", len(self.bin), 0x004E4942))
            f.write(self.bin)
