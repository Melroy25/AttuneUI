import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "../lib/attune-ui/preferences/rules";
import { ARTICLES } from "../lib/demo/articles";
import { CATALOG } from "../lib/demo/catalog";
import { parseState } from "../lib/demo/cloud";
import { guideFor } from "../lib/demo/guides";
import { SIZES, nextBurst, parseStep, type Burst } from "../lib/demo/textSize";

const clicks = (times: number[], x = 0) =>
  times.reduce<Burst[]>((all, t, i) => [...all, nextBurst(all.at(-1) ?? null, t, x * i, 0)], []).map((b) => b.count);

describe("text size", () => {
  it("counts a burst only when clicks are close in time and place", () => {
    expect(clicks([0, 200, 400, 600])).toEqual([1, 2, 3, 4]); // grows once, on the 2
    expect(clicks([0, 900])).toEqual([1, 1]);
    expect(clicks([0, 100], 80)).toEqual([1, 1]);
  });

  it("stays within the safe steps, also after upload", () => {
    expect([parseStep("2"), parseStep(9), parseStep(-1), parseStep(""), parseStep(1.5)]).toEqual([2, 0, 0, 0, 0]);
    expect(Math.max(...SIZES)).toBe(137.5);
    expect(parseState({ arm: "baseline", preferences: DEFAULT_PREFERENCES, textStep: 3 })!.textStep).toBe(3);
  });
});

describe("product guides", () => {
  const of = (id: string) => guideFor(CATALOG.find((p) => p.id === id)!)?.article ?? null;

  it("points only at articles that exist, and at none when nothing matches", () => {
    expect([of("PRD-105"), of("PRD-102"), of("PRD-114"), of("PRD-103"), of("PRD-101")])
      .toEqual(["smartwatch", "headphones", "smartphone", "gadgets", null]);
    const ids = ARTICLES.map((a) => a.id);
    expect(CATALOG.every((p) => !guideFor(p) || ids.includes(guideFor(p)!.article))).toBe(true);
  });
});
