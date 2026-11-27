import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST as login } from "../app/api/admin/route";
import { GET, POST } from "../app/api/live/route";
import { POST as signIn } from "../app/api/user/route";
import { groupUsers, summariseAll } from "../lib/demo/aggregate";
import { userFromToken, userToken } from "../lib/server/users";
import { shouldAdapt } from "../lib/demo/auto";
import { parseSnapshot, type LiveSnapshot } from "../lib/demo/live";
import { checkLogin, issueToken, validToken } from "../lib/server/admin";

const env = { ADMIN_USER: "tester", ADMIN_PASSWORD: "test-only-password" };
const calm = { rage: 0, dead: 0, miss: 0, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1 };
const snapshot: LiveSnapshot = {
  id: "affe31bc-a81f-4885-a880-1eb1ae9676d0", user: null, totals: calm, history: [], page: "orders", arm: "baseline", mode: "attune", block: 1,
  auto: true, pinned: false, locale: "en", viewportWidth: 375, modality: "coarse", friction: calm,
  context: [1, 1, 0, 0, 0, 0, 0], decision: null, why: ["x"], changes: [], log: [],
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
    expect(parseSnapshot({ ...snapshot, typed: "secret" })).toEqual(snapshot);
    for (const bad of [
      null, { ...snapshot, id: "x" }, { ...snapshot, arm: "<b>" }, { ...snapshot, context: [1] },
      { ...snapshot, why: ["a".repeat(301)] }, { ...snapshot, friction: { rage: 1 } },
      { ...snapshot, decision: { action: "shortcut", propensity: 2, probs: {} } },
    ]) expect(parseSnapshot(bad)).toBeNull();
  });
});

describe("per-user and global views", () => {
  const row = (user: string, id: string, at: string, dead: number) => ({
    updatedAt: at,
    snapshot: { ...snapshot, id, user, friction: { ...calm, dead }, history: [{ block: 1, arm: "shortcut" as const }] },
  });

  it("adds up each user's sessions and then everyone", () => {
    const now = Date.parse("2026-11-27T12:00:00Z");
    const users = groupUsers([
      row("asha", "1", "2026-11-27T11:00:00Z", 2), row("asha", "2", "2026-11-27T11:59:55Z", 1),
      row("ravi", "3", "2026-11-27T11:00:00Z", 4),
    ], now);
    expect(users.map((u) => [u.name, u.online, u.totals.dead, u.sessions])).toEqual([["asha", true, 3, 2], ["ravi", false, 4, 1]]);
    const all = summariseAll(users);
    expect([all.users, all.online, all.adaptations, all.struggles.dead, all.chosen.shortcut]).toEqual([2, 1, 3, 7, 2]);
  });

  it("rejects a forged or expired user cookie", () => {
    const token = userToken("asha", 1000, env);
    expect(userFromToken(token, 2000, env)).toBe("asha");
    expect(userFromToken(token.replace("asha", "ravi"), 2000, env)).toBeNull();
    expect(userFromToken(token, 1000 + 8 * 86_400_000, env)).toBeNull();
  });
});

describe("admin access", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_USER", env.ADMIN_USER);
    vi.stubEnv("ADMIN_PASSWORD", env.ADMIN_PASSWORD);
    vi.stubEnv("SUPABASE_URL", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("accepts only the right login and an untampered, unexpired cookie", () => {
    expect(checkLogin("tester", env.ADMIN_PASSWORD, env)).toBe(true);
    expect(checkLogin("tester", "wrong", env)).toBe(false);
    expect(checkLogin("", "", {})).toBe(false);
    const token = issueToken(1000, env);
    expect(validToken(token, 2000, env)).toBe(true);
    expect(validToken(token, 1000 + 9 * 3_600_000, env)).toBe(false);
    expect(validToken(`9${token}`, 2000, env)).toBe(false);
    expect(validToken(token, 2000, { ...env, ADMIN_PASSWORD: "changed" })).toBe(false);
  });

  it("shows visitors to a signed-in admin only", async () => {
    expect((await POST(request("/api/live", snapshot))).status).toBe(401); // not signed in
    const account = { user: "Asha_1", password: "test-only-123" };
    const made = await signIn(request("/api/user", { ...account, create: true }));
    expect(made.status).toBe(200);
    expect((await signIn(request("/api/user", { ...account, create: true }))).status).toBe(409);
    expect((await signIn(request("/api/user", { ...account, password: "wrong-pass" }))).status).toBe(401);
    expect((await signIn(request("/api/user", { user: "a b", password: "test-only-123" }))).status).toBe(400);
    expect((await signIn(request("/api/user", account))).status).toBe(200);
    const mine = made.headers.get("set-cookie")!.split(";")[0];
    // The name always comes from the cookie, never from the body.
    expect((await POST(request("/api/live", { ...snapshot, user: "someone_else" }, mine))).status).toBe(200);
    expect((await POST(request("/api/live", { id: 1 }, mine))).status).toBe(400);
    expect((await GET(request("/api/live"))).status).toBe(401);
    expect((await login(request("/api/admin", { user: "tester", password: "no" }))).status).toBe(401);
    const ok = await login(request("/api/admin", { user: "tester", password: env.ADMIN_PASSWORD }));
    const cookie = ok.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly; SameSite=Strict/);
    const seen = await (await GET(request("/api/live", undefined, cookie.split(";")[0]))).json();
    expect(seen.storage).toBe("memory");
    expect(seen.sessions[0].snapshot).toEqual({ ...snapshot, user: "asha_1" });
    expect(DELETE(request("/api/admin")).headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });
});
