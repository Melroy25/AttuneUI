// Server only: demo-store accounts, so the admin can tell visitors apart. Not study data.
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { sameSecret } from "./http";
import { rows, type Rest } from "./supabase";

export const USER_COOKIE = "attune_user";
export const USER_TTL_S = 7 * 24 * 60 * 60;
export const USERNAME = /^[a-z0-9_]{3,20}$/;
export const validPassword = (p: string) => p.length >= 6 && p.length <= 72;

type Env = Record<string, string | undefined>;
interface Stored { salt: string; hash: string }

// shortcut: without a database, accounts last as long as this process (fine for local tries).
const memory = new Map<string, Stored>();

/** Sign-in is on when there is a server secret to sign cookies with; otherwise the store is open. */
const secret = (env: Env) => env.SESSION_SECRET || env.ADMIN_PASSWORD || "";
export const loginRequired = (env: Env = process.env) => secret(env) !== "";

const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 32, (error, key) => (error ? reject(error) : resolve(key))));

async function find(rest: Rest | null, username: string): Promise<Stored | undefined> {
  if (!rest) return memory.get(username);
  const [row] = await rows<Stored>(rest, `demo_users?username=eq.${username}&select=salt,hash`);
  return row;
}

/** "taken" if the name exists. Throws if the database cannot be used. Callers validate input first. */
export async function register(rest: Rest | null, username: string, password: string): Promise<"ok" | "taken"> {
  if (await find(rest, username)) return "taken";
  const salt = randomBytes(16).toString("hex");
  const hash = (await derive(password, salt)).toString("hex");
  if (!rest) {
    memory.set(username, { salt, hash });
    return "ok";
  }
  const response = await rest("demo_users", {
    method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ username, salt, hash }),
  });
  if (response.status === 409) return "taken";
  if (!response.ok) throw new Error(`database insert failed (${response.status})`);
  return "ok";
}

export async function verify(rest: Rest | null, username: string, password: string): Promise<boolean> {
  const stored = await find(rest, username);
  // Hash even for unknown names, so timing does not reveal which names exist.
  const key = await derive(password, stored?.salt ?? "unknown-user");
  const expected = Buffer.from(stored?.hash ?? "", "hex");
  return expected.length === key.length && timingSafeEqual(key, expected);
}

const sign = (value: string, env: Env) =>
  createHmac("sha256", secret(env)).update(`attune-user:${value}`).digest("hex");

export const userToken = (username: string, now = Date.now(), env: Env = process.env) => {
  const value = `${username}.${now + USER_TTL_S * 1000}`;
  return `${value}.${sign(value, env)}`;
};

/** The signed-in username, or null. */
export function userFromToken(token: string | undefined, now = Date.now(), env: Env = process.env): string | null {
  if (!token || !loginRequired(env)) return null;
  const [username, expires, signature] = token.split(".");
  if (!USERNAME.test(username ?? "") || !(Number(expires) > now)) return null;
  return sameSecret(signature ?? "", sign(`${username}.${expires}`, env)) ? username : null;
}
