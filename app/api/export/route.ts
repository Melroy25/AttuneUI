import { fail, sameSecret } from "@/lib/server/http";
import { rows, supabaseRest } from "@/lib/server/supabase";

const PAGE = 200;
const TABLES = [["participants", "id"], ["events", "participant_id,seq"]] as const;

export async function GET(request: Request) {
  const token = process.env.EXPORT_TOKEN;
  const rest = supabaseRest();
  if (!token || !rest) return fail(503, "export not configured");
  const given = request.headers.get("authorization") ?? "";
  if (!sameSecret(given, `Bearer ${token}`)) return fail(401, "unauthorised");

  // Streamed, so a full study does not hit the serverless response size limit.
  const encoder = new TextEncoder();
  async function* json() {
    yield `{"exportedAt":${JSON.stringify(new Date().toISOString())}`;
    for (const [table, order] of TABLES) {
      yield `,"${table}":[`;
      let separator = "";
      for (let offset = 0; ; offset += PAGE) {
        const page = await rows<unknown>(rest!, `${table}?select=*&order=${order}&limit=${PAGE}&offset=${offset}`);
        for (const row of page) {
          yield separator + JSON.stringify(row);
          separator = ",";
        }
        if (page.length < PAGE) break;
      }
      yield "]";
    }
    yield "}";
  }
  const chunks = json();
  const body = new ReadableStream<Uint8Array>({
    // A failed page errors the stream, so a partial export can never parse as complete.
    async pull(controller) {
      const { value, done } = await chunks.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(value));
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
