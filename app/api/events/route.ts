import { fail, readJson } from "@/lib/server/http";
import { supabaseRest } from "@/lib/server/supabase";
import { MAX_EVENTS_BYTES, parseEventBatch } from "@/lib/study/validate";

export async function POST(request: Request) {
  const read = await readJson(request, MAX_EVENTS_BYTES);
  if (read instanceof Response) return read;
  const batch = parseEventBatch(read.body);
  if (!batch) return fail(400, "invalid request");
  const rest = supabaseRest();
  if (!rest) return fail(503, "storage not configured");
  try {
    const response = await rest("events?on_conflict=participant_id,seq", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(batch.events.map((e) => ({ participant_id: batch.participantId, ...e }))),
    });
    if (response.ok) return Response.json({ stored: batch.events.length });
    console.error("events:", response.status, await response.text());
    // 409 here means the participant row does not exist; retrying cannot fix it.
    return response.status === 409 ? fail(409, "unknown participant") : fail(502, "storage unavailable");
  } catch (error) {
    console.error("events:", error);
    return fail(502, "storage unavailable");
  }
}
