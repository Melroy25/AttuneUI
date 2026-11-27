// Allocation: permuted blocks of 3 within each pointer-type stratum.
import { hashString, makeRng } from "../attune-ui/rng";
import type { PointerKind } from "../attune-ui/types";
import type { Variant } from "./tasks";

export const STUDY_ARMS = ["A", "B", "C"] as const; // static, placebo, AttuneUI
/** "P": pilot participant, uniform-random surface at every boundary. */
export type StudyArm = (typeof STUDY_ARMS)[number] | "P";
export const VARIANT_ORDERS = ["AB", "BA"] as const;
export type VariantOrder = (typeof VARIANT_ORDERS)[number];
export interface Assignment { arm: StudyArm; order: VariantOrder }

/** "confirmatory" is deliberately absent until a frozen policy is wired in. Phases are never pooled. */
export const PHASES = ["test", "pilot"] as const;
export type Phase = (typeof PHASES)[number];

/** From the STUDY_PHASE env var. A typo must not silently file real data under "test". */
export const parsePhase = (value: string | undefined): Phase | null =>
  !value ? "test" : PHASES.find((p) => p === value) ?? null;

/** Block 1 is always static. Pilot: two random blocks follow; otherwise one adapted block. */
export const blockCount = (phase: Phase): 2 | 3 => (phase === "pilot" ? 3 : 2);
export type Block = 1 | 2 | 3;

// shortcut: committed seed, so the schedule is auditable but predictable; use a secret seed if concealment matters.
const SEED = "attune-study-v1";

/** `seq` is the participant's 0-based position within phase + stratum. */
export function assign(phase: Phase, pointer: PointerKind, seq: number): Assignment {
  const block = Math.floor(seq / STUDY_ARMS.length);
  const rng = makeRng(hashString(`${SEED}:${phase}:${pointer}:${block}`));
  const arms: StudyArm[] = [...STUDY_ARMS];
  for (let i = arms.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [arms[i], arms[j]] = [arms[j], arms[i]];
  }
  // Consecutive blocks take opposite orders, so every 6 slots cross each arm with both orders.
  const flip = makeRng(hashString(`${SEED}:${phase}:${pointer}:order:${block >> 1}`)).next() < 0.5 ? 1 : 0;
  const arm = phase === "pilot" ? "P" : arms[seq % STUDY_ARMS.length];
  return { arm, order: VARIANT_ORDERS[(block ^ flip) & 1] };
}

/** Used only when the server is unreachable; these participants are flagged and analysed apart. */
export function offlineAssignment(participantId: string, phase: Phase): Assignment {
  const rng = makeRng(hashString(`${SEED}:offline:${participantId}`));
  return {
    arm: phase === "pilot" ? "P" : STUDY_ARMS[Math.floor(rng.next() * STUDY_ARMS.length)],
    order: VARIANT_ORDERS[Math.floor(rng.next() * VARIANT_ORDERS.length)],
  };
}

// shortcut: only two matched task sets, so the pilot's third block repeats the first block's set.
export const variantFor = (order: VariantOrder, block: Block) => order[(block - 1) % 2] as Variant;
