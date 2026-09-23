/** Bureau (plan + lumière) du rang donné. */
import { newYorkTime } from "@/lib/time";
import { officeVariant } from "../hub/space";
import { RANKS } from "./ranks";
import type { LightVariant } from "@/content/types";

export function officeFor(rank: number, forceVariant?: LightVariant) {
  const r = RANKS[rank] ?? RANKS[0]!;
  const variant: LightVariant | undefined = forceVariant ?? (r.office === "08-desk-intern-night" ? undefined : officeVariant(newYorkTime().hours));
  return { scene: r.office, variant };
}
