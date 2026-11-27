import type { ArmId } from "../types";

export const QUICK_ACTIONS = ["findDelayed", "filterRefunds", "refund"] as const;
export type QuickAction = (typeof QUICK_ACTIONS)[number];

/** Everything an adaptation may change. Navigation and landmarks are not expressible. */
export interface SurfaceConfig {
  arm: ArmId;
  targetSize: "compact" | "large"; // large = 48px+
  thumbZoneCta: boolean;
  secondaryFilters: "expanded" | "collapsed";
  smartPresets: boolean;
  quickActions: QuickAction[]; // duplicates; original menu paths stay
  actionableBadge: boolean;
  stepHints: boolean;
}

const BASE: SurfaceConfig = {
  arm: "baseline",
  targetSize: "compact",
  thumbZoneCta: false,
  secondaryFilters: "expanded",
  smartPresets: false,
  quickActions: [],
  actionableBadge: false,
  stepHints: false,
};

export const SURFACES: Record<ArmId, SurfaceConfig> = {
  baseline: BASE,
  ergonomic: { ...BASE, arm: "ergonomic", targetSize: "large", thumbZoneCta: true },
  disclosure: { ...BASE, arm: "disclosure", secondaryFilters: "collapsed", smartPresets: true },
  shortcut: { ...BASE, arm: "shortcut", quickActions: [...QUICK_ACTIONS], actionableBadge: true },
  guided: { ...BASE, arm: "guided", stepHints: true },
};
