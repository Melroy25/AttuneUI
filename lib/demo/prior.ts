// SIMULATED warm start for the demo and the delivery API, until a frozen policy exists.
import type { Models, Probs } from "../attune-ui/bandit/policy";
import { ARM_IDS } from "../attune-ui/types";
import { runLearning } from "../eval/simulator";

export const PRIOR_SESSIONS = 1500;
export const PRIOR_SEED = 2026;

let cached: { models: Models; marginals: Probs } | null = null;

export function simulatorPrior() {
  if (cached) return cached;
  const { models, records } = runLearning({ sessions: PRIOR_SESSIONS, seed: PRIOR_SEED });
  // Arm frequencies of the learned policy's later decisions: the placebo's marginals.
  const late = records.slice(-500);
  const marginals = Object.fromEntries(
    ARM_IDS.map((a) => [a, late.filter((r) => r.decision.action === a).length / late.length]),
  ) as Probs;
  cached = { models, marginals };
  return cached;
}
