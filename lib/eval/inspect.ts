// Descriptive views of one export: participant timelines and per-surface tallies.
import type { EventLog } from "../attune-ui/bandit/replay";
import { TASK_CAP_MS } from "../attune-ui/bandit/reward";
import { frictionCount } from "../attune-ui/telemetry/friction";
import { ARM_IDS, type ArmId, type FrictionSummary } from "../attune-ui/types";
import type { Participant } from "./dataset";

type Row = EventLog["events"][number];
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const str = (v: unknown) => (typeof v === "string" ? v : null);
const arm = (v: unknown) => ARM_IDS.find((a) => a === v) ?? null;
const average = (v: number[]) => (v.length > 0 ? v.reduce((s, x) => s + x, 0) / v.length : null);

export interface TaskView {
  index: number;
  taskId: string | null;
  success: boolean | null;
  timeMs: number | null;
  friction: FrictionSummary | null;
  frictionTotal: number | null;
  ease: number | null; // SEQ 1-7
  surface: ArmId | null;
}
export interface DecisionView {
  action: ArmId | null;
  propensity: number | null;
  probs: Partial<Record<ArmId, number>>;
  context: number[];
  modality: string | null;
  policyHash: string | null;
  provenance: string | null;
}
export interface BlockView {
  block: number;
  tasks: TaskView[];
  decision: DecisionView | null;
  chips: string[];
  /** All three present: total with failures counted as the 90 s cap, as in the analysis. */
  totalMs: number | null;
  frictionTotal: number | null;
  meanEase: number | null;
}

/** Retried uploads repeat rows; returns the last copy of each, in sequence order. */
export function uniqueEvents(events: Row[]): Row[] {
  const rows = new Map<string, Row>();
  for (const e of events) rows.set(`${e.participant_id}:${e.seq}`, e);
  return [...rows.values()].sort((a, b) => a.seq - b.seq);
}

function friction(v: unknown): FrictionSummary | null {
  if (!isRecord(v)) return null;
  const keys = ["rage", "dead", "miss", "dwell", "thrash", "backtrack"] as const;
  if (!keys.every((k) => num(v[k]) !== null)) return null;
  return { ...Object.fromEntries(keys.map((k) => [k, v[k]])), tortuosity: num(v.tortuosity) ?? 1 } as FrictionSummary;
}

function decisionView(p: Record<string, unknown>): DecisionView {
  const probs = isRecord(p.probs) ? p.probs : {};
  return {
    action: arm(p.action),
    propensity: num(p.propensity),
    probs: Object.fromEntries(ARM_IDS.flatMap((a) => (num(probs[a]) === null ? [] : [[a, probs[a]]]))),
    context: Array.isArray(p.context) ? p.context.filter((x): x is number => num(x) !== null) : [],
    modality: str(p.modality),
    policyHash: str(p.policyHash),
    provenance: str(p.provenance),
  };
}

function blockView(block: number, rows: Row[]): BlockView {
  const tasks = new Map<number, TaskView>();
  const ease = new Map<number, number>();
  let decision: DecisionView | null = null;
  const chips: string[] = [];
  for (const { kind, payload } of rows) {
    if (!isRecord(payload)) continue;
    const index = num(payload.taskIndex);
    if (kind === "decision") decision ??= decisionView(payload);
    if (kind === "chip" && str(payload.action)) chips.push(`${payload.action} before task ${(num(payload.beforeTask) ?? 0) + 1}`);
    if (kind === "rating" && index !== null && num(payload.seq) !== null) ease.set(index, payload.seq as number);
    if (kind === "task" && index !== null) {
      const f = friction(payload.friction);
      tasks.set(index, {
        index, taskId: str(payload.taskId),
        success: typeof payload.success === "boolean" ? payload.success : null,
        timeMs: num(payload.timeMs), friction: f, frictionTotal: f && frictionCount(f),
        ease: null, surface: arm(payload.surface),
      });
    }
  }
  const list = [...tasks.values()].sort((a, b) => a.index - b.index).map((t) => ({ ...t, ease: ease.get(t.index) ?? null }));
  const complete = list.length === 3 && list.every((t) => t.success !== null && t.timeMs !== null);
  const known = list.flatMap((t) => (t.frictionTotal === null ? [] : [t.frictionTotal]));
  return {
    block, tasks: list, decision, chips,
    totalMs: complete ? list.reduce((s, t) => s + (t.success ? Math.min(t.timeMs!, TASK_CAP_MS) : TASK_CAP_MS), 0) : null,
    frictionTotal: complete && known.length === 3 ? known.reduce((s, x) => s + x, 0) : null,
    meanEase: average(list.flatMap((t) => (t.ease === null ? [] : [t.ease]))),
  };
}

