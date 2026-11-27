// Off-policy evaluation on randomised logs with logged propensities. Mirrored in Python.
import {
  createModels, decide, eligibleArms, theta, type Models, type Probs,
} from "../attune-ui/bandit/policy";
import { dot } from "../attune-ui/bandit/linalg";
import { replay, updatesFromLog, type EventLog, type SessionUpdate } from "../attune-ui/bandit/replay";
import { hashString } from "../attune-ui/rng";
import { ARM_IDS, type ArmId } from "../attune-ui/types";
import type { Phase } from "../study/assignment";

export const FOLDS = 5;

/** One logged decision and its block reward. */
export interface OpeRow extends SessionUpdate { propensity: number }
export type Target = (row: OpeRow) => Probs;

const only = (arm: ArmId) =>
  Object.fromEntries(ARM_IDS.map((a) => [a, a === arm ? 1 : 0])) as Probs;

/** Always `arm`, or the static layout where the arm is not eligible. */
export const alwaysArm = (arm: ArmId): Target => (row) =>
  only(eligibleArms(row.context).includes(arm) ? arm : "baseline");

export const uniformTarget: Target = (row) => {
  const eligible = eligibleArms(row.context);
  return Object.fromEntries(
    ARM_IDS.map((a) => [a, eligible.includes(a) ? 1 / eligible.length : 0]),
  ) as Probs;
};

export const policyTarget = (models: Models): Target => (row) =>
  decide(models[row.modality], row.context, hashString(`ope:${row.sessionId}:${row.block}`)).probs;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/**
 * Keeps only randomised decisions: every eligible arm had a positive logged probability.
 * Static arm A is deterministic and therefore dropped.
 */
export function rowsFromLog(log: EventLog, phase: Phase) {
  const { updates, skipped } = updatesFromLog(log, phase);
  const unique = new Map<string, EventLog["events"][number]>();
  for (const e of log.events) unique.set(`${e.participant_id}:${e.seq}`, e);
  const decisions = new Map<string, unknown>();
  for (const e of [...unique.values()].sort((a, b) => a.seq - b.seq)) {
    const key = `${e.participant_id}:${e.block}`;
    if (e.kind === "decision" && !decisions.has(key)) decisions.set(key, e.payload);
  }
  const rows: OpeRow[] = [];
  let notRandomised = 0;
  for (const u of updates) {
    const payload = decisions.get(`${u.sessionId}:${u.block}`);
    const probs = isRecord(payload) && isRecord(payload.probs) ? payload.probs : {};
    const ok = eligibleArms(u.context).every((a) => {
      const p = probs[a];
      return typeof p === "number" && p > 0 && p < 1;
    });
    const propensity = probs[u.action];
    if (!ok || typeof propensity !== "number" || !(propensity > 0 && propensity < 1)) {
      notRandomised++;
      continue;
    }
    rows.push({ ...u, propensity });
  }
  return { rows, skipped: { ...skipped, notRandomised } };
}

/**
 * Doubly robust reward model: ridge per modality and arm, cross-fitted by participant so a
 * row's own session never trains the prediction used for it.
 */
function rewardModels(rows: OpeRow[]): Map<string, Models> {
  const sessions = [...new Set(rows.map((r) => r.sessionId))].sort();
  const fold = new Map(sessions.map((s, i) => [s, i % FOLDS]));
  const fitted = Array.from({ length: FOLDS }, (_, k) =>
    replay(createModels(), rows.filter((r) => fold.get(r.sessionId) !== k), Infinity).models);
  return new Map(sessions.map((s) => [s, fitted[fold.get(s)!]]));
}

/** IPS, self-normalised IPS, doubly robust value and effective sample size. */
export function estimator(rows: OpeRow[]) {
  const models = rewardModels(rows);
  const predicted = rows.map((row) => {
    const state = models.get(row.sessionId)![row.modality];
    return Object.fromEntries(ARM_IDS.map((a) => [a, dot(theta(state[a]), row.context)])) as Probs;
  });
  return (target: Target) => {
    if (rows.length === 0) return { ips: null, snips: null, dr: null, ess: 0 };
    let sumW = 0;
    let sumW2 = 0;
    let sumWr = 0;
    let dr = 0;
    rows.forEach((row, i) => {
      const pi = target(row);
      const w = pi[row.action] / row.propensity;
      sumW += w;
      sumW2 += w * w;
      sumWr += w * row.reward;
      dr += ARM_IDS.reduce((s, a) => s + pi[a] * predicted[i][a], 0) +
        w * (row.reward - predicted[i][row.action]);
    });
    return {
      ips: sumWr / rows.length,
      snips: sumW > 0 ? sumWr / sumW : null,
      dr: dr / rows.length,
      ess: sumW2 > 0 ? (sumW * sumW) / sumW2 : 0,
    };
  };
}

/** `policy` adds the value of a given policy (normally the frozen one). */
export function evaluate(log: EventLog, phase: Phase, policy?: Models) {
  const { rows, skipped } = rowsFromLog(log, phase);
  const estimate = estimator(rows);
  const targets: [string, Target][] = [
    ...ARM_IDS.map((a): [string, Target] => [`always:${a}`, alwaysArm(a)]),
    ["uniform", uniformTarget],
  ];
  if (policy) targets.push(["policy", policyTarget(policy)]);
  return {
    phase,
    n: rows.length,
    skipped,
    meanLoggedReward: rows.length > 0 ? rows.reduce((s, r) => s + r.reward, 0) / rows.length : null,
    targets: Object.fromEntries(targets.map(([name, t]) => [name, estimate(t)])),
  };
}
