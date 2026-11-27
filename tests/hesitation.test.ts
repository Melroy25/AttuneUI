import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "../lib/attune-ui/preferences/rules";
import { parseState } from "../lib/demo/cloud";
import type { Tap } from "../lib/demo/comfort";
import {
  H, NO_HESITATION, answer, parseHesitation, quickPicks, shouldAsk, visitSignal, type Visit,
} from "../lib/demo/hesitation";
import { pulseFor } from "../lib/demo/pulse";
import { latestInCart, parseCity, promptFor } from "../lib/demo/quick";
import { placeBelow } from "../lib/demo/tooltip";

const walk = (...keys: string[]) => {
  const visits: Visit[] = keys.map((key, i) => ({ t: i * 1000, key, category: "electronics" }));
  return visitSignal(visits.slice(0, -1), visits.at(-1)!);
};

describe("hesitation", () => {
  it("reads repeat visits and going back and forth, but not ordinary browsing", () => {
    expect(walk("product:a", "page:home", "product:a")).toBeNull();
    expect(walk("product:a", "page:home", "product:a", "page:cart", "product:a")?.kind).toBe("repeat");
    expect(walk("category:x", "category:y", "category:x", "category:y")?.kind).toBe("pingpong");
    expect(walk("page:home", "page:help", "page:home", "page:cart", "page:home")).toBeNull();
  });

  it("asks past the threshold, and No makes it ask less", () => {
    const now = 1e6;
    const thrash = { t: now, kind: "thrash" as const, category: null };
    expect(shouldAsk(NO_HESITATION, [thrash], now)).toBeNull();
    const signals = [thrash, { t: now, kind: "repeat" as const, category: "toys" as const }];
    expect(shouldAsk(NO_HESITATION, signals, now)?.category).toBe("toys");
    const refused = answer({ ...NO_HESITATION, askedAt: now }, false, "toys");
    expect([refused.threshold, refused.cooldownMs, refused.liked.toys]).toEqual([4, 2 * H.cooldownMs, -1]);
    expect(shouldAsk(refused, signals, now + H.cooldownMs)).toBeNull();
    const agreed = answer(refused, true, "toys");
    expect([agreed.threshold, agreed.cooldownMs, agreed.yes, agreed.no]).toEqual([3, H.cooldownMs, 1, 1]);
  });

  it("offers items in stock and survives damaged storage", () => {
    expect(quickPicks("electronics").every((p) => p.stock > 0 && p.category === "electronics")).toBe(true);
    expect(parseHesitation({ threshold: -9, cooldownMs: "x", liked: { toys: 2, bad: 1 } }))
      .toEqual({ ...NO_HESITATION, liked: { toys: 2 } });
  });
});

describe("cart prompt, city, popover and pulse", () => {
  it("asks about the newest cart item unless it is the clicked card", () => {
    expect(latestInCart({ "PRD-101": 1, "PRD-102": 1 }, "PRD-101")).toBe("PRD-101");
    expect(latestInCart({}, "PRD-101")).toBeNull();
    expect(promptFor("product:PRD-101", "PRD-102")?.prompt.kind).toBe("cart");
    expect(promptFor("product:PRD-101", "PRD-101")?.prompt.kind).toBe("product");
  });

  it("keeps only a real city, and keeps the popover on screen", () => {
    expect([parseCity("2"), parseCity("9"), parseCity(""), parseCity(null)]).toEqual([2, null, null, null]);
    expect(parseState({ arm: "baseline", preferences: DEFAULT_PREFERENCES, city: 1 })!.city).toBe(1);
    const box = { width: 288, height: 200 };
    expect(placeBelow({ bottom: 40, right: 100 }, box, { width: 375, height: 700 })).toEqual({ top: 46, left: 8 });
    expect(placeBelow({ bottom: 690, right: 500 }, box, { width: 375, height: 700 })).toEqual({ top: 492, left: 79 });
  });

  it("names the friction of a click", () => {
    const tap: Tap = { t: 500, x: 0, y: 0, control: null, distance: 10, small: true };
    expect(pulseFor([], tap, true)).toBe("Small target miss");
    expect(pulseFor([], { ...tap, distance: 80 }, true)).toBe("Dead click");
    expect(pulseFor([], { ...tap, distance: 80 }, false)).toBeNull();
    expect(pulseFor([{ ...tap, t: 100 }, { ...tap, t: 300 }], tap, false)).toBe("Rage click");
  });
});
