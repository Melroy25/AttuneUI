// What a /demo visitor's browser reports to the admin page. Never study data, never typed text.
import { DIM } from "../attune-ui/telemetry/context";
import { ARM_IDS, type ArmId, type FrictionSummary } from "../attune-ui/types";

export const MAX_SNAPSHOT_BYTES = 8_000;
const SIGNALS = ["rage", "dead", "miss", "dwell", "thrash", "backtrack", "tortuosity"] as const;

export interface LiveSnapshot {
  id: string;
  page: string;
  arm: ArmId;
  mode: string;
  block: number;
  auto: boolean;
  pinned: boolean;
  locale: string;
  viewportWidth: number;
  modality: string;
  friction: FrictionSummary;
  context: number[];
  decision: { action: ArmId; propensity: number; probs: Record<ArmId, number> } | null;
  why: string[];
  changes: string[];
  log: string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, max = 1e6): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const lines = (v: unknown, count: number): v is string[] =>
  Array.isArray(v) && v.length <= count && v.every((x) => text(x, 300));
const arm = (v: unknown) => ARM_IDS.find((a) => a === v);

function decision(v: unknown): LiveSnapshot["decision"] | undefined {
  if (v === null) return null;
  if (!isRecord(v) || !arm(v.action) || !num(v.propensity, 1) || !isRecord(v.probs)) return undefined;
  const probs = v.probs;
  if (!ARM_IDS.every((a) => num(probs[a], 1))) return undefined;
  return {
    action: arm(v.action)!, propensity: v.propensity,
    probs: Object.fromEntries(ARM_IDS.map((a) => [a, probs[a]])) as Record<ArmId, number>,
  };
}

/** Trust boundary: anyone can post, so only known fields of the right shape survive. */
export function parseSnapshot(v: unknown): LiveSnapshot | null {
  if (!isRecord(v) || !text(v.id, 36) || !UUID.test(v.id)) return null;
  const chosen = decision(v.decision);
  const f = v.friction;
  if (
    chosen === undefined || !arm(v.arm) || !text(v.page, 20) || !text(v.mode, 10) || !text(v.locale, 5) ||
    !text(v.modality, 10) || !num(v.block) || !num(v.viewportWidth, 10_000) ||
    typeof v.auto !== "boolean" || typeof v.pinned !== "boolean" ||
    !isRecord(f) || !SIGNALS.every((k) => num(f[k])) ||
    !Array.isArray(v.context) || v.context.length !== DIM || !v.context.every((x) => num(x, 1)) ||
    !lines(v.why, 6) || !lines(v.changes, 12) || !lines(v.log, 8)
  ) return null;
  return {
    id: v.id, page: v.page, arm: arm(v.arm)!, mode: v.mode, block: v.block, auto: v.auto, pinned: v.pinned,
    locale: v.locale, viewportWidth: v.viewportWidth, modality: v.modality,
    friction: Object.fromEntries(SIGNALS.map((k) => [k, f[k]])) as unknown as FrictionSummary,
    context: v.context as number[], decision: chosen, why: v.why, changes: v.changes, log: v.log,
  };
}
