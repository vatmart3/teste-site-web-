"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { getScene } from "@/content/scenes";
import { audio } from "../audio/AudioEngine";
import { rig } from "../camera/rig";
import { hotspotBus } from "../director/events";
import { fromAuthoring, imageToScreen } from "../plate/projection";
import { viewParams } from "../plate/view";
import { useProfile } from "../state/profile";
import { useStage } from "../state/stage";
import { loadAvatar } from "./avatars";
import { drawBadgeBack, drawBadgeFront } from "./canvasTextures";
import { badge, cameraToScreen, PROP_FOV, screenToCamera, useProps } from "./model";
import { useAnchor } from "./useAnchor";

/** Position écran (uv GL) du lecteur de badge du hall, ou null si on n'est pas dans le hall. */
export function readerScreen(width: number, height: number): { x: number; y: number } | null {
  const cur = useStage.getState().current;
  if (!cur || cur.sceneId !== "03-lobby") return null;
  const scene = getScene("03-lobby");
  const hs = scene.hotspots?.find((h) => h.id === "reader");
  if (!hs) return null;
  const { cover, proj } = viewParams(scene, rig, width, height);
  return imageToScreen(fromAuthoring(hs.at), hs.depth, proj, cover);
}

function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Badge PVC au nom du joueur, avec sa photo. Se saisit et se glisse sur le lecteur. */
export function Badge() {
  const group = useRef<THREE.Group>(null);
  const { firstName, lastName, avatar } = useProfile();
  const draggable = useProps((s) => s.badgeDraggable);
  const { size, gl } = useThree();
  const [photo, setPhoto] = useState<CanvasImageSource | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    let alive = true;
    void loadAvatar(avatar).then((img) => alive && setPhoto(img));
    return () => {
      alive = false;
    };
  }, [avatar]);

  const id = useMemo(() => `HV-52-${String(Math.abs((firstName + lastName).split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 100000).padStart(5, "0")}`, [firstName, lastName]);
  const front = useMemo(() => texture(drawBadgeFront({ firstName, lastName, photo, id })), [firstName, lastName, photo, id]);
  const back = useMemo(() => texture(drawBadgeBack()), []);
  const body = useMemo(() => new RoundedBoxGeometry(0.054, 0.086, 0.0012, 3, 0.0035), []);
  const bodyMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#d9d4ca", roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.2 }), []);
  const frontMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ map: front, color: "#cfcac0", roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.12, iridescence: 0.25, iridescenceIOR: 1.6, transparent: true, alphaTest: 0.5 }),
    [front],
  );
  const backMat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: back, color: "#cfcac0", roughness: 0.5, clearcoat: 0.8, transparent: true, alphaTest: 0.5 }), [back]);

  useAnchor("badge", group);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const f = dragging.current ? 0 : badge.float;
    g.position.set(badge.x + Math.sin(t * 0.9) * 0.002 * f, badge.y + Math.sin(t * 1.3) * 0.003 * f, badge.z);
    g.rotation.set(badge.rx + Math.sin(t * 0.7) * 0.05 * f, badge.ry + Math.sin(t * 0.5) * 0.08 * f, badge.rz);
    g.scale.setScalar(badge.scale);
    g.visible = badge.opacity > 0.01;
  });

  // --- Glisser-déposer sur le lecteur.
  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const rect = el.getBoundingClientRect();
      const u = (e.clientX - rect.left) / rect.width;
      const v = 1 - (e.clientY - rect.top) / rect.height;
      const p = screenToCamera(u, v, badge.z, PROP_FOV, rect.width / rect.height);
      badge.x = p.x;
      badge.y = p.y;
      badge.rz = (u - 0.5) * -0.3;
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      el.style.cursor = "";
      const reader = readerScreen(size.width, size.height);
      const s = cameraToScreen(badge.x, badge.y, badge.z, PROP_FOV, size.width / size.height);
      const near = reader && Math.hypot((s.u - reader.x) * (size.width / size.height), s.v - reader.y) < 0.14;
      if (near) hotspotBus.emit("reader");
      else gsap.to(badge, { x: 0, y: -0.01, rz: 0, duration: 0.6, ease: "back.out(1.6)" });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl, size]);

  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!useProps.getState().badgeDraggable) return;
    e.stopPropagation();
    gsap.killTweensOf(badge);
    dragging.current = true;
    gl.domElement.style.cursor = "grabbing";
    void audio.sfx("sfx-paper-flip", { volume: 0.4, rate: 1.6 });
  };

  return (
    <group ref={group} onPointerDown={down} onPointerOver={() => draggable && (gl.domElement.style.cursor = "grab")} onPointerOut={() => !dragging.current && (gl.domElement.style.cursor = "")}>
      <mesh geometry={body} material={bodyMat} />
      <mesh position={[0, 0, 0.00062]} material={frontMat}>
        <planeGeometry args={[0.054, 0.086]} />
      </mesh>
      <mesh position={[0, 0, -0.00062]} rotation={[0, Math.PI, 0]} material={backMat}>
        <planeGeometry args={[0.054, 0.086]} />
      </mesh>
    </group>
  );
}
