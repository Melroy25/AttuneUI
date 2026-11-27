import { MAX_SNAPSHOT_BYTES, parseSnapshot } from "@/lib/demo/live";
import { ADMIN_COOKIE, cookieValue, validToken } from "@/lib/server/admin";
import { fail, readJson } from "@/lib/server/http";
import { listLive, saveLive } from "@/lib/server/live";
import { supabaseRest } from "@/lib/server/supabase";
import { USER_COOKIE, loginRequired, userFromToken } from "@/lib/server/users";

/** Posted by signed-in /demo users; validated and size-limited. The name comes from the cookie. */
export async function POST(request: Request) {
  const user = userFromToken(cookieValue(request.headers.get("cookie"), USER_COOKIE));
  if (loginRequired() && !user) return fail(401, "sign in first");
  const read = await readJson(request, MAX_SNAPSHOT_BYTES);
  if (read instanceof Response) return read;
  const snapshot = parseSnapshot(read.body);
  if (!snapshot) return fail(400, "invalid request");
  return Response.json({ storage: await saveLive(supabaseRest(), { ...snapshot, user }) });
}

/** Read by the signed-in admin only. */
export async function GET(request: Request) {
  if (!validToken(cookieValue(request.headers.get("cookie"), ADMIN_COOKIE))) return fail(401, "unauthorised");
  return Response.json(await listLive(supabaseRest()), { headers: { "Cache-Control": "no-store" } });
}
