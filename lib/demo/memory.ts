// What the demo learned, kept in the visitor's own browser. Never study data.
import type { Models } from "../attune-ui/bandit/policy";
import { DIM } from "../attune-ui/telemetry/context";
import { ARM_IDS } from "../attune-ui/types";

export interface Memory { models: Models; liveUpdates: number; simulatedUpdates: number }

export const memoryKey = (user: string | null) => `attune-model:${user ?? "guest"}`;
export const encodeMemory = (memory: Memory): string => JSON.stringify({ v: 1, ...memory });

type Json = Record<string, unknown> | undefined;
const vector = (v: unknown) => Array.isArray(v) && v.length === DIM && v.every((x) => Number.isFinite(x));
const count = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const policy = (v: Json) => ARM_IDS.every((id) => {
  const arm = v?.[id] as Json;
  return !!arm && count(arm.n) && vector(arm.b) &&
    Array.isArray(arm.aInv) && arm.aInv.length === DIM && arm.aInv.every(vector);
});

/** Storage can be edited or out of date: anything that does not fit is dropped. */
export function parseMemory(raw: string | null): Memory | null {
  try {
    const v = JSON.parse(raw ?? "null") as Json | null;
    const models = v?.models as Json;
    if (!v || v.v !== 1 || !count(v.liveUpdates) || !count(v.simulatedUpdates) ||
      !policy(models?.coarse as Json) || !policy(models?.fine as Json)) return null;
    return { models: models as unknown as Models, liveUpdates: v.liveUpdates, simulatedUpdates: v.simulatedUpdates };
  } catch {
    return null;
  }
}
