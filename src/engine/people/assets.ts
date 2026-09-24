/**
 * Chargement des personnages réalistes (GLB générés par tools/people : corps MakeHuman CC0, vêtements,
 * cheveux, squelette CMU) et des animations (captures CMU reciblées). Les matériaux glTF sont remplacés
 * par des matériaux physiques : peau (lustre rougeâtre), laine et soie (sheen), cuir (vernis), cheveux.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { ASSET_BASE } from "../assets/manifest";

/** Extension des modèles : « glb » ; « gltf.json » pour les hébergeurs qui ne servent pas le binaire. */
const EXT = process.env.NEXT_PUBLIC_MODEL_EXT ?? "glb";

export interface ClipInfo {
  duration: number;
  loop: boolean;
  /** Vitesse de déplacement (m/s) de la capture d'origine (clips « sur place »). */
  speed: number;
}

let loader: GLTFLoader | null = null;
function gltfLoader(): GLTFLoader {
  if (!loader) {
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

const templates = new Map<string, Promise<THREE.Object3D>>();

function tone(c: THREE.Color, k: number): THREE.Color {
  return c.clone().multiplyScalar(k);
}

/** Remplace les matériaux glTF par des matériaux physiques selon leur nature (extras.kind). */
function upgradeMaterial(src: THREE.Material): THREE.Material {
  const s = src as THREE.MeshStandardMaterial;
  const kind = (s.userData?.kind as string) ?? "";
  const base = {
    map: s.map,
    normalMap: s.normalMap,
    color: s.color,
    roughness: s.roughness,
    metalness: 0,
    side: s.side,
    alphaTest: s.alphaTest,
    transparent: s.transparent,
    opacity: s.opacity,
    vertexColors: s.vertexColors,
  };
  let m: THREE.MeshPhysicalMaterial;
  switch (kind) {
    case "skin":
      m = new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.55, sheen: 0.35, sheenRoughness: 0.55, sheenColor: new THREE.Color("#ff8866"), clearcoat: 0.08, clearcoatRoughness: 0.45 });
      if (m.normalMap) m.normalScale.set(0.55, 0.55);
      // Diffusion sous la peau (approximation) : l'ombre ne tombe jamais au noir, elle vire au rouge.
      m.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace(
          "#include <lights_fragment_end>",
          `#include <lights_fragment_end>
          reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(0.10, 0.035, 0.02);`,
        );
      };
      break;
    case "wool":
    case "cotton":
    case "silk": {
      const sheen = (s.userData?.sheen as number) ?? 0.5;
      m = new THREE.MeshPhysicalMaterial({ ...base, roughness: kind === "silk" ? 0.4 : Math.max(0.7, s.roughness), sheen, sheenRoughness: kind === "silk" ? 0.3 : 0.75, sheenColor: tone(s.color, 1).lerp(new THREE.Color("#9aa4b8"), 0.5) });
      break;
    }
    case "leather":
      m = new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.38, clearcoat: 0.9, clearcoatRoughness: 0.18 });
      break;
    case "hair":
      m = new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.5, sheen: 1, sheenRoughness: 0.35, sheenColor: tone(s.color, 3).lerp(new THREE.Color("#fff1dc"), 0.2), vertexColors: true, side: THREE.DoubleSide });
      break;
    case "eye":
      m = new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 });
      break;
    case "cornea":
      m = new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.06, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0, depthWrite: false });
      break;
    case "teeth":
      m = new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.3, clearcoat: 0.4 });
      break;
    default:
      return src;
  }
  m.name = s.name;
  m.userData = s.userData;
  return m;
}

export function loadPerson(id: string): Promise<THREE.Object3D> {
  let p = templates.get(id);
  if (!p) {
    p = gltfLoader()
      .loadAsync(`${ASSET_BASE}models/people/${id}.${EXT}`)
      .then((g) => {
        const root = g.scene;
        root.traverse((o) => {
          const mesh = o as THREE.SkinnedMesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = !/Lashes|Eyes|Mouth/.test(mesh.name);
          mesh.receiveShadow = true;
          mesh.material = Array.isArray(mesh.material) ? mesh.material.map(upgradeMaterial) : upgradeMaterial(mesh.material);
        });
        // Métadonnées de la silhouette (taille, hanches) posées par le générateur sur le nœud racine.
        const info = root.children[0]?.userData ?? {};
        root.userData = { ...info };
        return root;
      });
    templates.set(id, p);
  }
  return p;
}

/** Nouvelle instance animable (squelette cloné, matériaux partagés). */
export async function instantiate(id: string): Promise<THREE.Object3D> {
  const t = await loadPerson(id);
  const o = cloneSkinned(t);
  o.userData = { ...t.userData };
  return o;
}

let animsPromise: Promise<{ clips: Map<string, THREE.AnimationClip>; info: Record<string, ClipInfo>; hips: number }> | null = null;

export function loadAnims() {
  animsPromise ??= Promise.all([
    gltfLoader().loadAsync(`${ASSET_BASE}models/people/anims.${EXT}`),
    fetch(`${ASSET_BASE}models/people/anims.json`).then((r) => r.json() as Promise<Record<string, ClipInfo | number>>),
  ]).then(([g, meta]) => {
    const clips = new Map<string, THREE.AnimationClip>();
    for (const c of g.animations) clips.set(c.name, c);
    const info: Record<string, ClipInfo> = {};
    for (const [k, v] of Object.entries(meta)) if (typeof v === "object") info[k] = v;
    return { clips, info, hips: typeof meta._hips === "number" ? meta._hips : 0.93 };
  });
  return animsPromise;
}

/** Précharge une liste de personnages (et les animations). */
export function preloadPeople(ids: string[]): Promise<unknown> {
  return Promise.all([loadAnims(), ...ids.map(loadPerson)]);
}
