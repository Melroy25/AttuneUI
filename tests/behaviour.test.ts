import { describe, expect, it } from "vitest";
import { confusedAbout, newTracker, readingState, scrolled, seen, type Tracker } from "../lib/demo/articleReading";
import { ARTICLES } from "../lib/demo/articles";
import {
  NO_BEHAVIOUR, cueChanges, cuesFor, familiarity, keepBehaviour, navigate, parseBehaviour, pinExpired, total, type Behaviour, type Step,
} from "../lib/demo/behaviour";

/** Visits each page in turn, staying `ms` on each, and keeps the cues up to date. */
function walk(pages: string[], ms = 5000, from: Behaviour = NO_BEHAVIOUR) {
  let b: Behaviour = { ...from, cues: cuesFor(from) };
  let step: Step = { page: "home", at: 0, from: null, phase: "plain" };
  pages.forEach((page, i) => {
    const moved = navigate(b, step, page, (i + 1) * ms);
    step = moved.step;
    b = { ...moved.behaviour, cues: cuesFor(moved.behaviour) };
  });
  return b;
}
const trips = (n: number) => Array.from({ length: n }, () => ["orders", "home"]).flat();

describe("muscle memory", () => {
  it("cues the usual features for a newcomer", () => {
    expect(cuesFor(NO_BEHAVIOUR)).toEqual({ products: 2, orders: 2 });
    expect(familiarity(NO_BEHAVIOUR)).toBe(0);
  });

  it("fades the cue as visits succeed and brings it back after bouncing", () => {
    expect(walk(trips(2)).cues.orders).toBe(2);
    expect(walk(trips(4)).cues.orders).toBe(1);
    const sure = walk(trips(7));
    expect(sure.cues.orders).toBeUndefined();
    expect(familiarity(sure)).toBeGreaterThan(0.4);
    expect(cueChanges({ orders: 1 }, sure.cues).find((c) => c.feature === "orders")?.faded).toBe(true);
    expect(sure.nav.guided.count).toBeGreaterThan(0);
    const unsure = walk(trips(4), 1000, sure); // back within a second each time
    expect(unsure.features.orders.back).toBe(4);
    expect(unsure.cues.orders).toBeDefined();
  });

  it("adds users together for the admin", () => {
    const one = { ...walk(trips(2)), pinned: { article: "laptop", paragraph: "laptop-p1", progress: 0.4, at: 0 } };
    const both = total([one, one]);
    expect([both.features.orders.uses, both.nav.guided.count, both.pinned]).toEqual([4, one.nav.guided.count * 2, null]);
  });

  it("keeps counts when copies merge and drops damaged data", () => {
    const used = walk(trips(3));
    expect(keepBehaviour(used, parseBehaviour(null)).features.orders.uses).toBe(3);
    const bad = parseBehaviour({ searches: -4, cues: { orders: 9 }, pinned: { article: "x" } });
    expect([bad.searches, bad.cues, bad.pinned]).toEqual([0, {}, null]);
  });
});

/** Scrolls between two heights `times` times; paragraph "p" is only visible near the top. */
function rereading(times: number) {
  let s: Tracker = seen(scrolled(newTracker(), 0, 0), "p", true);
  let t = 0;
  for (let i = 0; i < times; i++) {
    s = seen(scrolled(s, ++t, 400), "p", false);
    s = seen(scrolled(s, ++t, 0), "p", true);
  }
  return { s, t };
}

describe("reading", () => {
  it("never calls long, steady reading confusion", () => {
    let s = seen(scrolled(newTracker(), 0, 0), "p", true);
    for (let i = 1; i <= 500; i++) s = scrolled(s, i * 1000, i * 100);
    expect(s.reversals).toHaveLength(0);
    expect(confusedAbout(s, 500_000, ["p"], [])).toBeNull();
  });

  it("needs repeated returns to the paragraph and back-and-forth scrolling", () => {
    const once = rereading(1);
    expect(confusedAbout(once.s, once.t, ["p"], [])).toBeNull();
    const twice = rereading(2);
    expect(twice.s.revisits.p).toBe(2);
    expect(confusedAbout(twice.s, twice.t, ["p"], [])).toBe("p");
    expect(confusedAbout(twice.s, twice.t, ["p"], ["p"])).toBeNull();
    expect(confusedAbout(twice.s, twice.t + 120_000, ["p"], [])).toBeNull();
    expect(confusedAbout(twice.s, twice.t, ["q"], [])).toBeNull();
  });

  it("pins steady reading, finishes at the end and expires when idle", () => {
    const m = { activeMs: 9000, progress: 0.4, travelled: 300, idleMs: 0 };
    expect(readingState(m)).toBe("reading");
    expect(readingState({ ...m, travelled: 0 })).toBe("other");
    expect(readingState({ ...m, idleMs: 60_000 })).toBe("other");
    expect(readingState({ ...m, activeMs: 12_000, progress: 0.97 })).toBe("finished");
    const pin = { article: "laptop", paragraph: "laptop-p1", progress: 0.4, at: 0 };
    expect([pinExpired(pin, 130_000, true), pinExpired(pin, 130_000, false)]).toEqual([true, false]);
  });

  it("has five complete articles with unique paragraph ids", () => {
    expect(ARTICLES).toHaveLength(5);
    const all = ARTICLES.flatMap((a) => a.content);
    expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
    expect(all.every((p) => p.text && p.simpleExplanation && p.summary && p.example)).toBe(true);
  });
});
