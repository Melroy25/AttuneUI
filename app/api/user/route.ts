import { fail, readJson } from "@/lib/server/http";
import { supabaseRest } from "@/lib/server/supabase";
import {
  USERNAME, USER_COOKIE, USER_TTL_S, loginRequired, register, userToken, validPassword, verify,
} from "@/lib/server/users";

const WRONG_DELAY_MS = 600;

const withCookie = (request: Request, value: string, maxAge: number) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return Response.json({ ok: true }, {
    headers: { "Set-Cookie": `${USER_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}` },
  });
};

/** Sign in, or create a demo account ({ create: true }). */
export async function POST(request: Request) {
  if (!loginRequired()) return fail(503, "sign-in not configured");
  const read = await readJson(request, 600);
  if (read instanceof Response) return read;
  const { user, password, create } = (read.body ?? {}) as { user?: unknown; password?: unknown; create?: unknown };
  const name = typeof user === "string" ? user.trim().toLowerCase() : "";
  if (!USERNAME.test(name) || typeof password !== "string" || !validPassword(password)) {
    return fail(400, "use 3-20 letters, numbers or _ for the name, and 6-72 characters for the password");
  }
  try {
    const rest = supabaseRest();
    if (create === true) {
      if ((await register(rest, name, password)) === "taken") return fail(409, "that name is taken");
    } else if (!(await verify(rest, name, password))) {
      await new Promise((resolve) => setTimeout(resolve, WRONG_DELAY_MS));
      return fail(401, "wrong username or password");
    }
  } catch (error) {
    console.error("user:", error);
    return fail(502, "accounts are unavailable: run supabase/schema.sql");
  }
  return withCookie(request, userToken(name), USER_TTL_S);
}

export function DELETE(request: Request) {
  return withCookie(request, "", 0);
}
