import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/events/route";
import { GET } from "../app/api/export/route";
import { memoryDb, type Db } from "../lib/server/db";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("../lib/server/db", async (original) => ({
  ...(await original<typeof import("../lib/server/db")>()),
  database: () => state.db,
}));
let db: Db;

const participantId = "affe31bc-a81f-4885-a880-1eb1ae9676d0";
const row = { seq: 0, block: 1, kind: "task", payload: { success: true } };
const send = (events: object[] = [row]) => POST(new Request("http://app.test/api/events", {
  method: "POST", body: JSON.stringify({ participantId, events }),
}));
const get = (token = "token") =>
  GET(new Request("http://app.test/api/export", { headers: { authorization: `Bearer ${token}` } }));

beforeEach(async () => {
  db = memoryDb();
  state.db = db;
  vi.stubEnv("EXPORT_TOKEN", "token");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/events", () => {
  it("refuses unknown participants and a missing or failing database", async () => {
    expect((await send()).status).toBe(409);
    state.db = { ...db, get: async () => { throw new Error("down"); } };
    expect((await send()).status).toBe(502);
    state.db = null;
    expect((await send()).status).toBe(503);
  });

  it("uploads idempotently: a retry leaves the first copy", async () => {
    await db.set("participants", participantId, { id: participantId });
    expect((await send()).status).toBe(200);
    expect((await send([{ ...row, payload: { success: false } }])).status).toBe(200);
    const body = await (await get()).json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({ participant_id: participantId, ...row });
  });
});

describe("GET /api/export", () => {
  it("returns every page in participant and sequence order", async () => {
    await db.set("participants", participantId, { id: participantId, seq: 3, offline: false });
    for (let seq = 0; seq < 201; seq += 20) {
      await send(Array.from({ length: Math.min(20, 201 - seq) }, (_, i) => ({ ...row, seq: seq + i })));
    }
    const body = await (await get()).json();
    expect(body.participants).toEqual([{ id: participantId, seq: 3, offline: false }]);
    expect(body.events.map((e: { seq: number }) => e.seq)).toEqual(Array.from({ length: 201 }, (_, i) => i));
  });

  it("rejects a wrong token and never completes a partial export", async () => {
    expect((await get("wrong")).status).toBe(401);
    state.db = { ...db, page: async () => { throw new Error("down"); } };
    await expect((await get()).text()).rejects.toThrow();
  });
});
