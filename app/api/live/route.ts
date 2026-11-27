import { MAX_SNAPSHOT_BYTES, parseSnapshot } from "@/lib/demo/live";
import { ADMIN_COOKIE, cookieValue, validToken } from "@/lib/server/admin";
import { fail, readJson } from "@/lib/server/http";
import { listLive, saveLive } from "@/lib/server/live";
import { supabaseRest } from "@/lib/server/supabase";

/** Posted by /demo visitors. Open to anyone, so it is validated and size-limited. */
export async function POST(request: Request) {
  const read = await readJson(request, MAX_SNAPSHOT_BYTES);
  if (read instanceof Response) return read;
  const snapshot = parseSnapshot(read.body);
  if (!snapshot) return fail(400, "invalid request");
  return Response.json({ storage: await saveLive(supabaseRest(), snapshot) });
}

/** Read by the signed-in admin only. */
export async function GET(request: Request) {
  if (!validToken(cookieValue(request.headers.get("cookie"), ADMIN_COOKIE))) return fail(401, "unauthorised");
  return Response.json(await listLive(supabaseRest()), { headers: { "Cache-Control": "no-store" } });
}
