// Plain-English account of the current layout, built only from what the session recorded.
import { ARM_IDS, type ArmId, type FrictionSummary } from "../attune-ui/types";
import type { DemoSession } from "./session";

export const SURFACE_NAMES: Record<ArmId, string> = {
  baseline: "Static layout",
  ergonomic: "Large touch targets",
  disclosure: "Simplified filters",
  shortcut: "Quick actions",
  guided: "Step hints",
};

const percent = (p: number) => `${Math.round(p * 100)}%`;

export function describeFriction(f: FrictionSummary): string {
  const labels: [number, string][] = [
    [f.rage, "rage-click burst"], [f.dead, "dead click"], [f.miss, "missed tap"],
    [f.dwell, "long hover"], [f.thrash, "scroll thrash"], [f.backtrack, "backtrack"],
  ];
  const seen = labels.filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}${n > 1 && !label.endsWith("thrash") ? "s" : ""}`);
  if (f.tortuosity > 3) seen.push("a wandering cursor path");
  return seen.length > 0 ? seen.join(", ") : "no friction signals";
}

export function explain(session: DemoSession): string[] {
  const { mode, friction, decision, rendered, pinned, preview } = session;
  if (preview) {
    return [`You picked "${SURFACE_NAMES[rendered]}" by hand to look at it. The model did not choose it and learns nothing from this block.`];
  }
  if (!mode || !friction) {
    return ["No decision yet: this is the starting layout. Use the store, then trigger an adaptation."];
  }
  const out = [`In the last block the app saw ${describeFriction(friction)}.`];
  if (!decision) {
    out.push("Static mode: the layout is never changed.");
  } else {
    const chosen = SURFACE_NAMES[decision.action];
    const p = percent(decision.propensity);
    const top = ARM_IDS.reduce((best, a) => (decision.probs[a] > decision.probs[best] ? a : best));
    if (mode === "placebo") {
      out.push(`Random placebo ignored that behaviour and drew "${chosen}" from fixed frequencies (probability ${p}).`);
    } else if (decision.probs[decision.action] >= decision.probs[top]) {
      out.push(`AttuneUI chose "${chosen}": for this context it had the highest probability (${p}).`);
    } else {
      out.push(`AttuneUI sampled "${chosen}" (${p}) although "${SURFACE_NAMES[top]}" was more likely (${percent(decision.probs[top])}). This exploration is how it keeps learning.`);
    }
  }
  const wanted = decision?.action ?? "baseline";
  if (rendered !== wanted) {
    out.push(`You are seeing "${SURFACE_NAMES[rendered]}" because the layout was ${pinned ? "pinned" : "pinned or reverted"} by you.`);
  }
  return out;
}
