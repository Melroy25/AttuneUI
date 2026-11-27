import { describe, expect, it } from "vitest";
import { badgeFor, parseDataset, parseDatasetText } from "../lib/eval/dataset";
import { buildTimeline, filterParticipants, surfaceBreakdown } from "../lib/eval/inspect";
import {
  pValue, sampleTable, speedInterval, speedText, verdict, verifyCommand, type Contrast,
} from "../lib/eval/report";
import { describeFriction, explain } from "../lib/demo/explain";
import { newSession, previewSurface, togglePin } from "../lib/demo/session";
import { fixture } from "./synthetic";

const dataset = parseDataset(fixture());
const calm = { rage: 0, dead: 0, miss: 0, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1 };
const person = (id: string) => ({ id, phase: "test", pointer: "mouse", offline: false, repeat_device: false });

describe("dataset parser", () => {
  it("reads the bundled fixture as simulated, confirmatory first", () => {
    expect(dataset.simulated).toBe(true);
    expect(badgeFor(dataset, "confirmatory")).toBe("SYNTHETIC");
    expect(dataset.phases[0]).toEqual({ phase: "confirmatory", count: 36 });
    expect(dataset.dropped).toEqual({ participants: 0, events: 0 });
  });

  it("labels human exports by phase and keeps the timestamp", () => {
    const human = parseDataset({ exportedAt: "2026-11-27T10:00:00Z", participants: [person("a")], events: [] });
    expect([human.simulated, badgeFor(human, "pilot"), human.exportedAt])
      .toEqual([false, "PILOT", "2026-11-27T10:00:00Z"]);
    expect(human.log.participants[0]).toMatchObject({ arm: "?", viewport_width: null });
  });

  it("rejects non-exports and mixed data, and counts malformed rows", () => {
    expect(() => parseDatasetText("{")).toThrow(/not valid JSON/);
    expect(() => parseDataset([])).toThrow(/Not a study export/);
    expect(() => parseDataset({ participants: [], events: [] })).toThrow(/no valid participants/);
    expect(() => parseDataset({ participants: [person("sim-1"), person("b")], events: [] })).toThrow(/never pooled/);
    const messy = parseDataset({
      participants: [person("a"), { id: 5 }],
      events: [{ participant_id: "a", seq: 0, block: 1, kind: "task", payload: {} }, { seq: "x" }, null],
    });
    expect(messy.dropped).toEqual({ participants: 1, events: 2 });
  });
});

describe("timeline", () => {
  const events = [
    ...[1, 2].flatMap((block) => [0, 1, 2].flatMap((taskIndex) => {
      const base = (block - 1) * 10 + taskIndex * 2;
      const failed = block === 1 && taskIndex === 2;
      return [
        { participant_id: "a", seq: base, block, kind: "task", payload: {
          taskIndex, success: !failed, timeMs: block === 1 ? 20_000 : 10_000,
          friction: { ...calm, dead: block === 1 ? 2 : 0 },
        } },
        { participant_id: "a", seq: base + 1, block, kind: "rating", payload: { taskIndex, seq: block + 3 } },
      ];
    })),
    { participant_id: "a", seq: 9, block: 2, kind: "decision", payload: {
      action: "shortcut", propensity: 0.5, probs: { shortcut: 0.5, baseline: 0.5 }, context: [1, 0],
      modality: "fine", policyHash: "abc", provenance: "test",
    } },
    { participant_id: "other", seq: 0, block: 1, kind: "task", payload: {} },
  ];

  it("compares Block 2 with Block 1, counting failures as 90 s", () => {
    const { blocks, deltas } = buildTimeline([...events, events[0]], "a"); // a retried upload
    expect(blocks.map((b) => [b.block, b.totalMs, b.frictionTotal, b.meanEase]))
      .toEqual([[1, 130_000, 6, 4], [2, 30_000, 0, 5]]);
    expect(deltas).toEqual([{ block: 2, timeMs: -100_000, friction: -6, ease: 1 }]);
    expect(blocks[1].decision).toMatchObject({ action: "shortcut", propensity: 0.5, policyHash: "abc" });
    expect(blocks[0].tasks[2]).toMatchObject({ success: false, ease: 4 });
  });

  it("reports nothing it cannot compute", () => {
    const partial = buildTimeline(events.filter((e) => !(e.block === 2 && e.seq === 14)), "a");
    expect(partial.blocks[1].totalMs).toBeNull();
    expect(partial.deltas[0].timeMs).toBeNull();
    expect(buildTimeline(events, "nobody")).toEqual({ blocks: [], deltas: [] });
  });

  it("never renders an unknown surface", () => {
    const bad = events.map((e) => (e.kind === "decision" ? { ...e, payload: { action: "<script>" } } : e));
    expect(buildTimeline(bad, "a").blocks[1].decision!.action).toBeNull();
  });
});

