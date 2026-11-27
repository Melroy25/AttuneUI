import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/participants/route";
import { decide, decidePlacebo, policyHash } from "../lib/attune-ui/bandit/policy";
import { loadFrozenPolicy, parseFrozen } from "../lib/server/frozen";
import { STUDY_ARMS, assign, blockCount, offlineAssignment, parsePhase } from "../lib/study/assignment";
import { boundaryDecision } from "../lib/study/boundary";
import { freezePolicy, priorFile } from "../lib/study/freeze";
import { parseRegistration } from "../lib/study/validate";
import { pilotLog } from "./synthetic";

const frozen = freezePolicy(priorFile(), pilotLog(8));
const dir = mkdtempSync(join(tmpdir(), "attune-"));
const write = (text: string) => {
  mkdirSync(join(dir, "data"), { recursive: true });
  writeFileSync(join(dir, "data", "policy.frozen.json"), text);
};
const body = {
  id: "affe31bc-a81f-4885-a880-1eb1ae9676d0", pointer: "touch", viewportWidth: 375,
  repeatDevice: false, phase: "confirmatory",
};
const send = () => POST(new Request("http://app.test/api/participants", { method: "POST", body: JSON.stringify(body) }));

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("confirmatory assignment", () => {
  it("runs two blocks and balances A/B/C, never P", () => {
    expect([parsePhase("confirmatory"), blockCount("confirmatory")]).toEqual(["confirmatory", 2]);
    for (let i = 0; i < 30; i += 3) {
      const arms = [0, 1, 2].map((k) => assign("confirmatory", "mouse", i + k).arm);
      expect(arms.sort()).toEqual([...STUDY_ARMS]);
    }
    expect(STUDY_ARMS).toContain(offlineAssignment("x", "confirmatory").arm);
    expect(parseRegistration({ ...body, offline: { arm: "P", order: "AB" } })).toBeNull();
    expect(parseRegistration({ ...body, offline: { arm: "C", order: "AB" } })).not.toBeNull();
  });

  it("uses the frozen weights for C and the frozen marginals for B", () => {
    const policy = parseFrozen(JSON.parse(JSON.stringify(frozen)));
    const input = {
      previous: [{ rage: 2, dead: 1, miss: 0, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1 }],
      block: 2 as const, pointer: "touch" as const, viewportWidth: 375, participantId: "p1", policy,
    };
    const c = boundaryDecision({ ...input, arm: "C" });
    expect(c).toMatchObject(decide(frozen.models.coarse, c.context, c.seed));
    expect(c.policyHash).toBe(policyHash(frozen.models.coarse));
    const b = boundaryDecision({ ...input, arm: "B" });
    expect(b).toMatchObject(decidePlacebo(frozen.marginals, b.context, b.seed));
  });
});

describe("frozen policy loading", () => {
  it("fails with a clear message until a valid file exists", async () => {
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("STUDY_PHASE", "confirmatory");
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "");
    vi.stubEnv("STUDY_CODE", "");

    expect(loadFrozenPolicy().error).toMatch(/does not exist.*policy:freeze/);
    const refused = await send();
    expect(refused.status).toBe(503);
    expect((await refused.json()).error).toMatch(/policy\.frozen\.json does not exist/);

    write("{ not json");
    expect(loadFrozenPolicy().error).toMatch(/invalid/);

    write(JSON.stringify(frozen));
    expect(loadFrozenPolicy().policy?.hash).toBe(frozen.hash);
    expect((await (await send()).json()).error).toBe("storage not configured");
  });

  it("rejects the prior, edited weights, other settings and bad shapes", () => {
    const prior = JSON.parse(readFileSync("data/policy.prior.json", "utf8"));
    expect(() => parseFrozen(prior)).toThrow(/not a frozen policy/);
    expect(() => parseFrozen(null)).toThrow(/not a frozen policy/);
    const edit = (change: (f: typeof frozen) => void) => {
      const copy = structuredClone(frozen);
      change(copy);
      return () => parseFrozen(copy);
    };
    expect(edit((f) => { f.models.fine.shortcut.b[0] += 1; })).toThrow(/edited/);
    expect(edit((f) => { f.config = { ...f.config, v: 1 }; })).toThrow(/config/);
    expect(edit((f) => { f.models.coarse.guided.b.pop(); })).toThrow(/weights/);
    expect(edit((f) => { f.marginals.baseline += 0.5; })).toThrow(/marginals/);
  });
});
