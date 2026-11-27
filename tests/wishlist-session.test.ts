import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "../lib/attune-ui/preferences/rules";
import { parseState } from "../lib/demo/cloud";
import { NO_WISH, parseWish, pressed, startVisit, type WishSession } from "../lib/demo/wishSession";

const press = (s: WishSession, n: number) => Array.from({ length: n }).reduce<WishSession>((w) => pressed(w), s);

describe("next-visit Wishlist promotion", () => {
  it("never promotes during the visit in which it was used", () => {
    const now = press(startVisit(NO_WISH, "v1").state, 5);
    expect([now.current, now.promoted]).toEqual([5, false]);
    expect(startVisit(now, "v1")).toEqual({ state: now, started: false }); // a remount, same visit
  });

  it("promotes from the start of the next visit after 3+ presses, and not after fewer", () => {
    const busy = startVisit(press(startVisit(NO_WISH, "v1").state, 3), "v2");
    expect(busy).toEqual({ started: true, state: { session: "v2", current: 0, last: 3, promoted: true } });
    const quiet = startVisit(press(busy.state, 2), "v3").state;
    expect([quiet.last, quiet.promoted]).toEqual([2, false]);
  });

  it("survives damaged storage and uploads", () => {
    expect(parseWish({ current: -1, last: "3", promoted: "yes", session: 5 })).toEqual(NO_WISH);
    const state = { arm: "baseline", preferences: DEFAULT_PREFERENCES, wish: { session: "v1", current: 4, last: 3, promoted: true } };
    expect(parseState(state)!.wish).toEqual(state.wish);
  });
});
