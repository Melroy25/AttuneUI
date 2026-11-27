import { describe, expect, it } from "vitest";
import { decideUniform, type Probs } from "../lib/attune-ui/bandit/policy";
import { blockReward } from "../lib/attune-ui/bandit/reward";
import { makeRng } from "../lib/attune-ui/rng";
import { buildContext } from "../lib/attune-ui/telemetry/context";
import { ARM_IDS } from "../lib/attune-ui/types";
import {
  alwaysArm, estimator, evaluate, policyTarget, rowsFromLog, uniformTarget, type OpeRow, type Target,
} from "../lib/eval/ope";
import { sampleUser, simulateBlock } from "../lib/eval/simulator";
import { priorFile } from "../lib/study/freeze";
import { simulatedLog } from "./synthetic";

/** Uniform logs from the simulator, plus every arm's reward for the same users (ground truth). */
function world(sessions: number, seed: number) {
  const rng = makeRng(seed);
  const rows: OpeRow[] = [];
  const counterfactual: Probs[] = [];
  for (let i = 0; i < sessions; i++) {
    const user = sampleUser(rng);
    const context = buildContext({ ...user, friction: simulateBlock(user, "baseline", rng).friction });
    const noise = Math.floor(rng.next() * 0xffffffff);
    const rewards = Object.fromEntries(ARM_IDS.map((a) =>
      [a, blockReward(simulateBlock(user, a, makeRng(noise)).tasks, a !== "baseline")])) as Probs;
    const d = decideUniform(context, noise ^ 0x5555);
    rows.push({
      sessionId: `s${String(i).padStart(5, "0")}`, block: 2, modality: user.modality,
      action: d.action, context, propensity: d.propensity, reward: rewards[d.action],
    });
    counterfactual.push(rewards);
  }
  const truth = (target: Target) => rows.reduce((s, row, i) => {
    const pi = target(row);
    return s + ARM_IDS.reduce((t, a) => t + pi[a] * counterfactual[i][a], 0);
  }, 0) / rows.length;
  return { rows, truth };
}

describe("off-policy estimators", () => {
  it("recover simulator ground truth", () => {
    const { rows, truth } = world(6000, 11);
    const estimate = estimator(rows);
    const targets = [alwaysArm("baseline"), alwaysArm("shortcut"), uniformTarget, policyTarget(priorFile().models)];
    for (const target of targets) {
      const value = estimate(target);
      const expected = truth(target);
      expect(Math.abs(value.ips! - expected)).toBeLessThan(0.025);
      expect(Math.abs(value.snips! - expected)).toBeLessThan(0.015);
      expect(Math.abs(value.dr! - expected)).toBeLessThan(0.015);
      expect(value.ess).toBeGreaterThan(500);
    }
  }, 60_000);

  it("gives the logged mean and full ESS when target equals the logging policy", () => {
    const { rows } = world(200, 3);
    const value = estimator(rows)(uniformTarget);
    const logged = rows.reduce((s, r) => s + r.reward, 0) / rows.length;
    expect(value.ips).toBeCloseTo(logged, 10);
    expect(value.ess).toBeCloseTo(200, 8);
    expect(estimator([])(uniformTarget)).toEqual({ ips: null, snips: null, dr: null, ess: 0 });
  });

  it("uses randomised decisions only and never mixes phases", () => {
    const log = simulatedLog("confirmatory", 30);
    const { rows, skipped } = rowsFromLog(log, "confirmatory");
    expect(rows).toHaveLength(20); // arm A is deterministic
    expect(skipped.notRandomised).toBe(10);
    expect(evaluate(log, "pilot").n).toBe(0);
    log.events.find((e) => e.participant_id === rows[0].sessionId && e.kind === "decision")!.payload =
      { action: rows[0].action, context: rows[0].context, probs: {} };
    expect(rowsFromLog(log, "confirmatory").rows).toHaveLength(19);
  });
});
