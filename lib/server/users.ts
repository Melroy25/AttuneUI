// Server only: the store session cookie, issued after Firebase has confirmed who signed in.
import { createHash, createHmac } from "node:crypto";
import { webConfig, type Account } from "./firebase";
import { sameSecret } from "./http";

export const USER_COOKIE = "attune_user";
export const USER_TTL_S = 30 * 24 * 60 * 60; // sign in once
/** Username accounts use this reserved domain as their Firebase email; no mail is ever sent. */
export const NAME_DOMAIN = "users.example.com";

export interface StoreUser { name: string; email: string | null; emailHash: string | null }
type Env = Record<string, string | undefined>;

const secret = (env: Env) => env.SESSION_SECRET || env.FIREBASE_SERVICE_ACCOUNT || env.ADMIN_PASSWORD || "";
/** Sign-in is on whenever Firebase is configured; without Firebase the store is open (local tries). */
export const loginRequired = (env: Env = process.env) => webConfig(env) !== null;
/** Cookies cannot be signed without a server secret, so sign-in then fails rather than opens. */
export const canSignIn = (env: Env = process.env) => loginRequired(env) && secret(env) !== "";

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9_]+/g, "");

/** The admin sees a name and a masked address. The full email is never stored, only its hash. */
export function storeUser({ uid, email, name }: Account): StoreUser {
  const address = email.trim().toLowerCase();
  const [local, domain] = address.split("@");
  if (domain === NAME_DOMAIN) return { name: slug(local).slice(0, 20), email: null, emailHash: null };
  const first = slug(name.split(" ")[0] ?? "").slice(0, 15) || "user";
  return {
    name: `${first}_${slug(uid).slice(0, 4)}`,
    email: domain ? `${local.slice(0, 1)}***@${domain}` : null,
    emailHash: domain ? createHash("sha256").update(address).digest("hex") : null,
  };
}

const sign = (payload: string, env: Env) => createHmac("sha256", secret(env)).update(`attune-user:${payload}`).digest("hex");

export function userToken(user: StoreUser, now = Date.now(), env: Env = process.env) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: now + USER_TTL_S * 1000 })).toString("base64url");
  return `${payload}.${sign(payload, env)}`;
}

export function userFromToken(token: string | undefined, now = Date.now(), env: Env = process.env): StoreUser | null {
  if (!token || !canSignIn(env)) return null;
  const [payload, signature] = token.split(".");
  if (!sameSecret(signature ?? "", sign(payload, env))) return null;
  const { name, email, emailHash, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as StoreUser & { exp: number };
  return exp > now && name ? { name, email, emailHash } : null;
}
