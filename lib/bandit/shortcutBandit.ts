// /demo only: should a buried action be promoted? A two-arm contextual bandit per shortcut
// (keep_default vs promote_shortcut). Separate from the layout bandit; never study data.
import { dot, matVec, scaledIdentity, updateInverse, type Mat, type Vec } from "../attune-ui/bandit/linalg";
import { hashString, makeRng } from "../attune-ui/rng";
import type { FrictionSummary } from "../attune-ui/types";
import type { Habits } from "../demo/habits";

export const SHORTCUTS = ["wishlist", "similar", "support"] as const;
export type Shortcut = (typeof SHORTCUTS)[number];

export interface Arm { aInv: Mat; b: Vec }
export interface Promotion { x: Vec; rewarded: boolean }
export interface ShortcutState {
  visits: number;
  decisions: number; // seeds each draw
  arms: Record<Shortcut, Arm>; // the promote arm, which is the only one that gets feedback
  promoted: Partial<Record<Shortcut, Promotion>>;
}

// Context: [bias, uses of this action, order opens, struggles, repeat visits], each 0..1.
const DIM = 5;
const LAMBDA = 4; // weight of the hand-set prior
const V = 0.25; // posterior width
const PROMOTE_PRIOR = [0, 0.9, 0.1, 0.2, 0.1];
const KEEP: Arm = { aInv: scaledIdentity(DIM, 1 / LAMBDA), b: [0.5 * LAMBDA, 0, 0, 0, 0] };

export const newShortcuts = (): ShortcutState => {
  const arm = (): Arm => ({ aInv: scaledIdentity(DIM, 1 / LAMBDA), b: PROMOTE_PRIOR.map((w) => w * LAMBDA) });
  return { visits: 0, decisions: 0, arms: { wishlist: arm(), similar: arm(), support: arm() }, promoted: {} };
};

export const usesOf = (kind: Shortcut, h: Habits): number =>
  kind === "wishlist" ? h.wishUses : kind === "support" ? h.supportUses : Math.max(0, ...Object.values(h.opens));

export const struggles = (...parts: FrictionSummary[]): number =>
  parts.reduce((s, f) => s + f.rage + f.dead + f.miss + f.thrash, 0);

const share = (n: number, full: number) => Math.min(Math.max(n / full, 0), 1);

export const shortcutContext = (kind: Shortcut, h: Habits, friction: number, visits: number): Vec => [
  1,
  share(usesOf(kind, h), 3),
  share(Object.values(h.opens).reduce((s, n) => s + n, 0), 6),
  share(friction, 5),
  share(visits - 1, 3),
];

/** Standard normal CDF (Abramowitz and Stegun 7.1.26). */
function phi(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const tail = 0.5 * poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? 1 - tail : tail;
}

/** Posterior probability that promoting scores higher than keeping the default. */
export function confidence(arm: Arm, x: Vec): number {
  const mean = (a: Arm) => dot(matVec(a.aInv, a.b), x);
  const spread = (a: Arm) => dot(x, matVec(a.aInv, x));
  return phi((mean(arm) - mean(KEEP)) / (V * Math.sqrt(spread(arm) + spread(KEEP))));
}

/** Thompson sampling: promote with exactly that probability. Nothing to decide without any use. */
export function consider(state: ShortcutState, kind: Shortcut, x: Vec): { state: ShortcutState; confidence: number | null } {
  if (state.promoted[kind] || x[1] === 0) return { state, confidence: null };
  const decisions = state.decisions + 1;
  const p = confidence(state.arms[kind], x);
  if (makeRng(hashString(`shortcut:${kind}:${decisions}`)).next() >= p) {
    return { state: { ...state, decisions }, confidence: null };
  }
  const promoted = { ...state.promoted, [kind]: { x, rewarded: false } };
  return { state: { ...state, decisions, promoted }, confidence: p };
}

/** +1 for using the shortcut (once per promotion); -1 for Undo or dismiss, which also removes it. */
export function feedback(state: ShortcutState, kind: Shortcut, reward: 1 | -1): ShortcutState {
  const promotion = state.promoted[kind];
  if (!promotion || (reward > 0 && promotion.rewarded)) return state;
  const { aInv, b } = state.arms[kind];
  const arm = { aInv: updateInverse(aInv, promotion.x), b: b.map((v, i) => v + reward * promotion.x[i]) };
  const promoted = { ...state.promoted };
  if (reward > 0) promoted[kind] = { ...promotion, rewarded: true };
  else delete promoted[kind];
  return { ...state, arms: { ...state.arms, [kind]: arm }, promoted };
}

const vector = (v: unknown) => Array.isArray(v) && v.length === DIM && v.every((x) => Number.isFinite(x));
const count = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;

/** Storage can be edited or damaged: anything that does not fit starts over. */
export function parseShortcuts(raw: string | null): ShortcutState {
  try {
    const v = JSON.parse(raw ?? "null") as ShortcutState;
    const fits = count(v.visits) && count(v.decisions) &&
      SHORTCUTS.every((k) => vector(v.arms[k].b) && v.arms[k].aInv.length === DIM && v.arms[k].aInv.every(vector)) &&
      Object.values(v.promoted).every((p) => vector(p.x) && typeof p.rewarded === "boolean");
    return fits ? v : newShortcuts();
  } catch {
    return newShortcuts();
  }
}
