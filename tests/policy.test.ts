import { describe, expect, it } from "vitest";
import { dot, scaledIdentity, updateInverse } from "../lib/attune-ui/bandit/linalg";
import {
  createModels, createPolicy, decide, decidePlacebo, eligibleArms, policyHash, update,
} from "../lib/attune-ui/bandit/policy";
import { makeRng } from "../lib/attune-ui/rng";
import { ARM_IDS } from "../lib/attune-ui/types";

const novice = [1, 1, 0, 1, 0, 0, 0];
const expert = [1, 0, 1, 1, 0, 0, 0];
const total = (p: Record<string, number>) => Object.values(p).reduce((a, b) => a + b, 0);

describe("rng", () => {
  it("is reproducible and roughly standard normal", () => {
    expect(makeRng(7).next()).toBe(makeRng(7).next());
    const rng = makeRng(1);
    const xs = Array.from({ length: 20000 }, () => rng.normal());
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.abs(dot(xs, xs) / xs.length - 1)).toBeLessThan(0.05);
  });
});

describe("linalg", () => {
  it("Sherman-Morrison matches the true inverse, with and without discount", () => {
    for (const gamma of [1, 0.9]) {
      const x = [1, 2, 3];
      const inv = updateInverse(scaledIdentity(3, 1), x, gamma);
      const a = scaledIdentity(3, gamma).map((row, i) => row.map((v, j) => v + x[i] * x[j]));
      a.forEach((row, i) =>
        inv.forEach((_, j) =>
          expect(dot(row, inv.map((r) => r[j]))).toBeCloseTo(i === j ? 1 : 0, 9),
        ),
      );
    }
  });
});

describe("policy", () => {
  it("masks guided for experts and logs the exact sampled propensity", () => {
    expect(eligibleArms(expert)).not.toContain("guided");
    expect(eligibleArms(novice)).toContain("guided");
    const d = decide(createPolicy(), expert, 42);
    expect(d.probs.guided).toBe(0);
    expect(total(d.probs)).toBeCloseTo(1, 10);
    expect(d.propensity).toBe(d.probs[d.action]);
    for (const a of d.eligible) expect(d.probs[a]).toBeGreaterThanOrEqual(0.1 / d.eligible.length);
    expect(decide(createPolicy(), expert, 42)).toEqual(d);
  });

  it("samples actions at the logged frequencies", () => {
    let state = createPolicy();
    for (let i = 0; i < 10; i++) state = update(state, "shortcut", novice, 0.9);
    const n = 600;
    let hits = 0;
    let expected = 0;
    for (let seed = 0; seed < n; seed++) {
      const d = decide(state, novice, seed);
      hits += Number(d.action === "shortcut");
      expected += d.probs.shortcut;
    }
    expect(Math.abs(hits - expected) / n).toBeLessThan(0.06);
  });

  it("learns the better arm and leaves the other modality untouched", () => {
    const models = createModels();
    const before = policyHash(models.fine);
    let coarse = models.coarse;
    for (let i = 0; i < 40; i++) {
      for (const a of ARM_IDS) coarse = update(coarse, a, novice, a === "ergonomic" ? 0.9 : 0.2);
    }
    expect(decide(coarse, novice, 3).probs.ergonomic).toBeGreaterThan(0.85);
    expect(policyHash(models.fine)).toBe(before);
    expect(policyHash(coarse)).not.toBe(before);
  });

  it("placebo ignores context apart from the shared mask", () => {
    const q = { baseline: 0.1, ergonomic: 0.6, disclosure: 0.1, shortcut: 0.1, guided: 0.1 };
    const other = [1, 0, 0, 0, 1, 1, 1];
    expect(decidePlacebo(q, novice, 1).probs).toEqual(decidePlacebo(q, other, 1).probs);
    expect(total(decidePlacebo(q, expert, 1).probs)).toBeCloseTo(1, 10);
  });

  it("rejects bad updates", () => {
    expect(() => update(createPolicy(), "baseline", novice, 2)).toThrow();
    expect(() => update(createPolicy(), "baseline", [1], 0.5)).toThrow();
    expect(() => update(createPolicy(), "baseline", novice, NaN)).toThrow();
  });
});
