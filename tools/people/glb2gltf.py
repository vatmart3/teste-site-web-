"""GLB → glTF JSON autonome (tampons en data URI) : pour les hébergeurs qui ne servent pas le .glb.

  python3 tools/people/glb2gltf.py dossier/   → chaque X.glb devient X.gltf.json (le .glb est retiré)
"""
import base64
import json
import os
import struct
import sys

def convert(path: str) -> str:
    d = open(path, "rb").read()
    jl = struct.unpack("<I", d[12:16])[0]
    j = json.loads(d[20:20 + jl])
    off = 20 + jl
    bl = struct.unpack("<I", d[off:off + 4])[0]
    b = d[off + 8:off + 8 + bl]
    j["buffers"][0]["uri"] = "data:application/octet-stream;base64," + base64.b64encode(b).decode()
    # Les tampons « fallback » de meshopt n'ont pas de données : on les laisse sans uri.
    out = path[:-4] + ".gltf.json"
    with open(out, "w") as f:
        json.dump(j, f, separators=(",", ":"))
    os.remove(path)
    return out

if __name__ == "__main__":
    root = sys.argv[1]
    for dp, _, fs in os.walk(root):
        for f in fs:
            if f.endswith(".glb"):
                o = convert(os.path.join(dp, f))
                print(os.path.basename(o), os.path.getsize(o) // 1024, "Ko")
