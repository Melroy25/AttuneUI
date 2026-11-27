import { describe, expect, it } from "vitest";
import { GET, POST } from "../app/api/demo-user/route";
import { newShortcuts } from "../lib/bandit/shortcutBandit";
import { DEFAULT_PREFERENCES } from "../lib/attune-ui/preferences/rules";
import { addNew, mergeUsers, parseState, parseTotals } from "../lib/demo/cloud";
import { NO_HABITS } from "../lib/demo/habits";
import { firestore } from "../lib/server/db";

const state = {
  arm: "shortcut", preferences: DEFAULT_PREFERENCES, shortcuts: newShortcuts(), memory: null,
  habits: { ...NO_HABITS, supportHovers: 4 }, friction: parseTotals({ rage: 3, dead: 5 }),
};
const post = (body: unknown) => POST(new Request("http://app.test/api/demo-user", { method: "POST", body: JSON.stringify(body) }));
const read = async (query: string) => (await GET(new Request(`http://app.test/api/demo-user${query}`))).json();

describe("saved demo users", () => {
  it("counts only new friction, also after the event buffer is drained", () => {
    const zero = parseTotals(null);
    const three = parseTotals({ dead: 3 });
    expect(addNew(three, three, zero).dead).toBe(3);
    expect(addNew(three, zero, parseTotals({ dead: 2 })).dead).toBe(5);
  });

  it("keeps totals and logs when a later upload holds less, such as after Reset", async () => {
    const entry = { at: 10, trigger: "4 dead clicks", change: "Switched layout", confidence: 0.4 };
    const first = { guest: "guest-0a1b2c3d", ...state, activity: [entry] };
    expect((await post(first)).status).toBe(200);
    await post(first); // repeated upload
    await post({ ...first, arm: "baseline", friction: {}, activity: [{ at: 20, trigger: "Pressed Reset", change: "Static" }] });
    const saved = await read("?id=guest-0a1b2c3d");
    expect(saved.user.state.arm).toBe("baseline");
    expect(saved.user.state.friction).toMatchObject({ rage: 3, dead: 5 });
    expect(saved.activity.map((a: { at: number }) => a.at)).toEqual([20, 10]);
    expect(saved.activity[1].confidence).toBe(0.4);
    expect((await read("")).users).toHaveLength(1);
  });

  it("rejects bad ids and shapes", async () => {
    for (const bad of [state, { ...state, guest: "asha" }, { guest: "guest-0a1b2c3d", ...state, arm: "<b>" }]) {
      expect((await post(bad)).status).toBe(400);
    }
    expect((await GET(new Request("http://app.test/api/demo-user?id=../slots"))).status).toBe(400);
    expect(parseState({ ...state, friction: { rage: -1 } })!.friction.rage).toBe(0);
  });

  it("lets the server copy win over the browser cache but keeps the larger counts", () => {
    const parsed = parseState(state)!;
    const remote = { id: "a", updatedAt: "2026", state: { ...parsed, habits: NO_HABITS } };
    const [merged] = mergeUsers([remote], [{ id: "a", updatedAt: "", state: { ...parsed, arm: "guided" } }]);
    expect([merged.state.arm, merged.state.habits.supportHovers]).toEqual(["shortcut", 4]);
  });

  it("queries a subcollection under its parent document", async () => {
    const calls: [string, string][] = [];
    const key = { project_id: "p", client_email: "sub@test", private_key: "" };
    const fetcher = (async (url: string, init?: RequestInit) => {
      if (url.includes("oauth2")) return Response.json({ access_token: "t", expires_in: 3600 });
      calls.push([url, String(init?.body)]);
      return Response.json([]);
    }) as typeof fetch;
    const { generateKeyPairSync } = await import("node:crypto");
    key.private_key = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    await firestore(key, fetcher).where("demo_users/a/activity", "timestamp", ">", 0, 5);
    expect(calls[0][0]).toContain("/documents/demo_users/a:runQuery");
    expect(calls[0][1]).toContain('"collectionId":"activity"');
  });
});
