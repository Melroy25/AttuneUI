import type { FrictionSummary, InteractionEvent, Modality } from "../types";

export const THRESHOLDS = {
  rageCount: 3,
  rageWindowMs: 1000,
  rageRadiusPx: 40,
  missHaloPx: 24,
  dwellMs: 1500,
  thrashReversals: 4,
  thrashWindowMs: 2000,
} as const;

type Down = Extract<InteractionEvent, { type: "down" }>;

function countRage(downs: Down[]): number {
  let count = 0;
  for (let i = 0; i < downs.length; ) {
    const first = downs[i];
    let j = i + 1;
    while (
      j < downs.length &&
      downs[j].t - first.t <= THRESHOLDS.rageWindowMs &&
      Math.hypot(downs[j].x - first.x, downs[j].y - first.y) <= THRESHOLDS.rageRadiusPx
    ) j++;
    if (j - i >= THRESHOLDS.rageCount) {
      count++;
      i = j; // clusters never overlap
    } else i++;
  }
  return count;
}

function countThrash(ys: { t: number; y: number }[]): number {
  let count = 0;
  let direction = 0;
  let reversals: number[] = [];
  for (let i = 1; i < ys.length; i++) {
    const d = Math.sign(ys[i].y - ys[i - 1].y);
    if (d === 0) continue;
    if (direction !== 0 && d !== direction) {
      const t = ys[i].t;
      reversals = [...reversals.filter((r) => t - r <= THRESHOLDS.thrashWindowMs), t];
      if (reversals.length >= THRESHOLDS.thrashReversals) {
        count++;
        reversals = [];
      }
    }
    direction = d;
  }
  return count;
}

// shortcut: one ratio over the whole window; segment by click if it proves too coarse.
function tortuosity(moves: { x: number; y: number }[]): number {
  if (moves.length < 3) return 1;
  let path = 0;
  for (let i = 1; i < moves.length; i++) {
    path += Math.hypot(moves[i].x - moves[i - 1].x, moves[i].y - moves[i - 1].y);
  }
  const first = moves[0];
  const last = moves[moves.length - 1];
  return path / Math.max(Math.hypot(last.x - first.x, last.y - first.y), THRESHOLDS.rageRadiusPx);
}

/** `events` must be in time order. */
export function summarizeFriction(events: InteractionEvent[], modality: Modality): FrictionSummary {
  const of = <T extends InteractionEvent["type"]>(type: T) =>
    events.filter((e): e is Extract<InteractionEvent, { type: T }> => e.type === type);

  const downs = of("down");
  let dead = 0;
  let miss = 0;
  for (const d of downs) {
    if (d.interactive) continue;
    // A labelled element was aimed at, even when a real target sits close by.
    if (d.targetId !== null) dead++;
    else if (d.nearTargetPx !== null && d.nearTargetPx <= THRESHOLDS.missHaloPx) miss++;
  }
  const views = of("view");
  let backtrack = 0;
  for (let i = 2; i < views.length; i++) {
    if (views[i].view === views[i - 2].view && views[i].view !== views[i - 1].view) backtrack++;
  }
  const fine = modality === "fine";
  return {
    rage: countRage(downs),
    dead,
    miss,
    dwell: fine ? of("hover").filter((h) => h.durationMs > THRESHOLDS.dwellMs).length : 0,
    thrash: countThrash(of("scroll")),
    backtrack,
    tortuosity: fine ? Math.max(1, tortuosity(of("move"))) : 1,
  };
}

export function frictionCount(s: FrictionSummary): number {
  return s.rage + s.dead + s.miss + s.dwell + s.thrash + s.backtrack;
}
