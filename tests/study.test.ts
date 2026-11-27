import { describe, expect, it } from "vitest";
import { createModels } from "../lib/attune-ui/bandit/policy";
import { register } from "../lib/server/register";
import { authHeaders, supabaseRest, type Rest } from "../lib/server/supabase";
import { STUDY_ARMS, assign, offlineAssignment, variantFor } from "../lib/study/assignment";
import { boundaryDecision, sumFriction } from "../lib/study/boundary";
import { createQueue, type QueueItem } from "../lib/study/queue";
import { chunk, newParticipantId, roundEvents } from "../lib/study/records";
import { parseEventBatch, parseRegistration, type Registration } from "../lib/study/validate";

const calm = { rage: 0, dead: 0, miss: 0, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1 };

describe("assignment", () => {
  it("balances arms in every block of 3 and crosses arm with order every 6", () => {
    for (const pointer of ["mouse", "touch", "pen"] as const) {
      const slots = Array.from({ length: 60 }, (_, i) => assign("test", pointer, i));
      for (let i = 0; i < 60; i += 3) {
        expect(slots.slice(i, i + 3).map((s) => s.arm).sort()).toEqual([...STUDY_ARMS]);
      }
      for (let i = 0; i < 60; i += 6) {
        expect(new Set(slots.slice(i, i + 6).map((s) => s.arm + s.order)).size).toBe(6);
      }
    }
  });

  it("is deterministic, varies across blocks and covers all arms offline", () => {
    expect(assign("test", "touch", 7)).toEqual(assign("test", "touch", 7));
    const blocks = Array.from({ length: 20 }, (_, b) =>
      [0, 1, 2].map((i) => assign("test", "touch", b * 3 + i).arm).join(""));
    expect(new Set(blocks).size).toBeGreaterThan(2);
    const offline = Array.from({ length: 100 }, (_, i) => offlineAssignment(`id-${i}`, "test").arm);
    expect(new Set(offline).size).toBe(3);
    expect([variantFor("BA", 1), variantFor("BA", 2)]).toEqual(["B", "A"]);
  });
});

describe("boundary decision", () => {
  const marginals = { baseline: 0.2, ergonomic: 0.2, disclosure: 0.2, shortcut: 0.2, guided: 0.2 };
  const input = {
    previous: [{ ...calm, rage: 2 }, { ...calm, dead: 2 }], block: 2 as const, pointer: "touch" as const,
    viewportWidth: 375, participantId: "p1", policy: { models: createModels(), marginals },
  };

  it("keeps arm A static and logs exact probabilities for B and C", () => {
    expect(boundaryDecision({ ...input, arm: "A" })).toMatchObject({ action: "baseline", propensity: 1 });
    for (const arm of ["B", "C"] as const) {
      const d = boundaryDecision({ ...input, arm });
      expect(d.modality).toBe("coarse");
      expect(d.propensity).toBe(d.probs[d.action]);
      expect(Object.values(d.probs).reduce((s, p) => s + p, 0)).toBeCloseTo(1);
      expect(d).toEqual(boundaryDecision({ ...input, arm }));
    }
  });

  it("sums per-task friction without mixing tortuosity", () => {
    expect(sumFriction([{ ...calm, rage: 1, tortuosity: 4 }, { ...calm, rage: 2 }]))
      .toEqual({ ...calm, rage: 3, tortuosity: 4 });
  });
});

describe("API validation", () => {
  const id = newParticipantId();
  const registration = { id, pointer: "touch", viewportWidth: 375, repeatDevice: false, phase: "test" };
  const row = { seq: 0, block: 1, kind: "task", payload: {} };

  it("accepts valid bodies", () => {
    expect(parseRegistration(registration)?.offline).toBeNull();
    expect(parseEventBatch({ participantId: id, events: [row] })?.events).toHaveLength(1);
  });

  it("rejects malformed and oversized bodies", () => {
    for (const bad of [
      null, [], { ...registration, id: "1;drop" }, { ...registration, pointer: "gaze" },
      { ...registration, viewportWidth: -1 }, { ...registration, offline: { arm: "Z", order: "AB" } },
    ]) expect(parseRegistration(bad)).toBeNull();
    for (const events of [
      [], Array(21).fill(row), [{ ...row, block: 4 }], [{ ...row, kind: "x" }],
      [{ ...row, seq: 1.5 }], [{ ...row, payload: [] }], [{ ...row, payload: { s: "a".repeat(100_001) } }],
    ]) expect(parseEventBatch({ participantId: id, events })).toBeNull();
  });
});

