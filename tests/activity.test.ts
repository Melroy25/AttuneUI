import { describe, expect, it } from "vitest";
import { fromReason, habitChanges, parseActivity, struggle } from "../lib/demo/activity";
import { NO_HABITS, openOrder, toggleWish } from "../lib/demo/habits";
import { ORDERS } from "../lib/study/data";

describe("demo activity", () => {
  it("names the struggle and where it happened", () => {
    const calm = { rage: 0, dead: 4, miss: 0, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1 };
    const tap = { type: "down" as const, t: 0, x: 0, y: 0, targetId: "badge-ORD-1", interactive: false, nearTargetPx: 99 };
    expect(struggle(calm, [tap])).toBe("4 dead clicks, mostly on a status badge");
    expect(fromReason("2 photo vs 0 text searches -> photo search first").change).toBe("photo search first");
  });

  it("logs a promotion once, when it is earned", () => {
    const one = toggleWish(NO_HABITS, "a");
    const two = toggleWish(one, "a");
    expect(habitChanges(NO_HABITS, one)).toEqual([]);
    expect(habitChanges(one, two)).toHaveLength(1);
    expect(habitChanges(two, toggleWish(two, "a"))).toEqual([]);
    const opened = openOrder(openOrder(NO_HABITS, ORDERS[0].id), ORDERS[0].id);
    expect(habitChanges(openOrder(NO_HABITS, ORDERS[0].id), opened)[0].trigger).toContain(ORDERS[0].id);
  });

  it("rejects malformed entries", () => {
    const ok = { at: 1, trigger: "a", change: "b" };
    expect(parseActivity([{ ...ok, extra: 1 }], 8)).toEqual([ok]);
    for (const bad of [null, [null], [{ ...ok, at: "1" }], [{ ...ok, change: "x".repeat(201) }], [ok, ok]]) {
      expect(parseActivity(bad, 1)).toBeNull();
    }
  });
});
