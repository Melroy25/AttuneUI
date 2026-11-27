import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "../lib/attune-ui/preferences/rules";
import { ARTICLES } from "../lib/demo/articles";
import { CATALOG } from "../lib/demo/catalog";
import { parseState } from "../lib/demo/cloud";
import { confused } from "../lib/demo/confusion";
import { guideFor } from "../lib/demo/guides";
import { deliberate, enlarge, nextBurst, parseScales, undoLast, type Burst, type Scales } from "../lib/demo/textSize";

const clicks = (times: number[], ids = ["a"]) => times
  .reduce<Burst[]>((all, t, i) => [...all, nextBurst(all.at(-1) ?? null, ids[i % ids.length], t)], [])
  .map(deliberate);

describe("text size", () => {
  it("ignores double clicks and needs 4 clicks on one text within 2.5 s", () => {
    expect(clicks([0, 150])).toEqual([false, false]); // an accidental double click
    expect(clicks([0, 150, 300])).toEqual([false, false, false]);
    expect(clicks([0, 600, 1200, 1800])).toEqual([false, false, false, true]);
    expect(clicks([0, 1000, 2000, 2600])).toEqual([false, false, false, false]); // too slow
    expect(clicks([0, 100, 200, 300], ["a", "b"])).toEqual([false, false, false, false]); // two texts
  });

  it("grows one text in steps and leaves the others alone", () => {
    let s = enlarge({}, "a")!;
    s = enlarge(enlarge(enlarge(s, "b")!, "a")!, "a")!;
    expect(s).toEqual({ b: 112.5, a: 137.5 });
    expect(enlarge(s, "a")).toBeNull();
  });

  it("undoes the most recent text one step at a time, then the one before", () => {
    let s: Scales = { a: 112.5, b: 125 };
    const steps = [];
    for (let back = undoLast(s); back; back = undoLast(s)) {
      s = back.scales;
      steps.push(`${back.id} ${back.size}`);
    }
    expect(steps).toEqual(["b 112.5", "b 100", "a 100"]);
    expect(s).toEqual({});
  });

  it("keeps only known sizes and safe ids, also after upload", () => {
    const bad = { "x y": 125, ok: 200, plain: 100, "article:laptop-p1": 125 };
    expect(parseScales(JSON.stringify(bad))).toEqual({ "article:laptop-p1": 125 });
    expect([parseScales("{"), parseScales([125]), parseScales(null)]).toEqual([{}, {}, {}]);
    const state = { arm: "baseline", preferences: DEFAULT_PREFERENCES, textScales: { "cart:total": 112.5 } };
    expect(parseState(state)!.textScales).toEqual({ "cart:total": 112.5 });
  });
});

describe("card help only on confusion", () => {
  it("ignores single and double taps, answers 4 quick taps or taps while scrolling back and forth", () => {
    expect(confused([1000], [], 1000)).toBeNull();
    expect(confused([0, 300], [], 300)).toBeNull();
    expect(confused([0, 500, 1000, 1500], [], 1500)).toBe("rapid");
    expect(confused([0, 1000, 2000, 4000], [], 4000)).toBeNull(); // too slow
    expect(confused([0, 5000], [1000, 3000], 5000)).toBe("scrolling");
    expect(confused([5000], [1000, 3000], 5000)).toBeNull();
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
