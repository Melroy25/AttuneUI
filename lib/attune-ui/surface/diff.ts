import type { SurfaceConfig } from "./catalog";

/** Plain-language list of what differs between two surfaces. */
export function describeChanges(from: SurfaceConfig, to: SurfaceConfig): string[] {
  const out: string[] = [];
  const toggle = (before: boolean, after: boolean, label: string) => {
    if (before !== after) out.push(`${label} ${after ? "added" : "removed"}`);
  };
  if (from.targetSize !== to.targetSize) {
    out.push(to.targetSize === "large" ? "Touch targets enlarged to 48 px" : "Targets back to compact");
  }
  toggle(from.thumbZoneCta, to.thumbZoneCta, "Large refund button");
  if (from.secondaryFilters !== to.secondaryFilters) {
    out.push(`Secondary filters ${to.secondaryFilters}`);
  }
  toggle(from.smartPresets, to.smartPresets, "Filter presets");
  toggle(from.quickActions.length > 0, to.quickActions.length > 0, "Quick-action bar");
  toggle(from.actionableBadge, to.actionableBadge, "Clickable refund badge");
  toggle(from.stepHints, to.stepHints, "Step hints");
  return out;
}
