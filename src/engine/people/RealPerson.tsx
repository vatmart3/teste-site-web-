"use client";
/**
 * Un humain réaliste dans une scène mise en scène (tribunal, hall, bureau d'angle...) : posture (debout,
 * assis), action en boucle, regard vers la caméra ou un point, parole synchronisée sur la voix, micro-signes
 * de nervosité (sueur → sourcils, regard fuyant, déglutition, mains sur le visage) pour le gameplay.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CharacterId } from "@/content/characters";
import { cast, stateOf } from "../characters/performance";
import { tellsOf } from "../room/Actor";
import { Person } from "./Person";

export interface RealPersonProps {
  /** Modèle (personnage, figurant « extra-n », foule « crowd-n »). */
  model: string;
  /** Personnage de l'histoire (parole, états, micro-signes). */
  who?: CharacterId;
  pose?: "stand" | "sit";
  /** Action en boucle (« talk », « idleWait », « phone »...), ou haut du corps si assis. */
  anim?: string;
  position: [number, number, number];
  rotationY?: number;
  /** Cible du regard (monde) ou « camera ». */
  lookAt?: [number, number, number] | "camera" | null;
  /** Rotation animée ajoutée (Harlow qui se retourne). */
  turn?: { value: number };
  /** Décalage de phase des animations (foule : chacun à son rythme). */
  seed?: number;
}

const T = new THREE.Vector3();

export function RealPerson({ model, who, pose = "stand", anim, position, rotationY = 0, lookAt = "camera", turn, seed = 0 }: RealPersonProps) {
  // Pas de nettoyage destructeur : en mode strict, React démonte / remonte les effets avec le même objet.
  const person = useMemo(() => new Person(model), [model]);
  const talking = useRef(false);
  useEffect(() => {
    let alive = true;
    void person.ready.then(() => {
      if (!alive) return;
      if (pose === "sit") person.sit(anim);
      else if (anim) void person.play(anim, { fade: 0.01, at: (seed % 97) * 0.13 });
      // Premier pas de mixage tout de suite : pas d'image en pose de repos.
      person.update(0.016);
    });
    return () => {
      alive = false;
    };
  }, [person, pose, anim, seed]);

  useFrame(({ camera }, dt) => {
    const r = person.root;
    r.position.set(position[0], position[1], position[2]);
    r.rotation.y = rotationY + (turn?.value ?? 0);
    const speaking = !!who && cast.speaker === who;
    person.talk = speaking ? Math.max(0.2, cast.level) : 0;
    // Qui parle gesticule (assis : gestes du haut du corps ; debout : conversation).
    if (speaking !== talking.current && person.model) {
      talking.current = speaking;
      if (speaking) void person.play(pose === "sit" ? "sitTalk" : "talk", { mask: "upper", fade: 0.5 });
      else if (pose === "sit") person.sit(anim);
      else if (anim) void person.play(anim, { fade: 0.5 });
      else person.stop(0.6);
    }
    let target: THREE.Vector3 | null = null;
    if (lookAt === "camera") target = T.copy(camera.position);
    else if (lookAt) target = T.set(lookAt[0], lookAt[1], lookAt[2]);
    if (who) {
      const tl = tellsOf(who);
      const st = stateOf(who);
      // Regard fuyant : on regarde à côté, vers le bas.
      if (target && tl.gazeAway > 0.05) target.add(new THREE.Vector3(1.2 * tl.gazeAway, -0.6 * tl.gazeAway, 0));
      const tense = st === "tense" || st === "break";
      person.expr.browInner = Math.min(1, tl.sweat * 0.8 + (tense ? 0.35 : 0));
      person.expr.frown = Math.min(1, tl.sweat * 0.4 + (st === "break" ? 0.6 : 0));
      person.expr.press = tl.swallow > 0.3 ? 0.8 : 0;
      person.expr.smile = st === "pleased" ? 0.5 : 0;
      person.expr.browUp = tl.surprise * 0.8;
      person.expr.squint = st === "tense" ? 0.25 : 0;
      if (tl.headInHands > 0.5 && person.current !== "think") void person.play("think", { mask: pose === "sit" ? "upper" : "full" });
      else if (tl.headInHands <= 0.5 && person.current === "think" && anim !== "think") {
        if (pose === "sit") person.sit(anim);
        else person.stop();
      }
    }
    person.lookAt = target;
    person.lookWeight = 0.85;
    person.update(dt);
  });
  return <primitive object={person.root} />;
}

/** Figurant au hasard (jurés, public) : un modèle de foule allégé. */
export function crowdModel(seed: number): string {
  return `crowd-${(Math.abs(seed) % 6) + 1}`;
}
