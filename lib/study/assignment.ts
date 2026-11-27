// Allocation: permuted blocks of 3 within each pointer-type stratum.
import { hashString, makeRng } from "../attune-ui/rng";
import type { PointerKind } from "../attune-ui/types";
import type { Variant } from "./tasks";

export const STUDY_ARMS = ["A", "B", "C"] as const; // static, placebo, AttuneUI
export type StudyArm = (typeof STUDY_ARMS)[number];
export const VARIANT_ORDERS = ["AB", "BA"] as const;
export type VariantOrder = (typeof VARIANT_ORDERS)[number];
export interface Assignment { arm: StudyArm; order: VariantOrder }

/** Pre-freeze data is phone testing only and is never pooled with pilot or confirmatory rows. */
export const STUDY_PHASE = "test";

// shortcut: committed seed, so the schedule is auditable but predictable; use a secret seed if concealment matters.
const SEED = "attune-study-v1";

/** `seq` is the participant's 0-based position within phase + stratum. */
export function assign(phase: string, pointer: PointerKind, seq: number): Assignment {
  const block = Math.floor(seq / STUDY_ARMS.length);
  const rng = makeRng(hashString(`${SEED}:${phase}:${pointer}:${block}`));
  const arms: StudyArm[] = [...STUDY_ARMS];
  for (let i = arms.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [arms[i], arms[j]] = [arms[j], arms[i]];
  }
  // Consecutive blocks take opposite orders, so every 6 slots cross each arm with both orders.
  const flip = makeRng(hashString(`${SEED}:${phase}:${pointer}:order:${block >> 1}`)).next() < 0.5 ? 1 : 0;
  return { arm: arms[seq % STUDY_ARMS.length], order: VARIANT_ORDERS[(block ^ flip) & 1] };
}

/** Used only when the server is unreachable; these participants are flagged and analysed apart. */
export function offlineAssignment(participantId: string): Assignment {
  const rng = makeRng(hashString(`${SEED}:offline:${participantId}`));
  return {
    arm: STUDY_ARMS[Math.floor(rng.next() * STUDY_ARMS.length)],
    order: VARIANT_ORDERS[Math.floor(rng.next() * VARIANT_ORDERS.length)],
  };
}

export const variantFor = (order: VariantOrder, block: 1 | 2) => order[block - 1] as Variant;
