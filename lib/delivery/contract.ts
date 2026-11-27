// Model delivery contract shared by the web app and any native (APK) client.
import { DEFAULT_CONFIG, decide, policyHash, theta } from "../attune-ui/bandit/policy";
import { SURFACES } from "../attune-ui/surface/catalog";
import { FEATURES, buildContext, modalityOf } from "../attune-ui/telemetry/context";
import { ARM_IDS, type FrictionSummary, type PointerKind } from "../attune-ui/types";
import { PRIOR_SEED, PRIOR_SESSIONS, simulatorPrior } from "../demo/prior";

export const SCHEMA_VERSION = 1;
export const MAX_BODY_BYTES = 2000;

const PROVENANCE = `SIMULATED prior (${PRIOR_SESSIONS} sessions, seed ${PRIOR_SEED}); not frozen`;
const version = () => {
  const { models } = simulatorPrior();
  return `${policyHash(models.coarse)}-${policyHash(models.fine)}`;
};

export function policyDocument() {
  const { models, marginals } = simulatorPrior();
  const weights = (m: "coarse" | "fine") =>
    Object.fromEntries(ARM_IDS.map((a) => [a, theta(models[m][a])]));
  return {
    schemaVersion: SCHEMA_VERSION,
    policyVersion: version(),
    provenance: PROVENANCE,
    features: FEATURES,
    config: DEFAULT_CONFIG,
    surfaces: SURFACES,
    marginals,
    // Mean weights only; sampling with uncertainty happens through POST /api/decide.
    weights: { coarse: weights("coarse"), fine: weights("fine") },
  };
}

export interface DecideRequest {
  pointer: PointerKind;
  viewportWidth: number;
  priorSessions: number;
  seed: number;
  friction: FrictionSummary;
}

const FRICTION_KEYS = [
  "rage", "dead", "miss", "dwell", "thrash", "backtrack", "tortuosity",
] as const;

const bounded = (v: unknown, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;

export function parseDecideRequest(input: unknown): DecideRequest | null {
  if (typeof input !== "object" || input === null) return null;
  const r = input as Record<string, unknown>;
  const f = r.friction as Record<string, unknown> | null | undefined;
  if (
    !(r.pointer === "mouse" || r.pointer === "touch" || r.pointer === "pen") ||
    !bounded(r.viewportWidth, 10_000) || !bounded(r.priorSessions, 1_000_000) ||
    !bounded(r.seed, 0xffffffff) || !Number.isInteger(r.seed) ||
    typeof f !== "object" || f === null || !FRICTION_KEYS.every((k) => bounded(f[k], 10_000))
  ) return null;
  return {
    pointer: r.pointer, viewportWidth: r.viewportWidth, priorSessions: r.priorSessions,
    seed: r.seed,
    friction: Object.fromEntries(FRICTION_KEYS.map((k) => [k, f[k]])) as unknown as FrictionSummary,
  };
}

export function decideResponse(request: DecideRequest, now: () => number) {
  const { models } = simulatorPrior(); // warm-up is excluded from the latency figure
  const modality = modalityOf(request.pointer);
  const started = now();
  const decision = decide(models[modality], buildContext(request), request.seed);
  const latencyMs = now() - started;
  return {
    schemaVersion: SCHEMA_VERSION,
    policyVersion: version(),
    provenance: PROVENANCE,
    modality,
    decision,
    surface: SURFACES[decision.action],
    latencyMs,
  };
}
