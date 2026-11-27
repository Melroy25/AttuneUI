import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/participants/route";
import { createModels, theta, update } from "../lib/attune-ui/bandit/policy";
import { replay, updatesFromLog, type EventLog } from "../lib/attune-ui/bandit/replay";
import { assign, blockCount, offlineAssignment, parsePhase, variantFor } from "../lib/study/assignment";
import { boundaryDecision } from "../lib/study/boundary";
import { fileHash, freezePolicy, priorFile, type PolicyFile } from "../lib/study/freeze";
import { parseRegistration } from "../lib/study/validate";

const calm = { rage: 0, dead: 0, miss: 0, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1 };
const context = [1, 1, 0, 0.5, 0, 0, 0];

/** One pilot participant: static block 1, then decided blocks 2 and 3. */
function pilot(id: string, extra: Partial<EventLog["participants"][number]> = {}, blocks = [2, 3]): EventLog {
  let seq = 0;
  const events: EventLog["events"] = [];
  const add = (block: number, kind: string, payload: unknown) =>
    events.push({ participant_id: id, seq: seq++, block, kind, payload });
  for (const block of [1, ...blocks]) {
    if (block > 1) add(block, "decision", { action: "shortcut", context });
    for (let taskIndex = 0; taskIndex < 3; taskIndex++) {
      add(block, "task", { taskIndex, success: true, timeMs: 10_000, friction: calm });
    }
  }
  const person = { id, phase: "pilot", pointer: "touch", offline: false, repeat_device: false, ...extra };
  return { participants: [person], events };
}
const merge = (...logs: EventLog[]): EventLog => ({
  participants: logs.flatMap((l) => l.participants), events: logs.flatMap((l) => l.events),
});

describe("replay", () => {
  it("matches direct updates and ignores row order and duplicates", () => {
    const log = merge(pilot("b"), pilot("a"));
    const shuffled = merge(log, log);
    shuffled.events.reverse();
    shuffled.participants.reverse();
    const first = replay(createModels(), updatesFromLog(log, "pilot").updates);
    expect(replay(createModels(), updatesFromLog(shuffled, "pilot").updates)).toEqual(first);
    expect(first.applied).toHaveLength(4);

    const reward = first.applied[0].reward;
    expect(reward).toBeCloseTo(0.5 + 0.35 + 0.15 - 0.05);
    let direct = createModels().coarse;
    for (let i = 0; i < 4; i++) direct = update(direct, "shortcut", context, reward);
    expect(first.models.coarse).toEqual(direct);
    expect(first.models.fine).toEqual(createModels().fine);
  });

  it("caps updates per session", () => {
    const { updates } = updatesFromLog(merge(pilot("a"), pilot("b")), "pilot");
    const capped = replay(createModels(), updates, 1);
    expect(capped.applied.map((u) => [u.sessionId, u.block])).toEqual([["a", 2], ["b", 2]]);
    expect(capped.capped).toBe(2);
    // A third decision from one session is dropped by the default cap.
    expect(replay(createModels(), [...updates.slice(0, 2), updates[0]]).applied).toHaveLength(2);
  });

  it("never pools phases and skips repeat devices, partial and invalid blocks", () => {
    const broken = pilot("d");
    broken.events.find((e) => e.kind === "decision")!.payload = { action: "<script>", context };
    const partial = pilot("c");
    partial.events.pop();
    const log = merge(
      pilot("a", { phase: "test" }), pilot("b", { repeat_device: true }), partial, broken,
    );
    const { updates, skipped } = updatesFromLog(log, "pilot");
    expect(updates.map((u) => `${u.sessionId}${u.block}`)).toEqual(["c2", "d3"]);
    expect(skipped).toEqual({ repeatDevice: 1, incompleteBlocks: 1, invalid: 1 });
  });
});

