// SIMULATED prior -> (pilot replay) -> frozen policy for the confirmatory arms.
import {
  DEFAULT_CONFIG, decide, theta, type Models, type Probs,
} from "../attune-ui/bandit/policy";
import { SESSION_UPDATE_CAP, replay, updatesFromLog, type EventLog, type SessionUpdate } from "../attune-ui/bandit/replay";
import { hashString } from "../attune-ui/rng";
import { ARM_IDS, type ArmId } from "../attune-ui/types";
import { PRIOR_SEED, PRIOR_SESSIONS, simulatorPrior } from "../demo/prior";

export interface PolicyFile { models: Models; marginals: Probs; hash: string; config: typeof DEFAULT_CONFIG }

export const fileHash = (models: Models, marginals: Probs) =>
  hashString(JSON.stringify([models, marginals])).toString(16).padStart(8, "0");

/** No timestamps: the same code always writes the same file. */
export function priorFile() {
  const { models, marginals } = simulatorPrior();
  return {
    schemaVersion: 1,
    kind: "prior",
    provenance: `SIMULATED (${PRIOR_SESSIONS} sessions, seed ${PRIOR_SEED}); no human data`,
    sessions: PRIOR_SESSIONS,
    seed: PRIOR_SEED,
    config: DEFAULT_CONFIG,
    hash: fileHash(models, marginals),
    models,
    marginals,
  };
}

/**
 * Arm B's marginals: the frozen policy's average win probability over the pilot's first
 * decision contexts (the confirmatory decision point). The epsilon mix is removed here
 * because the placebo adds it again.
 */
export function marginalsOver(models: Models, points: SessionUpdate[]): Probs {
  const sum = Object.fromEntries(ARM_IDS.map((a) => [a, 0])) as Record<ArmId, number>;
  const { epsilon } = DEFAULT_CONFIG;
  for (const p of points) {
    const d = decide(models[p.modality], p.context, hashString(`marginal:${p.sessionId}`));
    for (const a of d.eligible) {
      sum[a] += Math.max(d.probs[a] - epsilon / d.eligible.length, 0) / (1 - epsilon);
    }
  }
  return Object.fromEntries(ARM_IDS.map((a) => [a, sum[a] / points.length])) as Probs;
}

/** Euclidean distance between mean weights, per modality and arm. */
const weightShift = (from: Models, to: Models) =>
  Object.fromEntries((["coarse", "fine"] as const).map((m) => [m, Object.fromEntries(ARM_IDS.map((a) => {
    const before = theta(from[m][a]);
    return [a, Math.hypot(...theta(to[m][a]).map((w, i) => w - before[i]))];
  }))]));

export function freezePolicy(prior: PolicyFile, log: EventLog) {
  // The prior is only usable if it is intact and was built with the current policy settings.
  if (fileHash(prior.models, prior.marginals) !== prior.hash) throw new Error("prior file was edited");
  if (JSON.stringify(prior.config) !== JSON.stringify(DEFAULT_CONFIG)) {
    throw new Error("prior config differs from the code; regenerate the prior");
  }
  const { updates, skipped } = updatesFromLog(log, "pilot");
  const { models, applied, capped } = replay(prior.models, updates);
  const first = applied.filter((u, i) => applied.findIndex((v) => v.sessionId === u.sessionId) === i);
  if (first.length === 0) throw new Error("no usable pilot blocks in the export");
  const marginals = marginalsOver(models, first);
  const sessions = new Set(applied.map((u) => u.sessionId));
  return {
    schemaVersion: 1,
    kind: "frozen",
    provenance: "SIMULATED prior updated by replaying human pilot blocks",
    config: DEFAULT_CONFIG,
    priorHash: prior.hash,
    hash: fileHash(models, marginals),
    pilot: {
      participants: sessions.size,
      offlineParticipants: log.participants.filter((p) => p.offline && sessions.has(p.id)).length,
      updates: applied.length,
      cappedUpdates: capped,
      updateCap: SESSION_UPDATE_CAP,
      skipped,
    },
    weightShift: weightShift(prior.models, models),
    models,
    marginals,
  };
}
