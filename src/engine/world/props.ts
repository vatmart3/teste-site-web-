/** Petits objets tenus en main : tasse de café, chemise cartonnée, enveloppe. */
import * as THREE from "three";

export function coffeeCup(): THREE.Object3D {
  const g = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.09, 20), new THREE.MeshPhysicalMaterial({ color: "#f4f1ea", roughness: 0.3, clearcoat: 0.6 }));
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.012, 20), new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.5 }));
  lid.position.y = 0.05;
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.035, 0.035, 20), new THREE.MeshStandardMaterial({ color: "#8a6a44", roughness: 0.9 }));
  sleeve.position.y = -0.005;
  g.add(cup, lid, sleeve);
  g.rotation.x = Math.PI / 2;
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return g;
}

export function folder(color = "#d8c08a"): THREE.Object3D {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.32), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.245, 0.022, 0.03), new THREE.MeshStandardMaterial({ color: "#8a1c1c", roughness: 0.7 }));
  g.add(m, band);
  g.rotation.set(0.2, 0, Math.PI / 2);
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return g;
}

export function envelope(): THREE.Object3D {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.005, 0.22), new THREE.MeshStandardMaterial({ color: "#efe8d8", roughness: 0.8 }));
  m.rotation.set(0.2, 0, Math.PI / 2);
  m.castShadow = true;
  return m;
}
