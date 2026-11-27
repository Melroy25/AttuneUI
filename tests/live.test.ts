import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../app/api/live/route";
import { DELETE as signOut, POST as signIn } from "../app/api/user/route";
import { findUsers, groupUsers, summariseAll } from "../lib/demo/aggregate";
import { shouldAdapt } from "../lib/demo/auto";
import { parseSnapshot, type LiveSnapshot } from "../lib/demo/live";
import { firestore } from "../lib/server/db";
import { canSignIn, loginRequired, storeUser, userFromToken, userToken } from "../lib/server/users";

const env = {
  FIREBASE_API_KEY: "k", FIREBASE_AUTH_DOMAIN: "d", FIREBASE_PROJECT_ID: "p", FIREBASE_APP_ID: "a",
  SESSION_SECRET: "test-only-secret",
};
const calm = { rage: 0, dead: 0, miss: 0, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1 };
const snapshot: LiveSnapshot = {
  id: "affe31bc-a81f-4885-a880-1eb1ae9676d0", user: null, email: null, emailHash: null, totals: calm, history: [],
  page: "orders", arm: "baseline", mode: "attune", block: 1, auto: true, pinned: false, locale: "en",
  viewportWidth: 375, modality: "coarse", friction: calm, context: [1, 1, 0, 0, 0, 0, 0], decision: null,
  why: ["x"], changes: [], log: [],
};
const request = (url: string, body?: unknown, cookie?: string) => new Request(`http://app.test${url}`, {
  method: body === undefined ? "GET" : "POST", body: body === undefined ? undefined : JSON.stringify(body),
  headers: cookie ? { cookie } : {},
});

describe("automatic adapting", () => {
  it("needs repeated struggle and a pause since the last change", () => {
    expect(shouldAdapt({ ...calm, dead: 2 }, 60_000)).toBe(false);
    expect(shouldAdapt({ ...calm, dead: 2, thrash: 1 }, 60_000)).toBe(true);
    expect(shouldAdapt({ ...calm, dead: 5 }, 1000)).toBe(false);
    expect(shouldAdapt({ ...calm, tortuosity: 50 }, 60_000)).toBe(false);
  });
});

describe("live snapshot", () => {
  it("keeps known fields only and rejects bad shapes", () => {
    expect(parseSnapshot({ ...snapshot, typed: "secret", email: "x@y.z" })).toEqual(snapshot);
    for (const bad of [
      null, { ...snapshot, id: "x" }, { ...snapshot, arm: "<b>" }, { ...snapshot, context: [1] },
      { ...snapshot, why: ["a".repeat(301)] }, { ...snapshot, friction: { rage: 1 } },
      { ...snapshot, decision: { action: "shortcut", propensity: 2, probs: {} } },
    ]) expect(parseSnapshot(bad)).toBeNull();
  });
});

describe("store sign-in", () => {
  beforeEach(() => {
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("never exposes a full email address", () => {
    const google = storeUser({ uid: "AbC123xyz", email: "Asha.Rao@gmail.com", name: "Asha Rao" });
    expect(google).toMatchObject({ name: "asha_abc1", email: "a***@gmail.com" });
    expect(google.emailHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(google)).not.toContain("asha.rao");
    expect(storeUser({ uid: "u", email: "ravi_1@users.example.com", name: "" }))
      .toEqual({ name: "ravi_1", email: null, emailHash: null });
  });

  it("issues a cookie only for a token Firebase accepts, and takes identity from it", async () => {
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) =>
      JSON.parse(init.body as string).idToken === "good-token-0123456789"
        ? Response.json({ users: [{ localId: "u1", email: "ravi@users.example.com" }] })
        : new Response("{}", { status: 400 }));
    expect((await signIn(request("/api/user", { idToken: "forged-token-0123456789" }))).status).toBe(401);
    expect((await signIn(request("/api/user", {}))).status).toBe(400);
    const ok = await signIn(request("/api/user", { idToken: "good-token-0123456789" }));
    const cookie = ok.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly; SameSite=Lax; Max-Age=2592000/);
    const mine = cookie.split(";")[0];

    expect((await POST(request("/api/live", snapshot))).status).toBe(401);
    expect((await POST(request("/api/live", { ...snapshot, user: "someone_else" }, mine))).status).toBe(200);
    expect((await POST(request("/api/live", { id: 1 }, mine))).status).toBe(400);
    // The admin list is public.
    const seen = await (await GET(request("/api/live"))).json();
    expect(seen.storage).toBe("memory");
    expect(seen.sessions[0].snapshot).toEqual({ ...snapshot, user: "ravi" });
    const later = await (await GET(request(`/api/live?since=${new Date(Date.now() + 1000).toISOString()}`))).json();
    expect(later.sessions).toEqual([]);
    expect(signOut(request("/api/user")).headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });

  it("stays closed when there is no secret to sign cookies with", () => {
    const bare = { ...env, SESSION_SECRET: "" };
    expect([loginRequired(bare), canSignIn(bare), loginRequired({})]).toEqual([true, false, false]);
  });

  it("rejects a forged or expired cookie", () => {
    const user = { name: "asha", email: null, emailHash: null };
    const token = userToken(user, 1000, env);
    expect(userFromToken(token, 2000, env)).toEqual(user);
    expect(userFromToken(`x${token}`, 2000, env)).toBeNull();
    expect(userFromToken(token, 2000, { ...env, SESSION_SECRET: "other" })).toBeNull();
    expect(userFromToken(token, 1000 + 31 * 86_400_000, env)).toBeNull();
  });
});

