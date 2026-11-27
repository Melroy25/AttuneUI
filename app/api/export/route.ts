import { database } from "@/lib/server/db";
import { exportRow } from "@/lib/server/events";
import { fail, sameSecret } from "@/lib/server/http";

const TABLES = ["participants", "events"] as const;

export async function GET(request: Request) {
  const token = process.env.EXPORT_TOKEN;
  const db = database();
  if (!token || !db) return fail(503, "export not configured");
  const given = request.headers.get("authorization") ?? "";
  if (!sameSecret(given, `Bearer ${token}`)) return fail(401, "unauthorised");

  // Streamed, so a full study does not hit the serverless response size limit.
  const encoder = new TextEncoder();
  async function* json() {
    yield `{"exportedAt":${JSON.stringify(new Date().toISOString())}`;
    for (const table of TABLES) {
      yield `,"${table}":[`;
      let separator = "";
      let next: string | undefined;
      do {
        const page = await db!.page(table, next);
        for (const doc of page.docs) {
          yield separator + JSON.stringify(exportRow(table, doc));
          separator = ",";
        }
        next = page.next;
      } while (next);
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