describe("records", () => {
  it("rounds numbers only and chunks", () => {
    expect(roundEvents([{ type: "scroll", t: 1.6, y: 2.4 }])).toEqual([{ type: "scroll", t: 2, y: 2 }]);
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([])).toEqual([]);
  });
});

describe("upload queue", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  };
  const item = (n: number): QueueItem => ({ url: "/x", body: n });

  it("keeps order, survives reload while offline and sets rejected items aside", async () => {
    const storage = memory();
    const offline = createQueue(storage, () => Promise.reject(new Error("offline")));
    offline.push(item(1));
    offline.push(item(2));
    offline.push(item(3));
    await offline.flush();
    const sent: unknown[] = [];
    const online = createQueue(storage, async (i) => {
      sent.push(i.body);
      return i.body === 2 ? 400 : i.body === 3 ? 503 : 200;
    });
    await online.flush();
    expect(sent).toEqual([1, 2, 3]);
    expect(online.rejected()).toEqual([item(2)]);
    expect(online.pending()).toEqual([item(3)]);
  });

  it("works when storage is blocked", async () => {
    const queue = createQueue(
      { getItem: () => "not json", setItem: () => { throw new Error("quota"); } }, async () => 200,
    );
    queue.push(item(1));
    await queue.flush();
    expect(queue.pending()).toEqual([]);
  });
});

describe("Supabase helper", () => {
  it("sends Bearer only for legacy keys", () => {
    expect(authHeaders("sb_secret_x")).toEqual({ apikey: "sb_secret_x" });
    expect(authHeaders("eyJx")).toEqual({ apikey: "eyJx", Authorization: "Bearer eyJx" });
    expect(supabaseRest({})).toBeNull();
  });
});

describe("registration", () => {
  type Row = Record<string, unknown>;
  /** Minimal PostgREST stand-in; `stale` makes the first max-seq read return nothing. */
  function fakeDb(table: Row[], stale = false): Rest {
    return async (path, init) => {
      const body = init?.body ? (JSON.parse(init.body as string) as Row) : {};
      const id = /id=eq\.([^&]+)/.exec(path)?.[1];
      if (init?.method === "POST") {
        const clash = table.some((r) => r.id === body.id ||
          (body.seq !== null && r.pointer === body.pointer && r.seq === body.seq));
        if (!clash) table.push(body);
        return new Response(null, { status: clash ? 409 : 201 });
      }
      if (init?.method === "PATCH") {
        Object.assign(table.find((r) => r.id === id)!, body);
        return new Response(null, { status: 204 });
      }
      if (id) return Response.json(table.filter((r) => r.id === id));
      if (stale) { stale = false; return Response.json([]); }
      const seqs = table.filter((r) => r.seq !== null && path.includes(`pointer=eq.${r.pointer}`));
      return Response.json(seqs.sort((a, b) => Number(b.seq) - Number(a.seq)).slice(0, 1));
    };
  }
  const person = (id: string): Registration =>
    ({ id, pointer: "touch", viewportWidth: 375, repeatDevice: false, phase: "test", code: "", offline: null });

  it("allocates consecutive slots, retries a taken slot and is idempotent", async () => {
    const table: Row[] = [];
    const first = await register(fakeDb(table), person("a"));
    await register(fakeDb(table, true), person("b"));
    expect(table.map((r) => r.seq)).toEqual([0, 1]);
    expect(await register(fakeDb(table), person("a"))).toEqual(first);
    expect(table).toHaveLength(2);
  });

  it("gives offline participants no slot and records the arm they saw", async () => {
    const table: Row[] = [];
    await register(fakeDb(table), person("a"));
    const seen = { arm: "C", order: "BA" } as const;
    expect(await register(fakeDb(table), { ...person("a"), offline: seen })).toMatchObject({ ...seen, offline: true });
    await register(fakeDb(table), { ...person("b"), offline: seen });
    expect(table[0]).toMatchObject({ arm: "C", offline: true });
    expect(table[1]).toMatchObject({ seq: null, offline: true });
  });
});
