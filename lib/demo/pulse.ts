// X-Ray only: names the friction a single click shows, using the friction engine's thresholds.
import { THRESHOLDS } from "../attune-ui/telemetry/friction";
import type { Tap } from "./comfort";

export type Pulse = "Dead click" | "Small target miss" | "Rage click";

/** `labelled`: the click did nothing on something that carries a name, as the engine counts dead. */
export function pulseFor(earlier: Tap[], tap: Tap, labelled: boolean): Pulse | null {
  const cluster = earlier.filter((e) => tap.t - e.t <= THRESHOLDS.rageWindowMs &&
    Math.hypot(e.x - tap.x, e.y - tap.y) <= THRESHOLDS.rageRadiusPx);
  if (cluster.length >= THRESHOLDS.rageCount - 1) return "Rage click";
  if (tap.control) return null;
  if (tap.small && tap.distance <= THRESHOLDS.missHaloPx) return "Small target miss";
  return labelled ? "Dead click" : null;
}
