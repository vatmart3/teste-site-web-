"use client";
/**
 * Silhouettes des scènes (collègues derrière les vitres, vigile, public, photographes, Harlow devant la baie) :
 * ce sont désormais de vrais humains animés (people/RealPerson). Les anciennes couleurs de tenue restent
 * acceptées pour compatibilité mais l'apparence vient du modèle (figurant choisi par la graine).
 */
import type { CharacterId } from "@/content/characters";
import { RealPerson, crowdModel } from "../people/RealPerson";

export type MannequinPose = "stand" | "sit" | "phone";

export interface MannequinProps {
  pose?: MannequinPose;
  suit?: string;
  shirt?: string;
  tie?: string | null;
  skin?: string;
  hair?: string;
  height?: number;
  build?: number;
  position?: [number, number, number];
  rotationY?: number;
  /** Rotation animée de tout le corps (Harlow qui se retourne) : objet mutable {value}. */
  turn?: { value: number };
  seed?: number;
  /** Modèle précis (« harlow », « guard »…) ; sinon un figurant allégé. */
  model?: string;
  who?: CharacterId;
  /** Où regarde-t-il ? (défaut : la caméra). */
  lookAt?: [number, number, number] | "camera" | null;
  /** Action en boucle (« type » à un bureau...). */
  anim?: string;
}

export function Mannequin({ pose = "stand", position = [0, 0, 0], rotationY = 0, turn, seed = 1, model, who, lookAt = "camera", anim }: MannequinProps) {
  const standAnim = !model && seed % 3 === 0 ? "idleWait" : undefined;
  return (
    <RealPerson
      model={model ?? crowdModel(seed)}
      who={who}
      pose={pose === "sit" ? "sit" : "stand"}
      anim={anim ?? (pose === "phone" ? "phone" : pose === "sit" ? undefined : standAnim)}
      position={position}
      rotationY={rotationY}
      turn={turn}
      seed={seed}
      lookAt={lookAt}
    />
  );
}
