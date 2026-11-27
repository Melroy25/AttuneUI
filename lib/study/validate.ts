// Trust boundary: every API body is untrusted.
import type { PointerKind } from "../attune-ui/types";
import { STUDY_ARMS, VARIANT_ORDERS, type Assignment } from "./assignment";
import { EVENT_KINDS, type EventRow } from "./records";

export const MAX_REGISTRATION_BYTES = 1_000;
export const MAX_EVENTS_BYTES = 200_000;
export const MAX_ROWS = 20;
const MAX_PAYLOAD_CHARS = 100_000;

export interface Registration {
  id: string;
  pointer: PointerKind;
  viewportWidth: number;
  repeatDevice: boolean;
  /** Present only when the client already ran with a local assignment. */
  offline: Assignment | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
const oneOf = <T extends string>(v: unknown, list: readonly T[]): v is T => list.includes(v as T);

export function parseRegistration(input: unknown): Registration | null {
  if (!isRecord(input)) return null;
  const { id, pointer, viewportWidth, repeatDevice, offline } = input;
  if (
    !isId(id) || !oneOf(pointer, ["mouse", "touch", "pen"] as const) ||
    !isInt(viewportWidth, 10_000) || typeof repeatDevice !== "boolean"
  ) return null;
  let local: Assignment | null = null;
  if (offline !== undefined && offline !== null) {
    if (!isRecord(offline) || !oneOf(offline.arm, STUDY_ARMS) || !oneOf(offline.order, VARIANT_ORDERS)) return null;
    local = { arm: offline.arm, order: offline.order };
  }
  return { id, pointer, viewportWidth, repeatDevice, offline: local };
}

export function parseEventBatch(input: unknown): { participantId: string; events: EventRow[] } | null {
  if (!isRecord(input) || !isId(input.participantId) || !Array.isArray(input.events)) return null;
  if (input.events.length === 0 || input.events.length > MAX_ROWS) return null;
  const events: EventRow[] = [];
  for (const e of input.events as unknown[]) {
    if (
      !isRecord(e) || !isInt(e.seq, 10_000) || !(e.block === 1 || e.block === 2) ||
      !oneOf(e.kind, EVENT_KINDS) || !isRecord(e.payload) ||
      JSON.stringify(e.payload).length > MAX_PAYLOAD_CHARS
    ) return null;
    events.push({ seq: e.seq, block: e.block, kind: e.kind, payload: e.payload });
  }
  return { participantId: input.participantId, events };
}