describe("Firestore client", () => {
  it("signs in as the service account and creates documents only if new", async () => {
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const calls: { url: string; init: RequestInit }[] = [];
    const db = firestore({ project_id: "p", client_email: "svc@p.test", private_key: privateKey }, (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("oauth2")) return Response.json({ access_token: "T", expires_in: 3600 });
      if (url.endsWith(":commit")) return new Response("{}", { status: 409 });
      return Response.json([{ document: { name: "x/slots/touch_1", fields: { seq: { integerValue: "1" }, ok: { booleanValue: true } } } }]);
    }) as typeof fetch);

    expect(await db.create([{ collection: "slots", id: "touch_1", data: { seq: 1, note: null } }])).toBe(false);
    const commit = JSON.parse(calls[1].init.body as string);
    expect(commit.writes[0].currentDocument).toEqual({ exists: false });
    expect(commit.writes[0].update.fields).toEqual({ seq: { integerValue: "1" }, note: { nullValue: null } });
    expect(calls[1].init.headers).toMatchObject({ Authorization: "Bearer T" });
    expect(await db.where("slots", "stratum", "==", "touch", 5)).toEqual([{ id: "touch_1", data: { seq: 1, ok: true } }]);
    expect(calls.filter((c) => c.url.includes("oauth2"))).toHaveLength(1); // token reused
  });
});

describe("per-user and global views", () => {
  const row = (user: string, id: string, at: string, dead: number, emailHash: string | null = null) => ({
    updatedAt: at,
    snapshot: { ...snapshot, id, user, emailHash, friction: { ...calm, dead }, history: [{ block: 1, arm: "shortcut" as const }] },
  });
  const now = Date.parse("2026-11-27T12:00:00Z");
  const users = groupUsers([
    row("asha", "1", "2026-11-27T11:00:00Z", 2), row("asha", "2", "2026-11-27T11:59:55Z", 1),
    row("ravi", "3", "2026-11-27T11:00:00Z", 4, "abc"),
  ], now);

  it("adds up each user's sessions and then everyone", () => {
    expect(users.map((u) => [u.name, u.online, u.totals.dead, u.sessions])).toEqual([["asha", true, 3, 2], ["ravi", false, 4, 1]]);
    const all = summariseAll(users);
    expect([all.users, all.online, all.adaptations, all.struggles.dead, all.chosen.shortcut]).toEqual([2, 1, 3, 7, 2]);
  });

  it("finds a user by part of the name or by the hash of a full email", () => {
    expect(findUsers(users, "ASH", "").map((u) => u.name)).toEqual(["asha"]);
    expect(findUsers(users, "r@x.com", "abc").map((u) => u.name)).toEqual(["ravi"]);
    expect(findUsers(users, "r@x.com", "")).toEqual([]);
    expect(findUsers(users, "  ", "")).toHaveLength(2);
  });
});
