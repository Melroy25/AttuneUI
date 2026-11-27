// Weights are recomputed from the event log. Same log in any order -> same weights.
import { DIM, modalityOf } from "../telemetry/context";
import { frictionCount } from "../telemetry/friction";
import { ARM_IDS, type ArmId, type FrictionSummary, type Modality } from "../types";
import { DEFAULT_CONFIG, update, type Models } from "./policy";
import { blockReward, type TaskOutcome } from "./reward";

/** One participant may move the weights at most this many times. */
export const SESSION_UPDATE_CAP = 2;
const TASKS_PER_BLOCK = 3;

/** The shape of GET /api/export and of the on-device JSON download. All of it is untrusted. */
export interface EventLog {
  participants: { id: string; phase: string; pointer: string; offline: boolean; repeat_device: boolean }[];
  events: { participant_id: string; seq: number; block: number; kind: string; payload: unknown }[];
}

export interface SessionUpdate {
  sessionId: string;
  block: number;
  modality: Modality;
  action: ArmId;
  context: number[];
  reward: number;
}

export interface Skipped {
  repeatDevice: number; // participants
  incompleteBlocks: number;
  invalid: number; // blocks whose decision or task rows fail validation
}

type Row = EventLog["events"][number];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const count = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;

function outcome(payload: unknown): TaskOutcome | null {
  if (!isRecord(payload) || !isRecord(payload.friction)) return null;
  const { success, timeMs } = payload;
  const f = payload.friction;
  const keys = ["rage", "dead", "miss", "dwell", "thrash", "backtrack"];
  if (typeof success !== "boolean" || !count(timeMs) || timeMs === 0 || !keys.every((k) => count(f[k]))) return null;
  return { success, timeMs: timeMs as number, friction: frictionCount(f as unknown as FrictionSummary) };
}

function decision(payload: unknown): { action: ArmId; context: number[] } | null {
  if (!isRecord(payload)) return null;
  const { action, context } = payload;
  if (!ARM_IDS.includes(action as ArmId) || !Array.isArray(context) || context.length !== DIM) return null;
  if (!context.every((v) => typeof v === "number" && v >= 0 && v <= 1)) return null;
  return { action: action as ArmId, context: context as number[] };
}

/**
 * One update per logged decision whose block has all its tasks. The reward goes to the decided
 * arm even if the participant pressed Undo (intention-to-treat). Phases are never mixed.
 */
export function updatesFromLog(log: EventLog, phase: string): { updates: SessionUpdate[]; skipped: Skipped } {
  const rows = new Map<string, Row>(); // retried uploads and merged files repeat rows
  for (const e of log.events) rows.set(`${e.participant_id}:${e.seq}`, e);
  const byBlock = new Map<string, Row[]>();
  for (const e of [...rows.values()].sort((a, b) => a.seq - b.seq)) {
    const key = `${e.participant_id}:${e.block}`;
    byBlock.set(key, [...(byBlock.get(key) ?? []), e]);
  }

  const people = new Map(log.participants.filter((p) => p.phase === phase).map((p) => [p.id, p]));
  const skipped: Skipped = { repeatDevice: 0, incompleteBlocks: 0, invalid: 0 };
  const updates: SessionUpdate[] = [];
  for (const id of [...people.keys()].sort()) {
    const person = people.get(id)!;
    if (person.repeat_device) {
      skipped.repeatDevice++;
      continue;
    }
    const blocks = [...byBlock.keys()].filter((k) => k.startsWith(`${id}:`))
      .map((k) => Number(k.slice(id.length + 1))).sort((a, b) => a - b);
    for (const block of blocks) {
      const events = byBlock.get(`${id}:${block}`)!;
      const decided = events.find((e) => e.kind === "decision");
      if (!decided) continue; // the static first block
      const tasks = new Map<unknown, unknown>();
      for (const e of events) {
        if (e.kind === "task" && isRecord(e.payload)) tasks.set(e.payload.taskIndex, e.payload);
      }
      if (tasks.size !== TASKS_PER_BLOCK) {
        skipped.incompleteBlocks++;
        continue;
      }
      const choice = decision(decided.payload);
      const outcomes = [...tasks.values()].map(outcome);
      if (!choice || !outcomes.every((o) => o !== null) || !["mouse", "touch", "pen"].includes(person.pointer)) {
        skipped.invalid++;
        continue;
      }
      updates.push({
        sessionId: id,
        block,
        modality: modalityOf(person.pointer as "mouse" | "touch" | "pen"),
        ...choice,
        reward: blockReward(outcomes, choice.action !== "baseline"),
      });
    }
  }
  return { updates, skipped };
}

/** Applies updates in the order given, stopping each session at the cap. */
export function replay(
  start: Models, updates: SessionUpdate[], cap = SESSION_UPDATE_CAP, config = DEFAULT_CONFIG,
) {
  const used = new Map<string, number>();
  const applied: SessionUpdate[] = [];
  let models = start;
  for (const u of updates) {
    const n = used.get(u.sessionId) ?? 0;
    if (n >= cap) continue;
    used.set(u.sessionId, n + 1);
    models = { ...models, [u.modality]: update(models[u.modality], u.action, u.context, u.reward, config) };
    applied.push(u);
  }
  return { models, applied, capped: updates.length - applied.length };
}
