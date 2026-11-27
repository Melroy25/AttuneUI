import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { EventLog } from "../lib/attune-ui/bandit/replay";
import { evaluate } from "../lib/eval/ope";
import { analyse, cuped, subjectsFromLog } from "../lib/eval/stats";
import { erfc, holm, mannWhitney, quantile } from "../lib/eval/tests";
import { fixture } from "./synthetic";

const FIXTURE = "evaluation/fixtures/synthetic_export.json";

/** Same structure, numbers within 1e-9. */
function expectSame(actual: unknown, expected: unknown, path = "$") {
  if (typeof expected === "number") {
    expect(typeof actual, path).toBe("number");
    expect(Math.abs((actual as number) - expected), `${path}: ${actual} != ${expected}`).toBeLessThan(1e-9);
  } else if (expected !== null && typeof expected === "object") {
    expect(Object.keys(actual as object).sort(), path).toEqual(Object.keys(expected).sort());
    for (const [k, v] of Object.entries(expected)) expectSame((actual as Record<string, unknown>)[k], v, `${path}.${k}`);
  } else expect(actual, path).toBe(expected);
}

describe("primitives", () => {
  it("matches reference values", () => {
    expect(erfc(0)).toBeCloseTo(1, 14);
    expect(erfc(1)).toBeCloseTo(0.157299207050285, 13);
    expect(erfc(3)).toBeCloseTo(0.0000220904969985854, 15);
    expect(holm([0.04, 0.01])).toEqual([0.04, 0.02]);
    expect(holm([0.03, 0.04])).toEqual([0.06, 0.06]);
    expect(holm([null, 0.2])).toEqual([null, 0.2]);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(mannWhitney([1, 2, 3], [4, 5, 6]).u).toBe(0);
    expect(mannWhitney([1, 1], [1, 1]).p).toBeNull();
  });
});

describe("primary analysis", () => {
  const log = fixture() as EventLog;

  it("reports every exclusion and never mixes phases", () => {
    const { subjects, offline, exclusions } = subjectsFromLog(log);
    const sum = (r: Record<string, number>) => r.A + r.B + r.C;
    expect(exclusions.otherPhase).toBe(12);
    expect([sum(exclusions.repeatDevice), sum(exclusions.incomplete), sum(exclusions.offline)]).toEqual([1, 1, 1]);
    expect([subjects.length, offline.length]).toEqual([33, 1]);
  });

  it("caps a failed task at 90 s", () => {
    const id = log.participants[3].id;
    const times = log.events.filter((e) => e.participant_id === id && e.kind === "task" && e.block === 2)
      .map((e) => e.payload as { success: boolean; timeMs: number });
    const expected = times.reduce((s, t) => s + (t.success ? t.timeMs : 90_000), 0);
    expect(subjectsFromLog(log).subjects.find((s) => s.id === id)!.y).toBeCloseTo(Math.log(expected), 12);
  });

  it("CUPED removes the part of Y explained by X", () => {
    const people = [1, 2, 3, 4].map((x) => ({ id: `${x}`, arm: "A" as const, stratum: "mouse", x, y: 2 * x + 1 }));
    const { theta, adjusted } = cuped(people);
    expect(theta).toBeCloseTo(2);
    adjusted.forEach((v) => expect(v).toBeCloseTo(6));
  });

  it("detects a large planted effect and reports nothing without data", () => {
    const planted = structuredClone(log);
    const fast = new Set(planted.participants.filter((p) => (p as { arm?: string }).arm === "C").map((p) => p.id));
    for (const e of planted.events) {
      if (e.kind === "task" && e.block === 2 && fast.has(e.participant_id)) {
        e.payload = { ...(e.payload as object), success: true, timeMs: 1000 };
      }
    }
    for (const c of analyse(planted, "confirmatory", 2000).contrasts) {
      expect(c.difference!).toBeLessThan(0);
      expect(c.ci95![1]).toBeLessThan(0);
      expect(c.pHolm!).toBeLessThan(0.01);
    }
    expect(analyse({ participants: [], events: [] }, "confirmatory", 10).contrasts[0])
      .toMatchObject({ difference: null, p: null, pHolm: null, ci95: null });
  });
});

describe("Python verifier", () => {
  it("reproduces the TypeScript numbers on the committed SIMULATED fixture", () => {
    const text = `${JSON.stringify(fixture())}\n`;
    if (process.env.WRITE_FIXTURE) writeFileSync(FIXTURE, text);
    expect(readFileSync(FIXTURE, "utf8").replace(/\r\n/g, "\n")).toBe(text);

    const output = execFileSync("python",
      ["evaluation/verify_results.py", FIXTURE, "--policy", "data/policy.prior.json"],
      { encoding: "utf8", maxBuffer: 1e7 });
    const python = JSON.parse(output);
    const log = JSON.parse(text) as EventLog;
    const { models } = JSON.parse(readFileSync("data/policy.prior.json", "utf8"));
    expect(python.provenance[0]).toMatch(/SIMULATED/);
    expect(python.ope.pilot.n).toBe(20);
    expectSame(python.stats, analyse(log));
    expectSame(python.ope, {
      pilot: evaluate(log, "pilot", models), confirmatory: evaluate(log, "confirmatory", models),
    });
  }, 120_000);
});