describe("prior and freeze", () => {
  const stored = JSON.parse(readFileSync("data/policy.prior.json", "utf8")) as PolicyFile;

  it("committed prior is intact and reproducible from the code", () => {
    expect(fileHash(stored.models, stored.marginals)).toBe(stored.hash);
    const fresh = priorFile();
    expect(fresh.hash).toBe(stored.hash);
  });

  it("freezes from pilot data only, with marginals that sum to 1", () => {
    const frozen = freezePolicy(stored, merge(pilot("a"), pilot("b"), pilot("t", { phase: "test" })));
    expect(frozen.pilot).toMatchObject({ participants: 2, updates: 4, cappedUpdates: 0 });
    expect(Object.values(frozen.marginals).reduce((s, p) => s + p, 0)).toBeCloseTo(1);
    expect(theta(frozen.models.coarse.shortcut)).not.toEqual(theta(stored.models.coarse.shortcut));
    expect(frozen.models.fine).toEqual(stored.models.fine);
    expect(() => freezePolicy(stored, pilot("t", { phase: "test" }))).toThrow(/no usable pilot/);
    expect(() => freezePolicy({ ...stored, hash: "00000000" }, pilot("a"))).toThrow(/edited/);
  });
});

describe("pilot assignment", () => {
  it("assigns P with counterbalanced order, online and offline", () => {
    const slots = Array.from({ length: 12 }, (_, i) => assign("pilot", "touch", i));
    expect(new Set(slots.map((s) => s.arm))).toEqual(new Set(["P"]));
    expect(slots.filter((s) => s.order === "AB")).toHaveLength(6);
    expect(offlineAssignment("x", "pilot").arm).toBe("P");
    expect([blockCount("pilot"), blockCount("test")]).toEqual([3, 2]);
    expect(variantFor("BA", 3)).toBe("B");
  });

  it("accepts only known phases", () => {
    expect([parsePhase(undefined), parsePhase("pilot")]).toEqual(["test", "pilot"]);
    expect([parsePhase("Pilot"), parsePhase("Confirmatory")]).toEqual([null, null]);
  });

  it("draws uniformly over eligible arms, independently per block", () => {
    const decideFor = (participantId: string, block: 2 | 3) => boundaryDecision({
      arm: "P", previous: [{ ...calm, rage: 3 }], block, pointer: "touch", viewportWidth: 375,
      participantId, policy: priorFile(),
    });
    const decisions = Array.from({ length: 500 }, (_, i) => decideFor(`p${i}`, 2));
    expect(decisions[0]).toMatchObject({ propensity: 0.2, policyHash: "uniform" });
    for (const arm of decisions[0].eligible) {
      expect(decisions.filter((d) => d.action === arm).length).toBeGreaterThan(60);
    }
    const same = Array.from({ length: 100 }, (_, i) => decideFor(`p${i}`, 3).action === decisions[i].action);
    expect(same.filter(Boolean).length).toBeLessThan(50);
  });
});

describe("study code and phase gate", () => {
  const body = {
    id: "affe31bc-a81f-4885-a880-1eb1ae9676d0", pointer: "touch", viewportWidth: 375,
    repeatDevice: false, phase: "pilot",
  };
  const send = async (extra: object) =>
    (await POST(new Request("http://app.test/api/participants", {
      method: "POST", body: JSON.stringify({ ...body, ...extra }),
    }))).status;
  afterEach(() => vi.unstubAllEnvs());

  it("refuses an offline arm that does not belong to the phase", () => {
    expect(parseRegistration({ ...body, offline: { arm: "C", order: "AB" } })).toBeNull();
    expect(parseRegistration({ ...body, phase: "test", offline: { arm: "P", order: "AB" } })).toBeNull();
    expect(parseRegistration({ ...body, offline: { arm: "P", order: "AB" } })).not.toBeNull();
  });

  it("checks the code, requires one in production, and checks the phase", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "");
    vi.stubEnv("STUDY_PHASE", "pilot");
    vi.stubEnv("STUDY_CODE", "veroxa");
    expect(await send({})).toBe(403);
    expect(await send({ code: "wrong" })).toBe(403);
    expect(await send({ code: "veroxa" })).toBe(503); // passed the gate; no database here
    expect(await send({ code: "veroxa", phase: "test" })).toBe(409);
    vi.stubEnv("STUDY_CODE", "");
    vi.stubEnv("STUDY_PHASE", "test");
    expect(await send({})).toBe(409); // open gate outside production
    vi.stubEnv("NODE_ENV", "production");
    expect(await send({ phase: "test" })).toBe(503);
  });
});
