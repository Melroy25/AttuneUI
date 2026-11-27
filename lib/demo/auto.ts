// /demo only: adapt without waiting for a button. The study still decides at block boundaries.
import { frictionCount } from "../attune-ui/telemetry/friction";
import type { FrictionSummary } from "../attune-ui/types";

export const AUTO_STRUGGLES = 3;
/** Minimum gap between automatic changes, so the page does not jump around. */
export const AUTO_COOLDOWN_MS = 8_000;

export const shouldAdapt = (sinceLast: FrictionSummary, msSinceLast: number): boolean =>
  frictionCount(sinceLast) >= AUTO_STRUGGLES && msSinceLast >= AUTO_COOLDOWN_MS;
