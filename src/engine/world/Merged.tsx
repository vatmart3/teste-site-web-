"use client";
/**
 * Fusionne la géométrie statique d'un sous-arbre par matériau (et par ombre portée) : des centaines de
 * petits meubles deviennent quelques dizaines d'appels de dessin. Les lumières et les maillages
 * instanciés sont conservés tels quels.
 */
import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function Merged({ children, deps = [] }: { children: ReactNode; deps?: unknown[] }) {
  const src = useRef<THREE.Group>(null);
  const out = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = src.current;
    const o = out.current;
    if (!g || !o) return;
    // Laisse React finir de monter (géométries asynchrones exclues), puis fusionne.
    const id = window.setTimeout(() => {
      g.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
      const buckets = new Map<string, { mat: THREE.Material; cast: boolean; geos: THREE.BufferGeometry[] }>();
      const hide: THREE.Mesh[] = [];
      g.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material) || m.userData.noMerge) return;
        const geo = m.geometry.index ? m.geometry.clone() : null;
        if (!geo) return;
        for (const k of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(k)) geo.deleteAttribute(k);
        if (!geo.attributes.uv) return;
        geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
        const key = `${m.material.uuid}|${m.castShadow ? 1 : 0}`;
        let b = buckets.get(key);
        if (!b) buckets.set(key, (b = { mat: m.material, cast: m.castShadow, geos: [] }));
        b.geos.push(geo);
        hide.push(m);
      });
      for (const b of buckets.values()) {
        const merged = mergeGeometries(b.geos, false);
        if (!merged) continue;
        const mesh = new THREE.Mesh(merged, b.mat);
        mesh.castShadow = b.cast;
        mesh.receiveShadow = true;
        o.add(mesh);
        for (const x of b.geos) x.dispose();
      }
      for (const m of hide) m.visible = false;
    }, 50);
    return () => {
      window.clearTimeout(id);
      for (const c of [...o.children]) {
        (c as THREE.Mesh).geometry?.dispose();
        o.remove(c);
      }
      g.traverse((obj) => ((obj as THREE.Mesh).isMesh ? (obj.visible = true) : undefined));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return (
    <>
      <group ref={src}>{children}</group>
      <group ref={out} />
    </>
  );
}
