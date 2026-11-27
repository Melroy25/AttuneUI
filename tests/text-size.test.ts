import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "../lib/attune-ui/preferences/rules";
import { ARTICLES } from "../lib/demo/articles";
import { CATALOG } from "../lib/demo/catalog";
import { parseState } from "../lib/demo/cloud";
import { guideFor } from "../lib/demo/guides";
import { enlarge, nextBurst, parseScales, undoLast, type Burst, type Scales } from "../lib/demo/textSize";

const clicks = (times: number[], x = 0, ids = ["a"]) => times.reduce<Burst[]>(
  (all, t, i) => [...all, nextBurst(all.at(-1) ?? null, ids[i % ids.length], t, x * i, 0)], []).map((b) => b.count);

describe("text size", () => {
  it("counts a burst only on one text, close in time and place", () => {
    expect(clicks([0, 200, 400, 600])).toEqual([1, 2, 3, 4]); // grows once, on the 2
    expect(clicks([0, 900])).toEqual([1, 1]);
    expect(clicks([0, 100], 80)).toEqual([1, 1]);
    expect(clicks([0, 100], 0, ["a", "b"])).toEqual([1, 1]);
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

describe("product guides", () => {
  const of = (id: string) => guideFor(CATALOG.find((p) => p.id === id)!)?.article ?? null;

  it("points only at articles that exist, and at none when nothing matches", () => {
    expect([of("PRD-105"), of("PRD-102"), of("PRD-114"), of("PRD-103"), of("PRD-101")])
      .toEqual(["smartwatch", "headphones", "smartphone", "gadgets", null]);
    const ids = ARTICLES.map((a) => a.id);
    expect(CATALOG.every((p) => !guideFor(p) || ids.includes(guideFor(p)!.article))).toBe(true);
  });
});
