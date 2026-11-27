// /demo only: bigger tap targets after problem taps on small ones, with before/after counts.

export interface Tally { taps: number; misses: number; rage: number; nearby: number }
export interface Comfort {
  on: boolean;
  reverted: boolean; // the user said no: never switched on again until Reset
  before: Tally; // taps at normal size
  after: Tally; // taps at the bigger size
}
export interface Tap {
  t: number; x: number; y: number;
  control: string | null; // which control was hit; null for none
  distance: number; // px to the nearest control
  small: boolean; // that control is under 44 px or crowded
}
type Kind = "misses" | "rage" | "nearby";
export interface Recent { taps: Tap[]; problems: { t: number; kind: Kind }[] }

export const RULES = {
  needed: 2, windowMs: 30_000, rageCount: 3, rageMs: 1000, radius: 40, halo: 24, correctionMs: 1500, size: 44, gap: 8,
};
const NONE: Tally = { taps: 0, misses: 0, rage: 0, nearby: 0 };
export const NO_COMFORT: Comfort = { on: false, reverted: false, before: NONE, after: NONE };
export const NO_RECENT: Recent = { taps: [], problems: [] };
export const comfortKey = (user: string | null) => `attune-comfort:${user ?? "guest"}`;

export const isSmall = (width: number, height: number, gap: number) =>
  width < RULES.size || height < RULES.size || gap < RULES.gap;

/** The same definitions at both sizes, so before and after can be compared. */
function problemOf(earlier: Tap[], tap: Tap): Kind | null {
  const near = (other: Tap) => Math.hypot(other.x - tap.x, other.y - tap.y) <= RULES.radius;
  if (earlier.filter((e) => tap.t - e.t <= RULES.rageMs && near(e)).length >= RULES.rageCount - 1) return "rage";
  if (!tap.control) return tap.distance <= RULES.halo ? "misses" : null;
  const last = earlier.at(-1);
  // Another control right after, in the same spot: the first one was hit by accident.
  return last?.control && last.control !== tap.control && tap.t - last.t <= RULES.correctionMs && near(last) ? "nearby" : null;
}

export function recordTap(state: Comfort, recent: Recent, tap: Tap, canAdapt: boolean) {
  const kind = problemOf(recent.taps, tap);
  const side = state.on ? "after" : "before";
  const tally = { ...state[side], taps: state[side].taps + 1 };
  if (kind) tally[kind]++;
  const problems = [...recent.problems.filter((p) => tap.t - p.t <= RULES.windowMs),
    ...(kind && tap.small ? [{ t: tap.t, kind }] : [])];
  const adapt = canAdapt && !state.on && !state.reverted && problems.length >= RULES.needed;
  const count = (k: Kind) => problems.filter((p) => p.kind === k).length;
  return {
    state: { ...state, [side]: tally, on: state.on || adapt },
    // A counted rage cluster, or a change of size, starts afresh.
    recent: adapt ? NO_RECENT : { taps: kind === "rage" ? [] : [...recent.taps, tap].slice(-5), problems },
    reason: adapt
      ? `Small targets: ${count("misses")} missed, ${count("rage")} rage, ${count("nearby")} accidental taps`
      : null,
  };
}

export const revert = (state: Comfort): Comfort => ({ ...state, on: false, reverted: true });

const tally = (v: unknown): Tally => {
  const from = (v ?? {}) as Partial<Record<keyof Tally, unknown>>;
  const n = (x: unknown) => (Number.isInteger(x) && (x as number) >= 0 ? (x as number) : 0);
  return { taps: n(from.taps), misses: n(from.misses), rage: n(from.rage), nearby: n(from.nearby) };
};

/** Storage, uploads and documents are untrusted: anything that does not fit reads as nothing. */
export function parseComfort(v: unknown): Comfort {
  const c = (v ?? {}) as Partial<Comfort>;
  return { on: c.on === true, reverted: c.reverted === true, before: tally(c.before), after: tally(c.after) };
}

const larger = (a: Tally, b: Tally): Tally => ({
  taps: Math.max(a.taps, b.taps), misses: Math.max(a.misses, b.misses),
  rage: Math.max(a.rage, b.rage), nearby: Math.max(a.nearby, b.nearby),
});

/** Counts never fall; the switch itself comes from the newer copy. */
export const keepCounts = (older: Comfort, newer: Comfort): Comfort =>
  ({ ...newer, before: larger(older.before, newer.before), after: larger(older.after, newer.after) });
