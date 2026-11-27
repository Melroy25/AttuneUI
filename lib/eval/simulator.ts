// SIMULATED users. Effects below are authored assumptions: this validates the
// learning mechanics only and is never evidence about real people.
import {
  DEFAULT_CONFIG, createModels, decide, update, type Decision, type Models,
} from "../attune-ui/bandit/policy";
import { TASK_CAP_MS, blockReward, type TaskOutcome } from "../attune-ui/bandit/reward";
import { makeRng, type Rng } from "../attune-ui/rng";
import { SURFACES, type SurfaceConfig } from "../attune-ui/surface/catalog";
import { buildContext } from "../attune-ui/telemetry/context";
import { frictionCount } from "../attune-ui/telemetry/friction";
import type { ArmId, FrictionSummary, Modality } from "../attune-ui/types";

export const TASKS_PER_BLOCK = 3;

export interface SimUser {
  modality: Modality;
  viewportWidth: number;
  priorSessions: number;
  imprecision: number; // 0..1, motor difficulty
  overload: number; // 0..1, sensitivity to choice clutter
  hunting: number; // 0..1, trouble finding buried actions
}

export function sampleUser(rng: Rng): SimUser {
  const coarse = rng.next() < 0.5;
  return {
    modality: coarse ? "coarse" : "fine",
    viewportWidth: coarse ? 390 : 1366,
    priorSessions: Math.floor(rng.next() * 8),
    imprecision: rng.next() * (coarse ? 1 : 0.5),
    overload: rng.next(),
    hunting: rng.next(),
  };
}

/** effectScale 0 is the null world: every surface behaves like the static one. */
export function simulateTask(
  user: SimUser, surface: SurfaceConfig, rng: Rng, effectScale = 1,
): { outcome: TaskOutcome; friction: FrictionSummary } {
  const mix = (base: number, adapted: number) => base + effectScale * (adapted - base);
  const novice = user.priorSessions < 3 ? 1 : 0;
  const coarse = user.modality === "coarse";

  const large = surface.targetSize === "large";
  const width = mix(coarse ? 28 : 24, large ? 48 : coarse ? 28 : 24);
  const choices = mix(14, surface.secondaryFilters === "collapsed" ? 6 : 14);
  const steps = mix(7, surface.quickActions.length > 0 ? 5 : 7);

  const fitts = 200 + 150 * Math.log2(300 / width + 1); // ms per tap
  const hick = 400 * Math.log2(choices + 1) * (1 + 2 * user.overload);
  const missRate = user.imprecision * Math.min(24 / width, 1.2) * (coarse ? 1 : 0.5);
  const huntRate = user.hunting * mix(1, surface.actionableBadge ? 0.25 : 1);
  const confusion = novice * mix(1, surface.stepHints ? 0.35 : 1);
  const reading = mix(0, surface.stepHints ? (novice ? 700 : 2500) : 0);

  // Fixed number of random draws, whatever the surface, so arms stay paired.
  const count = (rate: number) =>
    [rng.next(), rng.next(), rng.next()].filter((u) => u < Math.min(rate, 0.95)).length;
  const miss = count(missRate);
  const rage = count(missRate * 0.4);
  const dead = count(huntRate * 0.7);
  const hesitate = count(user.overload * (choices / 14) * 0.5 + confusion * 0.3);
  const noise = Math.exp(0.2 * rng.normal());
  const giveUp = rng.next();

  const errors = miss + rage + dead + hesitate;
  const raw =
    (steps * fitts + 3 * hick + 1400 * errors + 4000 * huntRate + 3500 * confusion + reading) *
    noise;
  const success = raw < TASK_CAP_MS && giveUp > 0.02 * errors;
  const friction: FrictionSummary = {
    rage, miss, dead,
    dwell: coarse ? 0 : hesitate,
    thrash: coarse ? hesitate : 0,
    backtrack: 0,
    tortuosity: 1,
  };
  return {
    outcome: { success, timeMs: Math.min(raw, TASK_CAP_MS), friction: frictionCount(friction) },
    friction,
  };
}

export function simulateBlock(
  user: SimUser, arm: ArmId, rng: Rng, effectScale = 1,
): { tasks: TaskOutcome[]; friction: FrictionSummary } {
  const runs = Array.from({ length: TASKS_PER_BLOCK }, () =>
    simulateTask(user, SURFACES[arm], rng, effectScale),
  );
  const friction = runs.reduce<FrictionSummary>(
    (sum, { friction: f }) => ({
      rage: sum.rage + f.rage,
      dead: sum.dead + f.dead,
      miss: sum.miss + f.miss,
      dwell: sum.dwell + f.dwell,
      thrash: sum.thrash + f.thrash,
      backtrack: sum.backtrack + f.backtrack,
      tortuosity: Math.max(sum.tortuosity, f.tortuosity),
    }),
    { rage: 0, dead: 0, miss: 0, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1 },
  );
  return { tasks: runs.map((r) => r.outcome), friction };
}

export interface SimRecord {
  user: SimUser;
  decision: Decision;
  reward: number;
  tasks: TaskOutcome[];
}

/** Block 1 static (context), one decision, Block 2 adapted (reward), then learn. */
export function runLearning(options: {
  sessions: number;
  seed: number;
  effectScale?: number;
  models?: Models;
}): { records: SimRecord[]; models: Models } {
  const { sessions, seed, effectScale = 1 } = options;
  const rng = makeRng(seed);
  let models = options.models ?? createModels();
  const records: SimRecord[] = [];
  for (let i = 0; i < sessions; i++) {
    const user = sampleUser(rng);
    const before = simulateBlock(user, "baseline", rng, effectScale);
    const x = buildContext({ ...user, friction: before.friction });
    const decision = decide(models[user.modality], x, (seed + i * 7919) >>> 0, DEFAULT_CONFIG);
    const after = simulateBlock(user, decision.action, rng, effectScale);
    const reward = blockReward(after.tasks, decision.action !== "baseline");
    models = {
      ...models,
      [user.modality]: update(models[user.modality], decision.action, x, reward),
    };
    records.push({ user, decision, reward, tasks: after.tasks });
  }
  return { records, models };
}
