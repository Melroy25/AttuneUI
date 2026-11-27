import { describe, expect, it } from "vitest";
import { blockReward, taskReward } from "../lib/attune-ui/bandit/reward";
import { makeRng } from "../lib/attune-ui/rng";
import { SURFACES } from "../lib/attune-ui/surface/catalog";
import { safeSurface, validateSurface } from "../lib/attune-ui/surface/validate";
import { ARM_IDS, type ArmId } from "../lib/attune-ui/types";
import { runLearning, sampleUser, simulateBlock } from "../lib/eval/simulator";

describe("reward", () => {
  it("matches hand-computed values", () => {
    const fast = { success: true, timeMs: 15000, friction: 0 };
    expect(taskReward(fast, false)).toBeCloseTo(1);
    // .5 + .35 * .5 + .15 * .6 - .05
    expect(taskReward({ success: true, timeMs: 30000, friction: 2 }, true)).toBeCloseTo(0.715);
    expect(taskReward({ success: false, timeMs: 1000, friction: 0 }, false)).toBeCloseTo(0.15);
    expect(taskReward({ success: false, timeMs: 90000, friction: 9 }, true)).toBe(0);
    expect(blockReward([fast, { success: false, timeMs: 1000, friction: 0 }], false)).toBeCloseTo(0.575);
    expect(() => blockReward([], false)).toThrow();
    expect(() => taskReward({ success: true, timeMs: 0, friction: 0 }, false)).toThrow();
  });
});

describe("surface", () => {
  it("accepts every preset after a JSON round trip", () => {
    for (const arm of ARM_IDS) {
      expect(validateSurface(JSON.parse(JSON.stringify(SURFACES[arm])))).toEqual(SURFACES[arm]);
    }
  });

  it("rejects extra keys, bad values and non-objects, falling back to static", () => {
    const good = SURFACES.shortcut;
    for (const bad of [
      { ...good, html: "<script>" },
      { ...good, targetSize: "huge" },
      { ...good, quickActions: ["deleteAll"] },
      { ...good, quickActions: ["refund", "refund"] },
      null, [], "x",
    ]) expect(validateSurface(bad)).toBeNull();
    expect(safeSurface({})).toBe(SURFACES.baseline);
  });
});

describe("simulator", () => {
  it("is deterministic", () => {
    expect(runLearning({ sessions: 20, seed: 5 })).toEqual(runLearning({ sessions: 20, seed: 5 }));
  });

  it("null world: every arm gives identical outcomes", () => {
    const user = sampleUser(makeRng(2));
    const results = ARM_IDS.map((a) => simulateBlock(user, a, makeRng(9), 0));
    for (const r of results) expect(r).toEqual(results[0]);
  });

  // Paired: same users and same noise for both surfaces. The true headroom is only
  // about 0.03 reward units, so unpaired or short runs cannot resolve it.
  it("learning beats the static surface on the same simulated users", () => {
    for (const seed of [11, 12, 13]) {
      const late = runLearning({ sessions: 3000, seed }).records.slice(-200);
      let gain = 0;
      late.forEach((r, i) => {
        for (let k = 0; k < 20; k++) {
          const score = (arm: ArmId) =>
            blockReward(
              simulateBlock(r.user, arm, makeRng(i * 31 + k)).tasks,
              arm !== "baseline",
            );
          gain += (score(r.decision.action) - score("baseline")) / (late.length * 20);
        }
      });
      expect(gain).toBeGreaterThan(0.005);
    }
  }, 30_000);
});
