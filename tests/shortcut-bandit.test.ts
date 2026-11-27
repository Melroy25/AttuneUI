import { describe, expect, it } from "vitest";
import {
  confidence, consider, feedback, newShortcuts, parseShortcuts, shortcutContext, type ShortcutState,
} from "../lib/bandit/shortcutBandit";
import { NO_HABITS } from "../lib/demo/habits";

const at = (uses: number, friction = 0) => shortcutContext("wishlist", { ...NO_HABITS, wishUses: uses }, friction, 1);
const p = (state: ShortcutState, x: number[]) => confidence(state.arms.wishlist, x);

/** Draws until the seeded sampler promotes. */
function promote(x: number[]) {
  let state = newShortcuts();
  for (let i = 0; i < 50; i++) {
    const next = consider(state, "wishlist", x);
    state = next.state;
    if (next.confidence !== null) return { state, confidence: next.confidence };
  }
  throw new Error("never promoted");
}

describe("shortcut bandit", () => {
  it("grows more confident with use and struggle", () => {
    const s = newShortcuts();
    expect(p(s, at(1))).toBeLessThan(0.3);
    expect(p(s, at(2))).toBeGreaterThan(0.6);
    expect(p(s, at(3))).toBeGreaterThan(0.9);
    expect(p(s, at(2, 5))).toBeGreaterThan(p(s, at(2)));
  });

  it("never promotes an unused action, and repeats its draws", () => {
    const s = newShortcuts();
    expect(consider(s, "wishlist", at(0)).state).toBe(s);
    expect(consider(s, "wishlist", at(2))).toEqual(consider(s, "wishlist", at(2)));
    const done = promote(at(3));
    expect(done.confidence).toBeCloseTo(p(s, at(3)));
    expect(consider(done.state, "wishlist", at(3)).state).toBe(done.state);
  });

  it("learns from a click once and from a dismissal", () => {
    const x = at(2);
    const { state } = promote(x);
    const liked = feedback(state, "wishlist", 1);
    expect(p(liked, x)).toBeGreaterThan(p(state, x));
    expect(feedback(liked, "wishlist", 1)).toBe(liked);
    const gone = feedback(state, "wishlist", -1);
    expect(gone.promoted.wishlist).toBeUndefined();
    expect(p(gone, x)).toBeLessThan(0.3);
    expect(gone.arms.support).toBe(state.arms.support);
    expect(feedback(gone, "wishlist", -1)).toBe(gone);
  });

  it("restores saved weights and drops damaged ones", () => {
    const { state } = promote(at(3));
    expect(parseShortcuts(JSON.stringify(state))).toEqual(state);
    for (const bad of [null, "{", "{}", JSON.stringify({ ...state, visits: -1 })]) {
      expect(parseShortcuts(bad)).toEqual(newShortcuts());
    }
  });
});
