import { parseActivity } from "@/lib/demo/activity";
import { GUEST_ID, SENT_ACTIVITY, USER_ID, parseState } from "@/lib/demo/cloud";
import { database } from "@/lib/server/db";
import { getUser, listUsers, saveUser } from "@/lib/server/demoUsers";
import { cookieValue, fail, readJson } from "@/lib/server/http";
import { USER_COOKIE, loginRequired, userFromToken } from "@/lib/server/users";

const MAX_BYTES = 60_000;
const MAX_LOG = 200;
const unavailable = (error: unknown) => {
  console.error("demo-user:", error);
  return fail(502, "storage unavailable");
};

/** Public, like the admin page that reads it (the owner's choice). */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const id = query.get("id");
  if (id !== null && !USER_ID.test(id)) return fail(400, "invalid request");
  const wanted = Math.floor(Number(query.get("activity") ?? MAX_LOG)) || 0;
  try {
    const body = id === null
      ? await listUsers(database())
      : await getUser(database(), id, Math.min(Math.max(wanted, 0), MAX_LOG));
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return unavailable(error);
  }
}

/** A signed-in user writes only their own document: the name comes from the cookie. */
export async function POST(request: Request) {
  const user = userFromToken(cookieValue(request.headers.get("cookie"), USER_COOKIE));
  if (loginRequired() && !user) return fail(401, "sign in first");
  const read = await readJson(request, MAX_BYTES);
  if (read instanceof Response) return read;
  const body = read.body as { guest?: unknown; activity?: unknown } | null;
  const guest = typeof body?.guest === "string" && GUEST_ID.test(body.guest) ? body.guest : null;
  const id = user?.name ?? guest;
  const state = parseState(body);
  const activity = parseActivity(body?.activity ?? [], SENT_ACTIVITY);
  if (!id || !USER_ID.test(id) || !state || !activity) return fail(400, "invalid request");
  try {
    return Response.json(await saveUser(database(), id, state, activity));
  } catch (error) {
    return unavailable(error);
  }
}
