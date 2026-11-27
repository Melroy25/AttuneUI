import { describe, expect, it } from "vitest";
import { NO_HABITS, openOrder, parseHabits, similarTo, toggleWish } from "../lib/demo/habits";
import { ORDERS } from "../lib/study/data";

describe("demo habits", () => {
  it("offers similar items only after a repeated open", () => {
    const once = openOrder(NO_HABITS, ORDERS[0].id);
    expect(similarTo(once)).toEqual([]);
    expect(similarTo(openOrder(once, ORDERS[0].id))).toHaveLength(1);
  });

  it("counts every wishlist press and drops damaged storage", () => {
    const twice = toggleWish(toggleWish(NO_HABITS, "a"), "a");
    expect([twice.wishUses, twice.wished]).toEqual([2, []]);
    expect(parseHabits(JSON.stringify(twice))).toEqual(twice);
    for (const bad of [null, "{", "{}", JSON.stringify({ ...twice, supportUses: -1 })]) {
      expect(parseHabits(bad)).toEqual(NO_HABITS);
    }
  });
});
