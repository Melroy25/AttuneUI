// Shapes of what the study uploads. The event log is the source of truth.
import type { InteractionEvent, PointerKind } from "../attune-ui/types";
import type { Block, StudyArm, VariantOrder } from "./assignment";

export const EVENT_KINDS = ["task", "interactions", "rating", "decision", "chip", "done"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export interface EventRow {
  seq: number; // unique per participant; makes retries idempotent
  block: Block;
  kind: EventKind;
  payload: Record<string, unknown>;
}

export interface ParticipantRecord {
  id: string;
  phase: string;
  pointer: PointerKind;
  viewport_width: number;
  arm: StudyArm;
  variant_order: VariantOrder;
  offline: boolean;
  repeat_device: boolean;
}

export const CHUNK = 400; // raw events per row, so one request stays well under the API limit

/** Round before summarising, so replaying the log reproduces the on-device friction exactly. */
export const roundEvents = (events: InteractionEvent[]): InteractionEvent[] =>
  events.map((e) =>
    Object.fromEntries(
      Object.entries(e).map(([k, v]) => [k, typeof v === "number" ? Math.round(v) : v]),
    ) as InteractionEvent,
  );

export const chunk = <T>(items: T[], size = CHUNK): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

/** getRandomValues also works over plain-http LAN testing, where randomUUID does not exist. */
export function newParticipantId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
