"use client";
/**
 * Petits objets physiques du bureau (Rapier) : tampon, stylo, balle anti-stress. On les attrape à la
 * souris / au doigt, on les soulève, on les lance ; ils rebondissent sur le plateau et les autres objets.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { BallCollider, CapsuleCollider, CuboidCollider, CylinderCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { audio } from "../audio/AudioEngine";
import { DESK_FAR, DESK_SPOTS, DESK_Y } from "./space";
import { useHub } from "./state";

type ToyKind = "stamp" | "pen" | "ball";

const HOLD_HEIGHT = 0.09;
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(DESK_Y + HOLD_HEIGHT));
const ray = new THREE.Raycaster();
const hit = new THREE.Vector3();
const ndc = new THREE.Vector2();

function Toy({ kind, position, rotation = 0 }: { kind: ToyKind; position: readonly [number, number, number]; rotation?: number }) {
  const body = useRef<RapierRigidBody>(null);
  const { camera, gl } = useThree();
  const drag = useRef<{ last: THREE.Vector3; vel: THREE.Vector3; t: number } | null>(null);
  const lastSound = useRef(0);
  const mats = useMemo(
    () => ({
      wood: new THREE.MeshStandardMaterial({ color: "#6b3f1f", roughness: 0.5 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.9 }),
      lacquer: new THREE.MeshStandardMaterial({ color: "#0d0d10", roughness: 0.2, metalness: 0.3 }),
      gold: new THREE.MeshStandardMaterial({ color: "#c9a24a", roughness: 0.3, metalness: 0.9 }),
      ball: new THREE.MeshStandardMaterial({ color: "#16223a", roughness: 0.75 }),
    }),
    [],
  );

  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const d = drag.current;
      const b = body.current;
      if (!d || !b) return;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      hit.x = THREE.MathUtils.clamp(hit.x, -0.6, 0.6);
      hit.z = THREE.MathUtils.clamp(hit.z, DESK_FAR + 0.05, -0.5);
      const now = performance.now();
      const dt = Math.max(0.008, (now - d.t) / 1000);
      d.vel.copy(hit).sub(d.last).divideScalar(dt).multiplyScalar(0.6).add(d.vel.multiplyScalar(0.4));
      d.last.copy(hit);
      d.t = now;
      b.setNextKinematicTranslation(hit);
    };
    const up = () => {
      const d = drag.current;
      const b = body.current;
      if (!d || !b) return;
      drag.current = null;
      el.style.cursor = "";
      b.setBodyType(0, true); // dynamique
      const v = d.vel.clampLength(0, 2.5);
      b.setLinvel({ x: v.x, y: Math.max(0.2, v.y + 0.4), z: v.z }, true);
      b.setAngvel({ x: v.z * 8, y: (Math.random() - 0.5) * 4, z: -v.x * 8 }, true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [camera, gl]);

  // Si un objet tombe du bureau, il revient à sa place.
  useFrame(() => {
    const b = body.current;
    if (!b) return;
    const p = b.translation();
    if (p.y < DESK_Y - 0.5) {
      b.setTranslation({ x: position[0], y: DESK_Y + 0.1, z: position[2] }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  });

  const grab = (e: ThreeEvent<PointerEvent>) => {
    if (useHub.getState().view || !body.current) return;
    e.stopPropagation();
    const b = body.current;
    const p = b.translation();
    b.setBodyType(2, true); // cinématique pendant qu'on le tient
    drag.current = { last: new THREE.Vector3(p.x, p.y, p.z), vel: new THREE.Vector3(), t: performance.now() };
    b.setNextKinematicTranslation({ x: p.x, y: DESK_Y + HOLD_HEIGHT, z: p.z });
    gl.domElement.style.cursor = "grabbing";
    void audio.sfx("sfx-paper-flip", { volume: 0.25, rate: 2 });
  };

  const onHit = () => {
    const b = body.current;
    if (!b) return;
    const v = b.linvel();
    const speed = Math.hypot(v.x, v.y, v.z);
    const now = performance.now();
    if (speed < 0.25 || now - lastSound.current < 90) return;
    lastSound.current = now;
    void audio.sfx(kind === "ball" ? "sfx-ball-bounce" : "sfx-desk-knock", { volume: Math.min(1, speed / 2), rate: 0.9 + Math.random() * 0.2 });
  };

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={[position[0], position[1] + 0.03, position[2]]}
      rotation={[0, rotation, 0]}
      restitution={kind === "ball" ? 0.72 : 0.2}
      friction={kind === "ball" ? 0.6 : 0.8}
      linearDamping={0.3}
      angularDamping={kind === "ball" ? 0.4 : 1.2}
      onCollisionEnter={onHit}
    >
      <group
        onPointerDown={grab}
        onPointerOver={() => !drag.current && !useHub.getState().view && (gl.domElement.style.cursor = "grab")}
        onPointerOut={() => !drag.current && (gl.domElement.style.cursor = "")}
      >
        {kind === "stamp" && (
          <>
            <CylinderCollider args={[0.04, 0.028]} position={[0, 0.04, 0]} mass={0.25} />
            <mesh material={mats.rubber} position={[0, 0.008, 0]}>
              <boxGeometry args={[0.06, 0.016, 0.04]} />
            </mesh>
            <mesh material={mats.wood} position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.012, 0.02, 0.03, 20]} />
            </mesh>
            <mesh material={mats.wood} position={[0, 0.058, 0]}>
              <sphereGeometry args={[0.02, 20, 14]} />
            </mesh>
          </>
        )}
        {kind === "pen" && (
          <>
            <CapsuleCollider args={[0.06, 0.006]} rotation={[0, 0, Math.PI / 2]} position={[0, 0.006, 0]} mass={0.03} />
            <mesh material={mats.lacquer} rotation={[0, 0, Math.PI / 2]} position={[0, 0.006, 0]}>
              <capsuleGeometry args={[0.0055, 0.12, 6, 16]} />
            </mesh>
            <mesh material={mats.gold} position={[0.045, 0.012, 0]}>
              <boxGeometry args={[0.035, 0.002, 0.003]} />
            </mesh>
          </>
        )}
        {kind === "ball" && (
          <>
            <BallCollider args={[0.032]} position={[0, 0.032, 0]} mass={0.05} />
            <mesh material={mats.ball} position={[0, 0.032, 0]}>
              <sphereGeometry args={[0.032, 32, 20]} />
            </mesh>
          </>
        )}
      </group>
    </RigidBody>
  );
}

/** Plateau, bords invisibles, et volumes des gros objets (pour que les petits rebondissent dessus). */
export function DeskColliders() {
  const S = DESK_SPOTS;
  return (
    <RigidBody type="fixed" colliders={false} friction={0.8}>
      <CuboidCollider args={[0.8, 0.02, 0.5]} position={[0, DESK_Y - 0.02, -0.75]} />
      <CuboidCollider args={[0.8, 0.2, 0.02]} position={[0, DESK_Y + 0.2, DESK_FAR - 0.02]} />
      <CuboidCollider args={[0.02, 0.2, 0.5]} position={[-0.72, DESK_Y + 0.2, -0.75]} />
      <CuboidCollider args={[0.02, 0.2, 0.5]} position={[0.72, DESK_Y + 0.2, -0.75]} />
      <CuboidCollider args={[0.8, 0.04, 0.02]} position={[0, DESK_Y + 0.04, -0.3]} />
      <CuboidCollider args={[0.12, 0.022, 0.16]} position={[S.cases[0], DESK_Y + 0.022, S.cases[2]]} />
      <CuboidCollider args={[0.23, 0.05, 0.17]} position={[S.briefcase[0], DESK_Y + 0.05, S.briefcase[2]]} />
      <CuboidCollider args={[0.11, 0.045, 0.1]} position={[S.phone[0], DESK_Y + 0.045, S.phone[2]]} rotation={[0, -0.35, 0]} />
      <CylinderCollider args={[0.06, 0.042]} position={[S.cup[0], DESK_Y + 0.06, S.cup[2]]} />
    </RigidBody>
  );
}

export function Toys() {
  const S = DESK_SPOTS;
  return (
    <>
      <Toy kind="stamp" position={S.stamp} rotation={0.4} />
      <Toy kind="pen" position={S.pen} rotation={-0.5} />
      <Toy kind="ball" position={S.ball} />
    </>
  );
}
