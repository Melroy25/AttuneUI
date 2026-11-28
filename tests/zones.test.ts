import { describe, expect, it } from "vitest";
import type { Activity } from "../lib/demo/activity";
import { isBig, isFirstRaise, withoutPrefix, zoneTag, zoneTaps, type ZoneAction, type Zone } from "../lib/demo/zones";

const tap = (at: number, action: ZoneAction, zone: Zone): Activity => ({ at, trigger: "t", change: zoneTag("c", action, zone) });
const raise = (at: number, id: string): Activity => ({ at, trigger: "t", change: `Font size of "${id}" raised to 112.5%` });
const reset = (at: number): Activity => ({ at, trigger: "Pressed Reset", change: "Screen back" });

describe("sections that grow without asking", () => {
  it("grows after a refresh, or on the second repeat in one visit", () => {
    const once = zoneTaps([tap(100, "tap", "help:policy")])["help:policy"];
    expect(isBig(once, 50)).toBe(false); // same visit, first time
    expect(isBig(once, 200)).toBe(true); // refreshed afterwards
    const twice = zoneTaps([tap(100, "tap", "help:faq"), tap(120, "tap", "help:faq")])["help:faq"];
    expect(isBig(twice, 50)).toBe(true);
    expect(isBig([], 200)).toBe(false);
  });

  it("asks \"Is that okay?\" only for the first text, again after Reset", () => {
    expect(isFirstRaise([raise(1, "order:a:line")])).toBe(true);
    expect(isFirstRaise([raise(2, "cart:total"), raise(1, "order:a:line")])).toBe(false);
    expect(isFirstRaise([raise(3, "cart:total"), reset(2), raise(1, "order:a:line")])).toBe(true);
  });
});

describe("Undo for the Orders page only", () => {
  it("clears the Orders card and order texts and leaves everything else", () => {
    const log = [tap(1, "tap", "orders:policy"), tap(2, "tap", "orders:policy"), tap(3, "tap", "help:policy"),
      tap(4, "undo", "orders:policy")];
    const taps = zoneTaps(log);
    expect([taps["orders:policy"], taps["help:policy"]]).toEqual([[], [3]]);
    expect(withoutPrefix({ "order:a:line": 125, "cart:total": 112.5 }, "order:")).toEqual({ "cart:total": 112.5 });
    expect(zoneTaps([...log, reset(5)])["help:policy"]).toEqual([]);
  });
});
