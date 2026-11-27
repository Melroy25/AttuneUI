import { hashString, makeRng } from "../rng";
import { DIM, FEATURES } from "../telemetry/context";
import { ARM_IDS, type ArmId, type Modality } from "../types";
import { dot, matVec, scaledIdentity, updateInverse, type Mat, type Vec } from "./linalg";

export interface ArmModel { aInv: Mat; b: Vec; n: number }
export type PolicyState = Record<ArmId, ArmModel>;
export type Models = Record<Modality, PolicyState>;
export type Probs = Record<ArmId, number>;

export interface PolicyConfig {
  v: number; // exploration scale
  epsilon: number; // uniform mix over eligible arms
  draws: number; // Monte Carlo draws for win probabilities
  lambda: number; // ridge prior precision
  gamma: number; // 1 = no forgetting
}
export const DEFAULT_CONFIG: PolicyConfig = { v: 0.25, epsilon: 0.1, draws: 2000, lambda: 1, gamma: 1 };

export interface Decision {
  action: ArmId;
  propensity: number;
  probs: Probs;
  eligible: ArmId[];
  context: Vec;
  seed: number;
}

const perArm = <T>(make: (arm: ArmId) => T) =>
  Object.fromEntries(ARM_IDS.map((a) => [a, make(a)])) as Record<ArmId, T>;

export function createPolicy(config = DEFAULT_CONFIG): PolicyState {
  return perArm(() => ({
    aInv: scaledIdentity(DIM, 1 / config.lambda),
    b: new Array<number>(DIM).fill(0),
    n: 0,
  }));
}

export const createModels = (config = DEFAULT_CONFIG): Models => ({
  coarse: createPolicy(config),
  fine: createPolicy(config),
});

/** Guided hints are only for novices who are showing friction. */
export function eligibleArms(x: Vec): ArmId[] {
  const at = (name: (typeof FEATURES)[number]) => x[FEATURES.indexOf(name)];
  const struggling = at("dead") + at("rage") + at("miss") + at("hesitation") > 0;
  const guided = at("familiarity") < 0.6 && struggling;
  return ARM_IDS.filter((a) => a !== "guided" || guided);
}

export const theta = (arm: ArmModel): Vec => matVec(arm.aInv, arm.b);

/** theta_a * x, per feature: the exact explanation of an arm's mean score. */
export const contributions = (arm: ArmModel, x: Vec): Vec => theta(arm).map((w, i) => w * x[i]);

function thompsonProbs(
  state: PolicyState, x: Vec, eligible: ArmId[], config: PolicyConfig, seed: number,
): Probs {
  const rng = makeRng(seed);
  const scores = eligible.map((a) => ({
    mean: dot(theta(state[a]), x),
    sd: config.v * Math.sqrt(Math.max(dot(x, matVec(state[a].aInv, x)), 0)),
  }));
  const wins = new Array<number>(eligible.length).fill(0);
  for (let d = 0; d < config.draws; d++) {
    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < scores.length; i++) {
      const s = scores[i].mean + scores[i].sd * rng.normal();
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    wins[best]++;
  }
  const probs = perArm(() => 0);
  eligible.forEach((a, i) => {
    probs[a] = (1 - config.epsilon) * (wins[i] / config.draws) + config.epsilon / eligible.length;
  });
  return probs;
}

/** Samples from exactly the vector that gets logged, so propensities are exact. */
function sample(probs: Probs, eligible: ArmId[], x: Vec, seed: number): Decision {
  const u = makeRng(seed ^ 0x9e3779b9).next();
  let acc = 0;
  let action = eligible[eligible.length - 1];
  for (const a of eligible) {
    acc += probs[a];
    if (u < acc) {
      action = a;
      break;
    }
  }
  return { action, propensity: probs[action], probs, eligible, context: x, seed };
}

export function decide(state: PolicyState, x: Vec, seed: number, config = DEFAULT_CONFIG): Decision {
  const eligible = eligibleArms(x);
  return sample(thompsonProbs(state, x, eligible, config, seed), eligible, x, seed);
}

/** Context-blind placebo: frozen marginal frequencies, same mask, same epsilon floor. */
export function decidePlacebo(
  marginals: Probs, x: Vec, seed: number, config = DEFAULT_CONFIG,
): Decision {
  const eligible = eligibleArms(x);
  const total = eligible.reduce((s, a) => s + marginals[a], 0);
  const probs = perArm(() => 0);
  for (const a of eligible) {
    const q = total > 0 ? marginals[a] / total : 1 / eligible.length;
    probs[a] = (1 - config.epsilon) * q + config.epsilon / eligible.length;
  }
  return sample(probs, eligible, x, seed);
}

/** Uniform random over eligible arms (pilot logging policy). */
export function decideUniform(x: Vec, seed: number): Decision {
  const eligible = eligibleArms(x);
  const probs = perArm((a) => (eligible.includes(a) ? 1 / eligible.length : 0));
  return sample(probs, eligible, x, seed);
}

export function update(
  state: PolicyState, action: ArmId, x: Vec, reward: number, config = DEFAULT_CONFIG,
): PolicyState {
  if (x.length !== DIM || !x.every(Number.isFinite)) throw new Error("invalid context");
  if (!(reward >= 0 && reward <= 1)) throw new Error("reward must be in [0, 1]");
  const arm = state[action];
  return {
    ...state,
    [action]: {
      aInv: updateInverse(arm.aInv, x, config.gamma),
      b: arm.b.map((v, i) => config.gamma * v + reward * x[i]),
      n: arm.n + 1,
    },
  };
}

export const policyHash = (state: PolicyState): string =>
  hashString(JSON.stringify(ARM_IDS.map((a) => state[a]))).toString(16).padStart(8, "0");
