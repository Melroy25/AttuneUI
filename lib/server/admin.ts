// Server only: one admin account from the environment, kept in a signed, expiring cookie.
import { createHmac } from "node:crypto";
import { sameSecret } from "./http";

export const ADMIN_COOKIE = "attune_admin";
export const ADMIN_TTL_S = 8 * 60 * 60;
type Env = Record<string, string | undefined>;

export const adminConfigured = (env: Env = process.env) => Boolean(env.ADMIN_USER && env.ADMIN_PASSWORD);

export function checkLogin(user: string, password: string, env: Env = process.env): boolean {
  if (!adminConfigured(env)) return false;
  // Both are always compared, so timing does not show which one was wrong.
  const userOk = sameSecret(user, env.ADMIN_USER!);
  const passwordOk = sameSecret(password, env.ADMIN_PASSWORD!);
  return userOk && passwordOk;
}

/** Changing the user name or password signs everyone out. */
const sign = (expires: number, env: Env) =>
  createHmac("sha256", `${env.ADMIN_USER}\n${env.ADMIN_PASSWORD}`).update(`attune-admin:${expires}`).digest("hex");

export const issueToken = (now = Date.now(), env: Env = process.env) => {
  const expires = now + ADMIN_TTL_S * 1000;
  return `${expires}.${sign(expires, env)}`;
};

export function validToken(token: string | undefined, now = Date.now(), env: Env = process.env): boolean {
  if (!token || !adminConfigured(env)) return false;
  const [expires, signature] = token.split(".");
  const at = Number(expires);
  return Number.isInteger(at) && at > now && sameSecret(signature ?? "", sign(at, env));
}

export const cookieValue = (header: string | null, name: string): string | undefined =>
  header?.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);
