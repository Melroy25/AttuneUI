import { MAX_SNAPSHOT_BYTES, parseSnapshot } from "@/lib/demo/live";
import { database } from "@/lib/server/db";
import { cookieValue, fail, readJson } from "@/lib/server/http";
import { listLive, saveLive } from "@/lib/server/live";
import { USER_COOKIE, loginRequired, userFromToken } from "@/lib/server/users";

/** Posted by signed-in store users; validated and size-limited. Identity comes from the cookie. */
export async function POST(request: Request) {
  const user = userFromToken(cookieValue(request.headers.get("cookie"), USER_COOKIE));
  if (loginRequired() && !user) return fail(401, "sign in first");
  const read = await readJson(request, MAX_SNAPSHOT_BYTES);
  if (read instanceof Response) return read;
  const snapshot = parseSnapshot(read.body);
  if (!snapshot) return fail(400, "invalid request");
  try {
    const known = { user: user?.name ?? null, email: user?.email ?? null, emailHash: user?.emailHash ?? null };
    return Response.json({ storage: await saveLive(database(), { ...snapshot, ...known }) });
  } catch (error) {
    console.error("live:", error);
    return fail(502, "storage unavailable");
  }
}

/** The admin page has no sign-in (the owner's choice), so this is public. */
export async function GET(request: Request) {
  const since = new URL(request.url).searchParams.get("since") ?? undefined;
  try {
    return Response.json(await listLive(database(), since?.slice(0, 30)), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("live:", error);
    return fail(502, "storage unavailable: check the Firestore database and FIREBASE_SERVICE_ACCOUNT");
  }
}
