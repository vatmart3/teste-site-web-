"use client";
/** Vidéos d'états d'un personnage (idle, talk, pleased, tense, break), chargées si présentes dans le manifeste. */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CharacterId, CharacterState } from "@/content/characters";
import { loadManifest, resolveCharacterVideo } from "../assets/manifest";

const STATES: CharacterState[] = ["idle", "talk", "pleased", "tense", "break"];
const cache = new Map<string, THREE.VideoTexture>();

function videoTexture(key: string, src: { webm: string | null; mp4: string | null }): THREE.VideoTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const el = document.createElement("video");
  el.muted = true;
  el.loop = true;
  el.playsInline = true;
  el.preload = "auto";
  el.crossOrigin = "anonymous";
  for (const [url, type] of [
    [src.webm, "video/webm"],
    [src.mp4, "video/mp4"],
  ] as const) {
    if (!url) continue;
    const s = document.createElement("source");
    s.src = url;
    s.type = type;
    el.appendChild(s);
  }
  void el.play().catch(() => undefined);
  const t = new THREE.VideoTexture(el);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  cache.set(key, t);
  return t;
}

export function useCharacterVideos(id: CharacterId | null): Partial<Record<CharacterState, THREE.VideoTexture>> {
  const map = useMemo<Partial<Record<CharacterState, THREE.VideoTexture>>>(() => ({}), []);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    void loadManifest().then((m) => {
      if (!alive) return;
      for (const st of STATES) {
        const src = resolveCharacterVideo(m, id, st);
        if (src) map[st] = videoTexture(`${id}-${st}`, src);
      }
    });
    return () => {
      alive = false;
    };
  }, [id, map]);
  return map;
}
