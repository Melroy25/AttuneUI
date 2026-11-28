import { describe, expect, it } from "vitest";
import type { Activity } from "../lib/demo/activity";
import { excessiveScroll, rapidTabs, replay, shoeIdeas, tagged, within, type ExtraEvent } from "../lib/demo/extras";

const log = (at: number, event: ExtraEvent): Activity => ({ at, trigger: "t", change: tagged("c", event) });

describe("manual view and quick area, replayed from the activity log", () => {
  it("follows toggles and undos in time order, whatever the stored order", () => {
    const entries = [log(5, "quick:remove:PRD-101"), log(1, "policy:on"), log(2, "quick:add:PRD-101"),
      log(3, "quick:add:PRD-104"), log(4, "policy:off")];
    expect(replay(entries)).toEqual({ policy: false, quick: ["PRD-104"] });
    expect(replay([...entries, log(6, "policy:on")]).policy).toBe(true);
  });

  it("starts again after Reset and ignores unknown products and untagged text", () => {
    const entries = [log(1, "policy:on"), log(2, "quick:add:PRD-101"),
      { at: 3, trigger: "Pressed Reset", change: "Screen back" }, log(4, "quick:add:PRD-999"),
      { at: 5, trigger: "t", change: "[x:policy:on] in the middle" }];
    expect(replay(entries)).toEqual({ policy: false, quick: [] });
  });
});

describe("prompt triggers", () => {
  it("needs 4 quick tab switches", () => {
    let times: number[] = [];
    for (const t of [0, 7000, 8000, 9000]) times = within(times, t, 6000);
    expect(rapidTabs(times)).toBe(false);
    expect(rapidTabs(within(times, 10_000, 6000))).toBe(true);
  });

  it("needs 4 direction changes in 15 s, and offers shoes first", () => {
    expect(excessiveScroll([1000, 2000, 3000], 4000)).toBe(false);
    expect(excessiveScroll([1000, 2000, 3000, 4000], 4000)).toBe(true);
    expect(excessiveScroll([1000, 2000, 3000, 30_000], 30_000)).toBe(false);
    expect(shoeIdeas()[0].name).toBe("Running shoes");
  });
});
