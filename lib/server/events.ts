// Study rows in the database. Payloads are stored as JSON text.
import type { EventRow } from "../study/records";
import type { Db, Found } from "./db";

/** Retries are harmless: a row that already exists is left as it was. */
export async function storeEvents(db: Db, participantId: string, events: EventRow[], now = new Date()) {
  if (!(await db.get("participants", participantId))) return "unknown participant" as const;
  await Promise.all(events.map((e) => db.create([{
    collection: "events",
    id: `${participantId}_${String(e.seq).padStart(5, "0")}`, // ids sort by participant, then sequence
    data: {
      participant_id: participantId, seq: e.seq, block: e.block, kind: e.kind,
      payload: JSON.stringify(e.payload), created_at: now.toISOString(),
    },
  }])));
  return "stored" as const;
}

/** The shape /api/export has always had: participants as stored, events with parsed payloads. */
export const exportRow = (collection: "participants" | "events", doc: Found) =>
  collection === "events" ? { ...doc.data, payload: JSON.parse(doc.data.payload as string) as unknown } : doc.data;
