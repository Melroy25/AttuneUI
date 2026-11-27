import { describe, expect, it } from "vitest";
import { eligible, usesOf } from "../lib/bandit/shortcutBandit";
import { NO_HABITS, askSupport, hoverSupport, parseHabits } from "../lib/demo/habits";
import { archive, parsePast, withPast, type PastSession } from "../lib/demo/history";

const done: PastSession = {
  endedAt: 1, layout: "shortcut", shortcuts: ["support"], changes: [{ at: 1, trigger: "a", change: "b" }],
};

describe("promotion threshold", () => {
  it("ignores a single click and adds up clicks with hovers", () => {
    const once = askSupport(NO_HABITS);
    expect(eligible("support", once)).toBe(false);
    const busy = [1, 2, 3, 4].reduce((h) => hoverSupport(h), once);
    expect([usesOf("support", busy), eligible("support", busy)]).toEqual([3, true]);
    expect(eligible("wishlist", { ...NO_HABITS, wishUses: 2 })).toBe(false);
    const old = { wishUses: 1, wished: [], opens: {}, supportUses: 1 }; // saved before hovers existed
    expect(parseHabits(JSON.stringify(old)).supportHovers).toBe(0);
  });
});

describe("session history", () => {
  it("archives newest first, skips empty sessions and caps the list", () => {
    expect(archive([], { ...done, layout: "baseline", shortcuts: [], changes: [] })).toEqual([]);
    const many = Array.from({ length: 12 }, (_, i) => i).reduce<PastSession[]>((p, i) => archive(p, { ...done, endedAt: i }), []);
    expect([many.length, many[0].endedAt]).toEqual([10, 11]);
  });

  it("rejects damaged history and stays under the upload limit", () => {
    expect(parsePast([done], 5)).toEqual([done]);
    for (const bad of [null, [null], [{ ...done, layout: "<b>" }], [{ ...done, shortcuts: ["x"] }]]) {
      expect(parsePast(bad, 5)).toBeNull();
    }
    expect(withPast({ id: "a" }, [done, done], 10_000).past).toHaveLength(2);
    expect(withPast({ id: "a" }, [done, done], 150).past).toHaveLength(1);
    expect(withPast({ id: "a" }, [done], 20)).toEqual({ id: "a" });
  });
});