export interface Delta { block: number; timeMs: number | null; friction: number | null; ease: number | null }
const minus = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);

/** Blocks in order, with each later block compared to Block 1. */
export function buildTimeline(events: Row[], participantId: string): { blocks: BlockView[]; deltas: Delta[] } {
  const own = uniqueEvents(events.filter((e) => e.participant_id === participantId));
  const numbers = [...new Set(own.filter((e) => e.kind !== "done").map((e) => e.block))].sort((a, b) => a - b);
  const blocks = numbers.map((n) => blockView(n, own.filter((e) => e.block === n)));
  const first = blocks.find((b) => b.block === 1);
  const deltas = !first ? [] : blocks.filter((b) => b.block > 1).map((b) => ({
    block: b.block,
    timeMs: minus(b.totalMs, first.totalMs),
    friction: minus(b.frictionTotal, first.frictionTotal),
    ease: minus(b.meanEase, first.meanEase),
  }));
  return { blocks, deltas };
}

export function filterParticipants(
  people: Participant[], filter: { query: string; arm: string; pointer: string },
): Participant[] {
  const query = filter.query.trim().toLowerCase();
  return people.filter((p) =>
    (!query || p.id.toLowerCase().includes(query)) &&
    (filter.arm === "All" || p.arm === filter.arm) &&
    (filter.pointer === "All" || p.pointer === filter.pointer));
}

/** All participants of one phase, before exclusions. Descriptive: surfaces are not randomly comparable. */
export function surfaceBreakdown(log: { participants: Participant[]; events: Row[] }, phase: string) {
  const ids = log.participants.filter((p) => p.phase === phase).map((p) => p.id);
  const wanted = new Set(ids);
  const byPerson = new Map<string, Row[]>();
  for (const e of uniqueEvents(log.events.filter((x) => wanted.has(x.participant_id)))) {
    const list = byPerson.get(e.participant_id);
    if (list) list.push(e);
    else byPerson.set(e.participant_id, [e]);
  }
  const tally = Object.fromEntries(ARM_IDS.map((a) => [a, { selected: 0, times: [] as number[], ok: 0, ease: [] as number[] }])) as
    Record<ArmId, { selected: number; times: number[]; ok: number; ease: number[] }>;
  for (const id of ids) {
    for (const b of buildTimeline(byPerson.get(id) ?? [], id).blocks) {
      if (!b.decision?.action) continue; // the static first block was not selected
      tally[b.decision.action].selected++;
      for (const t of b.tasks) {
        // The surface actually shown (Undo returns to baseline), else the one decided.
        const row = tally[t.surface ?? b.decision.action];
        if (t.timeMs !== null && t.success !== null) {
          row.times.push(t.success ? Math.min(t.timeMs, TASK_CAP_MS) : TASK_CAP_MS);
          row.ok += Number(t.success);
        }
        if (t.ease !== null) row.ease.push(t.ease);
      }
    }
  }
  return ARM_IDS.map((surface) => {
    const r = tally[surface];
    return {
      surface, selected: r.selected, tasks: r.times.length, meanTimeMs: average(r.times),
      successRate: r.times.length > 0 ? r.ok / r.times.length : null, meanEase: average(r.ease),
    };
  });
}
