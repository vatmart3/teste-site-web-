"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { drawPhoneScreen, phoneCanvas } from "./canvasTextures";
import { phone, useProps } from "./model";
import { useAnchor } from "./useAnchor";

/** Smartphone du joueur : SMS de Harlow dans le taxi, messagerie vocale dans l'ascenseur. */
export function Phone() {
  const group = useRef<THREE.Group>(null);
  const screen = useProps((s) => s.phoneScreen);
  const { body, bodyMat, tex, screenMat } = useMemo(() => {
    const c = phoneCanvas();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return {
      body: new RoundedBoxGeometry(0.075, 0.155, 0.008, 4, 0.009),
      bodyMat: new THREE.MeshPhysicalMaterial({ color: "#1c1e24", metalness: 0.7, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 }),
      tex: t,
      screenMat: new THREE.MeshBasicMaterial({ map: t, toneMapped: false }),
    };
  }, []);
  const lastProgress = useRef(-1);

  useEffect(() => {
    drawPhoneScreen(tex.image as HTMLCanvasElement, screen, phone.progress);
    tex.needsUpdate = true;
    lastProgress.current = phone.progress;
  }, [screen, tex]);

  useAnchor("phone", group);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const vib = phone.vibrate;
    // Vibration : secousses rapides, par salves.
    const buzz = vib * (Math.sin(t * 90) * 0.0025 + Math.sin(t * 131) * 0.0015) * (Math.sin(t * 9) > 0 ? 1 : 0.2);
    g.position.set(phone.x + buzz, phone.y, phone.z);
    g.rotation.set(phone.rx, phone.ry, phone.rz + buzz * 4);
    g.scale.setScalar(phone.scale);
    g.visible = phone.opacity > 0.01;
    screenMat.color.setScalar(Math.min(0.72, phone.opacity * 0.72));
    if (screen.mode === "voicemail" && Math.abs(phone.progress - lastProgress.current) > 0.01) {
      drawPhoneScreen(tex.image as HTMLCanvasElement, screen, phone.progress);
      tex.needsUpdate = true;
      lastProgress.current = phone.progress;
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={body} material={bodyMat} />
      <mesh position={[0, 0, 0.0042]} material={screenMat}>
        <planeGeometry args={[0.068, 0.147]} />
      </mesh>
    </group>
  );
}
