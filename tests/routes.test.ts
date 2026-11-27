import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/events/route";
import { GET } from "../app/api/export/route";

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://db.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");
  vi.stubEnv("EXPORT_TOKEN", "token");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/events", () => {
  const participantId = "affe31bc-a81f-4885-a880-1eb1ae9676d0";
  const row = { seq: 0, block: 1, kind: "task", payload: { success: true } };
  const send = () => POST(new Request("http://app.test/api/events", {
    method: "POST", body: JSON.stringify({ participantId, events: [row] }),
  }));

  it("uploads idempotently", async () => {
    const db = vi.fn(async (_url: string, _init: RequestInit) => new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", db);
    expect((await send()).status).toBe(200);
    const [url, init] = db.mock.calls[0];
    expect(url).toBe("https://db.test/rest/v1/events?on_conflict=participant_id,seq");
    expect(init.headers).toMatchObject({ Prefer: "resolution=ignore-duplicates,return=minimal" });
    expect(init.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(init.body as string)).toEqual([{ participant_id: participantId, ...row }]);
  });

  it("passes on unknown participant and hides other database errors", async () => {
    for (const [database, expected] of [[409, 409], [400, 502], [500, 502]]) {
      vi.stubGlobal("fetch", async () => new Response("detail", { status: database }));
      expect((await send()).status).toBe(expected);
    }
  });
});

describe("GET /api/export", () => {
  const events = Array.from({ length: 201 }, (_, seq) => ({ seq }));
  const database = (failAt = -1) => async (url: string) => {
    const query = new URL(url).searchParams;
    const offset = Number(query.get("offset"));
    if (offset === failAt) return new Response(null, { status: 500 });
    const table = url.includes("/participants?") ? [{ id: "a" }] : events;
    return Response.json(table.slice(offset, offset + Number(query.get("limit"))));
  };
  const get = (token = "token") =>
    GET(new Request("http://app.test/api/export", { headers: { authorization: `Bearer ${token}` } }));

  it("returns every page", async () => {
    vi.stubGlobal("fetch", database());
    const body = await (await get()).json();
    expect(body.participants).toEqual([{ id: "a" }]);
    expect(body.events).toEqual(events);
  });

  it("rejects a wrong token and never completes a partial export", async () => {
    vi.stubGlobal("fetch", database(200));
    expect((await get("wrong")).status).toBe(401);
    await expect((await get()).text()).rejects.toThrow();
  });
});
