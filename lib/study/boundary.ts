// The decision at a block boundary: one per participant, except two uniform ones in the pilot.
import {
  decide, decidePlacebo, decideUniform, policyHash, type Decision, type Models, type Probs,
} from "../attune-ui/bandit/policy";
import { hashString } from "../attune-ui/rng";
import { buildContext, modalityOf } from "../attune-ui/telemetry/context";
import { ARM_IDS, type FrictionSummary, type PointerKind } from "../attune-ui/types";
import type { Block, StudyArm } from "./assignment";

export function sumFriction(tasks: FrictionSummary[]): FrictionSummary {
  const total: FrictionSummary = {
    rage: 0, dead: 0, miss: 0, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1,
  };
  for (const f of tasks) {
    for (const key of ["rage", "dead", "miss", "dwell", "thrash", "backtrack"] as const) {
      total[key] += f[key];
    }
    total.tortuosity = Math.max(total.tortuosity, f.tortuosity);
  }
  return total;
}

const staticDecision = (context: number[], seed: number): Decision => ({
  action: "baseline",
  propensity: 1,
  probs: Object.fromEntries(ARM_IDS.map((a) => [a, a === "baseline" ? 1 : 0])) as Probs,
  eligible: ["baseline"],
  context,
  seed,
});

export function boundaryDecision(input: {
  arm: StudyArm;
  previous: FrictionSummary[]; // the block just finished: pre-decision events only
  block: Block; // the block being decided
  pointer: PointerKind;
  viewportWidth: number;
  participantId: string;
  policy: { models: Models; marginals: Probs };
}) {
  const modality = modalityOf(input.pointer);
  const context = buildContext({
    friction: sumFriction(input.previous), viewportWidth: input.viewportWidth, priorSessions: 0,
  });
  const suffix = input.arm === "P" ? `:${input.block}` : ""; // independent pilot draws
  const seed = hashString(`study:${input.participantId}${suffix}`);
  const { models, marginals } = input.policy;
  const decision =
    input.arm === "A" ? staticDecision(context, seed)
    : input.arm === "P" ? decideUniform(context, seed)
    : input.arm === "B" ? decidePlacebo(marginals, context, seed)
    : decide(models[modality], context, seed);
  const hash =
    input.arm === "A" ? "static"
    : input.arm === "P" ? "uniform"
    : input.arm === "B" ? hashString(JSON.stringify(marginals)).toString(16).padStart(8, "0")
    : policyHash(models[modality]);
  return { ...decision, arm: input.arm, modality, policyHash: hash };
}
