// /demo only: a double click (or more) on text makes all text one step bigger. No question asked.

/** Percent of the browser's normal size. The last step is the most the layout is meant to take. */
export const SIZES = [100, 112.5, 125, 137.5] as const;
export const BURST = { ms: 600, radius: 24 };
export interface Burst { t: number; x: number; y: number; count: number }

export const textKey = (user: string | null) => `attune-text:${user ?? "guest"}`;

/** Clicks close in time and place add up. A burst grows the text once, on its second click. */
export function nextBurst(last: Burst | null, t: number, x: number, y: number): Burst {
  const same = last !== null && t - last.t <= BURST.ms && Math.hypot(x - last.x, y - last.y) <= BURST.radius;
  return { t, x, y, count: same ? last.count + 1 : 1 };
}

/** A saved step; anything else reads as normal size. */
export function parseStep(v: unknown): number {
  const n = typeof v === "string" && v !== "" ? Number(v) : v;
  return typeof n === "number" && SIZES[n] !== undefined ? n : 0;
}
