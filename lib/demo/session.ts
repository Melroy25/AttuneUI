// In-memory demo brain. Never writes study data.
import {
  decide, decidePlacebo, update, type Decision, type Models, type Probs,
} from "../attune-ui/bandit/policy";
import { blockReward, type TaskOutcome } from "../attune-ui/bandit/reward";
import { buildContext, modalityOf } from "../attune-ui/telemetry/context";
import { frictionCount, summarizeFriction } from "../attune-ui/telemetry/friction";
import type { ArmId, FrictionSummary, InteractionEvent, Modality, PointerKind } from "../attune-ui/types";
import { runLearning } from "../eval/simulator";

export type DemoMode = "static" | "placebo" | "attune";

export interface DemoSession {
  models: Models | null; // null until first needed (prior is computed lazily)
  rendered: ArmId;
  previous: ArmId | null; // for Undo
  pinned: boolean;
  /** The decision whose surface the current block is exercising. */
  active: { context: number[]; modality: Modality } | null;
  decision: Decision | null;
  /** Policy mode and friction behind the last boundary, for the X-Ray explanation. */
  mode: DemoMode | null;
  friction: FrictionSummary | null;
  preview: boolean; // the layout was picked by hand, not by the policy
  overrides: { undo: number; pin: number }; // shown only; never part of context or reward
  /** Admin view only: friction of finished blocks, and the latest layout decisions. */
  totals: FrictionSummary;
  history: { block: number; arm: ArmId }[];
  blocks: number;
  liveUpdates: number;
  simulatedUpdates: number;
  decisionMs: number[]; // measured on this device
  log: string[];
}

const NONE: FrictionSummary = { rage: 0, dead: 0, miss: 0, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1 };
export const HISTORY = 10;

export const newSession = (rendered: ArmId = "baseline"): DemoSession => ({
  totals: NONE, history: [],
  models: null, rendered, previous: null, pinned: false, active: null, decision: null,
  mode: null, friction: null, preview: false, overrides: { undo: 0, pin: 0 }, blocks: 0, liveUpdates: 0, simulatedUpdates: 0, decisionMs: [], log: [],
});

export interface BlockInput {
  mode: DemoMode;
  events: InteractionEvent[];
  outcomes: Omit<TaskOutcome, "friction">[];
  pointer: PointerKind;
  viewportWidth: number;
  seed: number;
  prior: { models: Models; marginals: Probs };
  now: () => number;
}

const addFriction = (a: FrictionSummary, b: FrictionSummary): FrictionSummary => ({
  rage: a.rage + b.rage, dead: a.dead + b.dead, miss: a.miss + b.miss, dwell: a.dwell + b.dwell,
  thrash: a.thrash + b.thrash, backtrack: a.backtrack + b.backtrack, tortuosity: Math.max(a.tortuosity, b.tortuosity),
});

/** Block boundary: learn from the block just finished, then decide the next surface. */
export function finishBlock(session: DemoSession, input: BlockInput): DemoSession {
  const modality = modalityOf(input.pointer);
  const friction = summarizeFriction(input.events, modality);
  const log: string[] = [];
  let models = session.models ?? input.prior.models;
  let liveUpdates = session.liveUpdates;

  if (session.active && input.outcomes.length > 0) {
    // Friction is spread over the attempted tasks; reward averages them.
    const each = frictionCount(friction) / input.outcomes.length;
    const reward = blockReward(
      input.outcomes.map((o) => ({ ...o, friction: each })),
      session.rendered !== "baseline",
    );
    const m = session.active.modality;
    models = { ...models, [m]: update(models[m], session.rendered, session.active.context, reward) };
    liveUpdates++;
    log.push(`Learned: ${session.rendered} scored ${reward.toFixed(2)} (${m} model)`);
  }

  const context = buildContext({
    friction, viewportWidth: input.viewportWidth, priorSessions: session.blocks,
  });
  const started = input.now();
  const decision =
    input.mode === "attune" ? decide(models[modality], context, input.seed)
    : input.mode === "placebo" ? decidePlacebo(input.prior.marginals, context, input.seed)
    : null;
  const elapsed = input.now() - started;

  const wanted = decision?.action ?? "baseline";
  const rendered = session.pinned ? session.rendered : wanted;
  const seen = `rage ${friction.rage}, dead ${friction.dead}, miss ${friction.miss}, dwell ${friction.dwell}`;
  log.push(
    !decision ? `Static mode: layout unchanged (${seen})`
    : session.pinned ? `Pinned: wanted ${wanted}, kept ${rendered} (${seen})`
    : `${seen} -> ${wanted} (p = ${decision.propensity.toFixed(2)}, ${input.mode})`,
  );
  return {
    ...session,
    models,
    rendered,
    previous: rendered === session.rendered ? session.previous : session.rendered,
    active: { context, modality },
    decision,
    mode: input.mode,
    friction,
    preview: false,
    totals: addFriction(session.totals, friction),
    history: [...session.history, { block: session.blocks + 1, arm: rendered }].slice(-HISTORY),
    blocks: session.blocks + 1,
    liveUpdates,
    decisionMs: decision ? [...session.decisionMs, elapsed].slice(-50) : session.decisionMs,
    log: [...log.reverse(), ...session.log].slice(0, 20),
  };
}

export function undo(session: DemoSession): DemoSession {
  if (!session.previous) return session;
  return {
    ...session,
    rendered: session.previous,
    previous: null,
    log: [`Undo: back to ${session.previous}`, ...session.log].slice(0, 20),
  };
}

/** Manual look at one layout: not a decision, so the block it starts teaches the model nothing. */
export const previewSurface = (session: DemoSession, arm: ArmId): DemoSession => ({
  ...session,
  rendered: arm,
  previous: arm === session.rendered ? session.previous : session.rendered,
  active: null,
  decision: null,
  preview: true,
  log: [`Manual preview: ${arm} (not chosen by the model)`, ...session.log].slice(0, 20),
});

export const togglePin = (session: DemoSession): DemoSession => ({
  ...session,
  pinned: !session.pinned,
  overrides: { ...session.overrides, pin: session.overrides.pin + (session.pinned ? 0 : 1) },
});

export function fastForward(
  session: DemoSession, sessions: number, prior: Models,
): DemoSession {
  const seed = 10_000 + session.simulatedUpdates;
  const { models } = runLearning({ sessions, seed, models: session.models ?? prior });
  return {
    ...session,
    models,
    simulatedUpdates: session.simulatedUpdates + sessions,
    log: [`SIMULATED: +${sessions} sessions learned`, ...session.log].slice(0, 20),
  };
}

export const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
