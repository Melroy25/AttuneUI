import type { FrictionSummary, Modality, PointerKind } from "../types";

export const FEATURES = [
  "bias", "narrow", "familiarity", "dead", "rage", "miss", "hesitation",
] as const;
export const DIM = FEATURES.length;

export function modalityOf(pointer: PointerKind): Modality {
  return pointer === "touch" ? "coarse" : "fine";
}

const unit = (value: number, scale: number) => Math.min(Math.max(value / scale, 0), 1);

/** Built from pre-decision events only. Order matches FEATURES. */
export function buildContext(input: {
  friction: FrictionSummary;
  viewportWidth: number;
  priorSessions: number;
}): number[] {
  const f = input.friction;
  const tortuous = f.tortuosity > 3 ? 1 : 0;
  return [
    1,
    input.viewportWidth < 768 ? 1 : 0,
    unit(input.priorSessions, 5),
    unit(f.dead, 3),
    unit(f.rage, 3),
    unit(f.miss, 3),
    unit(f.dwell + f.thrash + f.backtrack + tortuous, 3),
  ];
}
