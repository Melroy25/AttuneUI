// Server only: loads the frozen policy for the confirmatory phase. Fails closed.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONFIG, type Models, type Probs } from "../attune-ui/bandit/policy";
import { DIM } from "../attune-ui/telemetry/context";
import { ARM_IDS } from "../attune-ui/types";
import { fileHash } from "../study/freeze";

export interface StudyPolicy { models: Models; marginals: Probs; hash: string }
export type Loaded = { policy: StudyPolicy; error?: never } | { policy?: never; error: string };

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const vector = (v: unknown) => Array.isArray(v) && v.length === DIM && v.every(finite);

export function parseFrozen(input: unknown): StudyPolicy {
  const f = input as Partial<StudyPolicy & { kind: string; config: unknown }> | null;
  if (f?.kind !== "frozen") throw new Error('not a frozen policy (kind must be "frozen")');
  if (JSON.stringify(f.config) !== JSON.stringify(DEFAULT_CONFIG)) throw new Error("config differs from the code");
  const { models, marginals, hash } = f;
  const armsOk = (["coarse", "fine"] as const).every((m) => ARM_IDS.every((a) => {
    const arm = models?.[m]?.[a];
    return Array.isArray(arm?.aInv) && arm.aInv.length === DIM && arm.aInv.every(vector) &&
      vector(arm.b) && finite(arm.n);
  }));
  if (!armsOk) throw new Error("model weights are malformed");
  const q = ARM_IDS.map((a) => marginals?.[a]);
  if (!q.every((v) => finite(v) && v >= 0) || Math.abs((q as number[]).reduce((s, v) => s + v, 0) - 1) > 1e-6) {
    throw new Error("marginals are malformed");
  }
  if (fileHash(models!, marginals!) !== hash) throw new Error("hash mismatch: the file was edited");
  return { models: models!, marginals: marginals!, hash: hash! };
}

export function loadFrozenPolicy(): Loaded {
  let text: string;
  try {
    text = readFileSync(join(process.cwd(), "data", "policy.frozen.json"), "utf8");
  } catch {
    return {
      error: "STUDY_PHASE is confirmatory but data/policy.frozen.json does not exist. " +
        "Run: npm run policy:freeze -- <pilot export.json>, commit the file and redeploy.",
    };
  }
  try {
    return { policy: parseFrozen(JSON.parse(text)) };
  } catch (error) {
    return { error: `data/policy.frozen.json is invalid: ${(error as Error).message}` };
  }
}
