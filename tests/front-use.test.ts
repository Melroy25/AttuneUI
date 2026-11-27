import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "../lib/attune-ui/preferences/rules";
import { parseState } from "../lib/demo/cloud";
import { MAX_FRONT, NO_USE, parseUse, startVisit, used, type VisitUse } from "../lib/demo/frontUse";

const use = (s: VisitUse, key: string, n: number) => Array.from({ length: n }).reduce<VisitUse>((u) => used(u, key), s);

describe("next-visit promotion of any part of the store", () => {
  it("never moves anything during the visit in which it was used", () => {
    const now = use(startVisit(NO_USE, "v1").state, "wishlist", 5);
    expect([now.current.wishlist, now.front]).toEqual([5, []]);
    expect(startVisit(now, "v1")).toEqual({ state: now, started: false }); // a remount, same visit
  });

  it("puts what was used 3+ times first from the next visit, most used first", () => {
    let s = startVisit(NO_USE, "v1").state;
    s = use(use(use(s, "articles", 3), "category:electronics", 5), "cart", 2);
    const next = startVisit(s, "v2");
    expect(next.started).toBe(true);
    expect(next.state.front).toEqual(["category:electronics", "articles"]);
    expect(next.state.current).toEqual({});
    expect(startVisit(use(next.state, "cart", 1), "v3").state.front).toEqual([]); // used less: dropped
  });

  it("keeps at most three, ignores unknown parts and damaged data", () => {
    let s = startVisit(NO_USE, "v1").state;
    for (const k of ["orders", "help", "reports", "returns", "nope"]) s = use(s, k, 4);
    expect(s.current.nope).toBeUndefined();
    expect(startVisit(s, "v2").state.front).toHaveLength(MAX_FRONT);
    expect(parseUse({ current: { cart: -1, help: "3", x: 9 }, front: ["cart", "bad"], session: 5 }))
      .toEqual({ ...NO_USE, front: ["cart"] });
    const state = { arm: "baseline", preferences: DEFAULT_PREFERENCES, use: { session: "v1", current: { cart: 4 }, last: {}, front: ["cart"] } };
    expect(parseState(state)!.use).toEqual(state.use);
  });
});
