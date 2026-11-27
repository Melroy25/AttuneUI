// /demo only: bigger hit areas on the very controls that were missed, with before/after counts.
// Nothing else on the page changes size.

export interface Tally { taps: number; misses: number; rage: number; nearby: number }
export interface Comfort {
  on: boolean; // true while any control is enlarged
  reverted: boolean; // the user said no: never switched on again until Reset
  targets: string[]; // the enlarged controls, by targetKey
  before: Tally; // taps while nothing was enlarged
  after: Tally; // taps while something was
}
export interface Tap {
  t: number; x: number; y: number;
  control: string | null; // which control was hit; null for none
  target?: string | null; // key of the control hit or, for a miss, the nearest one
  distance: number; // px to the nearest control
  small: boolean; // that control is under 44 px or crowded
}
type Kind = "misses" | "rage" | "nearby";
export interface Recent { taps: Tap[]; problems: { t: number; kind: Kind; target: string }[] }

export const RULES = {
  needed: 2, windowMs: 30_000, rageCount: 3, rageMs: 1000, radius: 40, halo: 24, correctionMs: 1500, size: 44, gap: 8,
};
export const MAX_TARGETS = 30;
const NONE: Tally = { taps: 0, misses: 0, rage: 0, nearby: 0 };
export const NO_COMFORT: Comfort = { on: false, reverted: false, targets: [], before: NONE, after: NONE };
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
  const target = tap.target ?? "unknown";
  const problems = [...recent.problems.filter((p) => tap.t - p.t <= RULES.windowMs),
    ...(kind && tap.small ? [{ t: tap.t, kind, target }] : [])];
  // Each control is judged on its own: two problem taps near it, and only it changes.
  const near = (k: string) => problems.filter((p) => p.target === k);
  const fresh = [...new Set(problems.map((p) => p.target))]
    .filter((k) => !state.targets.includes(k) && near(k).length >= RULES.needed);
  const adapt = canAdapt && !state.reverted && fresh.length > 0;
  const targets = adapt ? [...state.targets, ...fresh].slice(-MAX_TARGETS) : state.targets;
  const count = (k: string, of: Kind) => near(k).filter((p) => p.kind === of).length;
  return {
    state: { ...state, [side]: tally, targets, on: targets.length > 0 },
    // A counted rage cluster, or a change of size, starts afresh; other controls keep their count.
    recent: adapt
      ? { taps: [], problems: problems.filter((p) => !fresh.includes(p.target)) }
      : { taps: kind === "rage" ? [] : [...recent.taps, tap].slice(-5), problems },
    reason: adapt
      ? fresh.map((k) => `Near "${k}": ${count(k, "misses")} missed or dead, ${count(k, "rage")} rage, ${count(k, "nearby")} accidental taps`).join("; ")
      : null,
    added: adapt ? fresh : [],
  };
}

export const revert = (state: Comfort): Comfort => ({ ...state, on: false, reverted: true, targets: [] });

const tally = (v: unknown): Tally => {
  const from = (v ?? {}) as Partial<Record<keyof Tally, unknown>>;
  const n = (x: unknown) => (Number.isInteger(x) && (x as number) >= 0 ? (x as number) : 0);
  return { taps: n(from.taps), misses: n(from.misses), rage: n(from.rage), nearby: n(from.nearby) };
};

/** Storage, uploads and documents are untrusted: anything that does not fit reads as nothing. */
export function parseComfort(v: unknown): Comfort {
  const c = (v ?? {}) as Partial<Comfort>;
  const targets = Array.isArray(c.targets)
    ? [...new Set(c.targets.filter((k): k is string => typeof k === "string" && k.length > 0 && k.length <= 80))]
      .slice(-MAX_TARGETS)
    : [];
  return {
    on: targets.length > 0, reverted: c.reverted === true, targets, before: tally(c.before), after: tally(c.after),
  };
}

const larger = (a: Tally, b: Tally): Tally => ({
  taps: Math.max(a.taps, b.taps), misses: Math.max(a.misses, b.misses),
  rage: Math.max(a.rage, b.rage), nearby: Math.max(a.nearby, b.nearby),
});

/** Counts never fall; the switch itself comes from the newer copy. */
export const keepCounts = (older: Comfort, newer: Comfort): Comfort =>
  ({ ...newer, before: larger(older.before, newer.before), after: larger(older.after, newer.after) });
