import { describe, expect, it } from "vitest";
import "../extension/rules.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plain JS loaded by the browser extension
const R = (globalThis as any).AttuneRules;

describe("AttuneUI Anywhere rules", () => {
  it("needs 4 clicks on one text within 2.5 s", () => {
    let b = null;
    for (const t of [0, 400, 800]) b = R.nextBurst(b, "p1", t);
    expect(R.deliberate(b)).toBe(false);
    expect(R.deliberate(R.nextBurst(b, "p1", 1200))).toBe(true);
    expect(R.deliberate(R.nextBurst(b, "p2", 1200))).toBe(false); // another text starts again
    expect(R.nextBurst(b, "p1", 3000).count).toBe(1); // too slow
  });

  it("grows a text step by step from its own size, and Undo goes back one step", () => {
    let site = R.emptySite();
    for (const size of [112.5, 125, 137.5]) {
      const next = R.enlargeText(site, "p1", 16);
      expect(next.size).toBe(size);
      site = next.site;
    }
    expect(R.enlargeText(site, "p1", 99)).toBeNull(); // largest already
    expect(site.texts.p1).toEqual({ size: 137.5, base: 16 });
    site = R.undoLast(site).site;
    expect(site.texts.p1.size).toBe(125);
  });

  it("undoes links and reading focus in the order they happened", () => {
    let site = R.addTarget(R.emptySite(), "a1");
    expect(R.addTarget(site, "a1")).toBeNull();
    site = R.setFocus(site);
    site = R.undoLast(site).site;
    expect([site.focus, site.targets]).toEqual([false, ["a1"]]);
    site = R.undoLast(site).site;
    expect(site.targets).toEqual([]);
    expect(R.undoLast(site)).toBeNull();
  });

  it("finds small controls near a tap", () => {
    const link = { left: 100, right: 140, top: 50, bottom: 66, width: 40, height: 16 };
    expect(R.distance(link, 120, 60)).toBe(0);
    expect(R.distance(link, 150, 58)).toBe(10);
    expect(R.isSmall(link)).toBe(true);
    expect(R.isSmall({ width: 200, height: 48 })).toBe(false);
  });

  it("counts up-and-down scrolling, not small wobbles", () => {
    let s = R.newTracker();
    let t = 0;
    for (const y of [0, 300, 310, 100, 400, 100, 400]) s = R.scrolled(s, (t += 500), y);
    expect(R.restless(s, t)).toBe(true);
    let calm = R.newTracker();
    for (const y of [0, 20, 0, 20, 0, 20]) calm = R.scrolled(calm, (t += 500), y);
    expect(R.restless(calm, t)).toBe(false);
  });

  it("keeps only valid saved data", () => {
    const site = R.parseSite({
      texts: { p1: { size: 125, base: 16 }, p2: { size: 300, base: 16 }, __proto__: { size: 125, base: 16 } },
      targets: ["a1", 5, ""], focus: "yes", history: [{ kind: "text", key: "p1", before: null }, { kind: "x" }],
      log: [{ at: 1, trigger: "t", change: "c" }, { at: "no" }],
    });
    expect(site).toEqual({
      texts: { p1: { size: 125, base: 16 } }, targets: ["a1"], focus: false,
      history: [{ kind: "text", key: "p1", before: null }], log: [{ at: 1, trigger: "t", change: "c" }],
    });
    expect(R.parseSite("junk")).toEqual(R.emptySite());
  });
});
