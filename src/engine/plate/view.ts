/** Paramètres de vue courants (partagés par le shader, les hotspots, la plate CSS et le son). */
import type { SceneDef } from "@/content/types";
import type { CameraRig } from "../camera/rig";
import { coverScale, fromAuthoring, type CoverParams, type ProjectionParams } from "./projection";

export function viewParams(
  scene: Pick<SceneDef, "aspect" | "pivot" | "parallax">,
  r: CameraRig,
  width: number,
  height: number,
): { cover: CoverParams; proj: ProjectionParams } {
  const viewAspect = width / Math.max(1, height);
  return {
    cover: {
      scale: coverScale(viewAspect, scene.aspect),
      pan: r.pan,
      roll: (r.roll * Math.PI) / 180,
      viewAspect,
    },
    proj: {
      offset: { x: r.offset.x * scene.parallax, y: r.offset.y * scene.parallax },
      pivot: scene.pivot,
      dolly: r.dolly,
      dollyCenter: fromAuthoring({ x: r.dollyX, y: r.dollyY }),
    },
  };
}
