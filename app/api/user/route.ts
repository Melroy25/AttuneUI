import { verifyIdToken, webConfig } from "@/lib/server/firebase";
import { fail, readJson } from "@/lib/server/http";
import { USER_COOKIE, USER_TTL_S, canSignIn, storeUser, userToken } from "@/lib/server/users";

const withCookie = (request: Request, value: string, maxAge: number) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return Response.json({ ok: true }, {
    headers: { "Set-Cookie": `${USER_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}` },
  });
};

/** Exchanges a Firebase ID token for the store's own session cookie. */
export async function POST(request: Request) {
  const config = webConfig();
  if (!config || !canSignIn()) {
    return fail(503, "sign-in is not fully set up: add FIREBASE_SERVICE_ACCOUNT on the server");
  }
  const read = await readJson(request, 6000);
  if (read instanceof Response) return read;
  const idToken = (read.body as { idToken?: unknown } | null)?.idToken;
  if (typeof idToken !== "string" || idToken.length < 20) return fail(400, "invalid request");
  try {
    const account = await verifyIdToken(idToken, config);
    if (!account) return fail(401, "sign-in was not accepted");
    return withCookie(request, userToken(storeUser(account)), USER_TTL_S);
  } catch (error) {
    console.error("user:", error);
    return fail(502, "cannot check the sign-in right now");
  }
}

export function DELETE(request: Request) {
  return withCookie(request, "", 0);
}
