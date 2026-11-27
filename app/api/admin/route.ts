import { ADMIN_COOKIE, ADMIN_TTL_S, adminConfigured, checkLogin, issueToken } from "@/lib/server/admin";
import { fail, readJson } from "@/lib/server/http";

const WRONG_DELAY_MS = 800; // slows guessing; use a long password, there is no lockout

const withCookie = (request: Request, value: string, maxAge: number) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return Response.json({ ok: true }, {
    headers: { "Set-Cookie": `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}` },
  });
};

export async function POST(request: Request) {
  if (!adminConfigured()) return fail(503, "admin not configured");
  const read = await readJson(request, 600);
  if (read instanceof Response) return read;
  const body = read.body as { user?: unknown; password?: unknown } | null;
  const { user, password } = body ?? {};
  if (typeof user !== "string" || typeof password !== "string" || !checkLogin(user, password)) {
    await new Promise((resolve) => setTimeout(resolve, WRONG_DELAY_MS));
    return fail(401, "wrong username or password");
  }
  return withCookie(request, issueToken(), ADMIN_TTL_S);
}

export function DELETE(request: Request) {
  return withCookie(request, "", 0);
}
