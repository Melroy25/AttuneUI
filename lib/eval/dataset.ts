// Trust boundary for /eval: any JSON may be uploaded, fetched or bundled.
import type { EventLog } from "../attune-ui/bandit/replay";

export const MAX_FILE_BYTES = 20_000_000;
const MAX_PARTICIPANTS = 10_000;
const MAX_EVENTS = 200_000;

export type Participant = EventLog["participants"][number] & {
  arm: string;
  viewport_width: number | null;
  variant_order: string | null;
};
export interface Dataset {
  log: { participants: Participant[]; events: EventLog["events"] };
  provenance: string | null;
  exportedAt: string | null;
  simulated: boolean;
  /** Most participants first; confirmatory wins a tie. Phases are never pooled. */
  phases: { phase: string; count: number }[];
  dropped: { participants: number; events: number };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 100): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const optionalText = (v: unknown, max = 200) => (text(v, max) ? v : null);

function participant(v: unknown): Participant | null {
  if (!isRecord(v) || !text(v.id) || !text(v.phase, 30) || !text(v.pointer, 10)) return null;
  if (typeof v.offline !== "boolean" || typeof v.repeat_device !== "boolean") return null;
  return {
    id: v.id, phase: v.phase, pointer: v.pointer, offline: v.offline, repeat_device: v.repeat_device,
    arm: optionalText(v.arm, 10) ?? "?",
    viewport_width: typeof v.viewport_width === "number" && Number.isFinite(v.viewport_width) ? v.viewport_width : null,
    variant_order: optionalText(v.variant_order, 10),
  };
}

function event(v: unknown): EventLog["events"][number] | null {
  if (!isRecord(v) || !text(v.participant_id) || !text(v.kind, 30)) return null;
  if (!Number.isInteger(v.seq) || !Number.isInteger(v.block) || !isRecord(v.payload)) return null;
  return {
    participant_id: v.participant_id, kind: v.kind, seq: v.seq as number, block: v.block as number,
    payload: v.payload,
  };
}

/** Throws an Error whose message can be shown to the user. */
export function parseDataset(input: unknown): Dataset {
  if (!isRecord(input) || !Array.isArray(input.participants) || !Array.isArray(input.events)) {
    throw new Error('Not a study export: expected "participants" and "events" lists.');
  }
  if (input.participants.length > MAX_PARTICIPANTS || input.events.length > MAX_EVENTS) {
    throw new Error("Export is too large for the browser. Use the Python verifier.");
  }
  // Retried or merged files repeat people; the last copy wins, as in the analysis.
  const people = new Map<string, Participant>();
  let badPeople = 0;
  for (const raw of input.participants) {
    const p = participant(raw);
    if (p) people.set(p.id, p);
    else badPeople++;
  }
  const events = input.events.map(event).filter((e) => e !== null);
  if (people.size === 0) throw new Error("The export contains no valid participants.");

  const provenance = optionalText(input.provenance);
  const marked = [...people.keys()].filter((id) => id.startsWith("sim-")).length;
  const declared = /simulated|synthetic/i.test(provenance ?? "");
  if (!declared && marked > 0 && marked < people.size) {
    throw new Error("This file mixes simulated and human participants. They are never pooled.");
  }
  const counts = new Map<string, number>();
  for (const p of people.values()) counts.set(p.phase, (counts.get(p.phase) ?? 0) + 1);
  return {
    log: { participants: [...people.values()], events },
    provenance,
    exportedAt: optionalText(input.exportedAt, 40),
    simulated: declared || marked > 0,
    phases: [...counts].map(([phase, count]) => ({ phase, count }))
      .sort((a, b) => Number(b.phase === "confirmatory") - Number(a.phase === "confirmatory") || b.count - a.count),
    dropped: { participants: badPeople, events: input.events.length - events.length },
  };
}

export function parseDatasetText(json: string): Dataset {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("The file is not valid JSON (a partial download cannot be analysed).");
  }
  return parseDataset(value);
}

/** The honest label shown on every view of the data. */
export function badgeFor(dataset: Pick<Dataset, "simulated">, phase: string): string {
  if (dataset.simulated) return "SYNTHETIC";
  return phase.toUpperCase();
}
