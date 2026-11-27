// /demo only: a product card offers help only when the user looks confused, never on one click.

export const CONFUSION = { taps: 4, tapMs: 3000, slowTaps: 2, slowMs: 10_000, reversals: 2 };

/** `taps`: dead taps on one card; `reversals`: changes of scroll direction. Both are times in ms. */
export function confused(taps: number[], reversals: number[], now: number): "rapid" | "scrolling" | null {
  const within = (times: number[], ms: number) => times.filter((t) => now - t <= ms).length;
  if (within(taps, CONFUSION.tapMs) >= CONFUSION.taps) return "rapid";
  const back = within(reversals, CONFUSION.slowMs) >= CONFUSION.reversals;
  return back && within(taps, CONFUSION.slowMs) >= CONFUSION.slowTaps ? "scrolling" : null;
}
