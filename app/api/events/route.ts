import { database } from "@/lib/server/db";
import { storeEvents } from "@/lib/server/events";
import { fail, readJson } from "@/lib/server/http";
import { MAX_EVENTS_BYTES, parseEventBatch } from "@/lib/study/validate";

export async function POST(request: Request) {
  const read = await readJson(request, MAX_EVENTS_BYTES);
  if (read instanceof Response) return read;
  const batch = parseEventBatch(read.body);
  if (!batch) return fail(400, "invalid request");
  const db = database();
  if (!db) return fail(503, "storage not configured");
  try {
    // 409 means the participant row does not exist; retrying cannot fix it.
    if ((await storeEvents(db, batch.participantId, batch.events)) !== "stored") return fail(409, "unknown participant");
    return Response.json({ stored: batch.events.length });
  } catch (error) {
    console.error("events:", error);
    return fail(502, "storage unavailable");
  }
}