describe("search and summaries", () => {
  const people = dataset.log.participants;

  it("filters by partial id, arm and device", () => {
    expect(filterParticipants(people, { query: "CONFIRMATORY-0003", arm: "All", pointer: "All" })).toHaveLength(1);
    const picked = filterParticipants(people, { query: "", arm: "C", pointer: "touch" });
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.every((p) => p.arm === "C" && p.pointer === "touch")).toBe(true);
  });

  it("tallies one selection per decision and every adapted task", () => {
    const rows = surfaceBreakdown(dataset.log, "confirmatory");
    const sum = (k: "selected" | "tasks") => rows.reduce((s, r) => s + r[k], 0);
    expect(sum("selected")).toBe(36); // the partial participant still has a decision
    expect(sum("tasks")).toBe(36 * 3 - 1);
    expect(rows.every((r) => r.meanEase === null || (r.meanEase >= 1 && r.meanEase <= 7))).toBe(true);
  });

  it("builds the sample table from the same exclusions as the analysis", () => {
    const table = sampleTable(dataset.log, "confirmatory");
    const total = (k: "enrolled" | "included" | "repeatDevice" | "incomplete" | "offline") =>
      table.rows.reduce((s, r) => s + r[k], 0);
    expect([total("enrolled"), total("included"), total("repeatDevice"), total("incomplete"), total("offline")])
      .toEqual([36, 33, 1, 1, 1]);
    for (const r of table.rows) expect(r.byPointer.reduce((s, n) => s + n, 0)).toBe(r.included);
  });
});

describe("wording", () => {
  const contrast = (over: Partial<Contrast>) => ({ name: "C-B", difference: -0.2, pHolm: 0.01, ...over }) as Contrast;

  it("only claims a difference when the Holm-adjusted p allows it", () => {
    expect(verdict(contrast({})).text).toBe("AttuneUI faster than Placebo");
    expect(verdict(contrast({ difference: 0.2 })).tone).toBe("bad");
    expect(verdict(contrast({ pHolm: 0.2 })).text).toMatch(/null result/);
    expect(verdict(contrast({ difference: null })).text).toMatch(/Not testable/);
  });

  it("formats speed on the percent-faster scale", () => {
    expect(speedText(Math.log(0.8))).toBe("20.0% faster");
    expect(speedText(Math.log(1.1))).toBe("10.0% slower");
    expect(speedInterval([Math.log(0.5), Math.log(1.25)])).toBe("-25.0% to +50.0%");
    expect([pValue(0.0001), pValue(null)]).toEqual(["<0.001", "—"]);
  });

  it("never puts an unusual file name into a shell command", () => {
    expect(verifyCommand("attune-study-1a2b.json", "p.json")).toContain(" attune-study-1a2b.json ");
    for (const bad of ["a; rm -rf ~.json", "--policy.json", "x$(id).json", null]) {
      expect(verifyCommand(bad, "p.json")).toContain(" <export.json> ");
    }
  });

  it("explains the layout from what the session recorded", () => {
    expect(explain(newSession())[0]).toMatch(/No decision yet/);
    expect(describeFriction({ ...calm, dead: 2, thrash: 1 })).toBe("2 dead clicks, 1 scroll thrash");
    const probs = { baseline: 0.2, ergonomic: 0.1, disclosure: 0.1, shortcut: 0.6, guided: 0 };
    const session = {
      ...newSession("shortcut"), mode: "attune" as const, friction: calm,
      decision: { action: "shortcut" as const, propensity: 0.6, probs, eligible: [], context: [], seed: 1 },
    };
    expect(explain(session)[1]).toMatch(/highest probability \(60%\)/);
    expect(explain({ ...session, rendered: "baseline" })[2]).toMatch(/Static layout.*reverted/);
    expect(togglePin(togglePin(newSession())).overrides.pin).toBe(1);
    const looked = previewSurface({ ...session, active: { context: [], modality: "fine" } }, "guided");
    expect(looked).toMatchObject({ rendered: "guided", previous: "shortcut", active: null, decision: null });
    expect(explain(looked)).toEqual([expect.stringMatching(/by hand.*did not choose/)]);
  });
});
