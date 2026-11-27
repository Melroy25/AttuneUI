import { describe, expect, it } from "vitest";
import { simulatorPrior } from "../lib/demo/prior";
import { fastForward, finishBlock, median, newSession, undo, type BlockInput } from "../lib/demo/session";
import { decideResponse, parseDecideRequest, policyDocument } from "../lib/delivery/contract";
import type { InteractionEvent } from "../lib/attune-ui/types";

const rage: InteractionEvent[] = [0, 100, 200].map((t) => ({
  type: "down", t, x: 5, y: 5, targetId: "b", interactive: false, nearTargetPx: 100,
}));
const input = (over: Partial<BlockInput> = {}): BlockInput => ({
  mode: "attune", events: rage, outcomes: [{ success: true, timeMs: 12000 }], pointer: "touch",
  viewportWidth: 390, seed: 1, prior: simulatorPrior(), now: () => performance.now(), ...over,
});

describe("demo session", () => {
  it("decides at the first boundary without learning, then learns from the next block", () => {
    const first = finishBlock(newSession(), input());
    expect(first.liveUpdates).toBe(0);
    expect(first.rendered).toBe(first.decision!.action);
    const second = finishBlock(first, input({ seed: 2 }));
    expect(second.liveUpdates).toBe(1);
    expect(second.models!.coarse[first.rendered].n).toBe(
      simulatorPrior().models.coarse[first.rendered].n + 1,
    );
    expect(second.models!.fine).toBe(simulatorPrior().models.fine);
  });

  it("static mode never changes the layout", () => {
    const s = finishBlock(newSession(), input({ mode: "static" }));
    expect([s.rendered, s.decision]).toEqual(["baseline", null]);
  });

  it("pin keeps the layout; undo restores the previous one", () => {
    const pinned = finishBlock({ ...newSession("guided"), pinned: true }, input());
    expect(pinned.rendered).toBe("guided");
    const changed = { ...newSession("shortcut"), previous: "baseline" as const };
    expect(undo(changed)).toMatchObject({ rendered: "baseline", previous: null });
    expect(undo(newSession()).rendered).toBe("baseline");
  });

  it("fast-forward counts simulated updates separately", () => {
    const s = fastForward(newSession(), 10, simulatorPrior().models);
    expect([s.simulatedUpdates, s.liveUpdates]).toEqual([10, 0]);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([])).toBeNull();
  });

  it("measures decision latency (printed, not claimed)", () => {
    let s = newSession();
    for (let i = 0; i < 50; i++) s = finishBlock(s, input({ seed: i, outcomes: [] }));
    console.log(`median decide() latency in Node: ${median(s.decisionMs)!.toFixed(3)} ms (n=50)`);
    expect(median(s.decisionMs)!).toBeLessThan(50); // sanity bound only
  });
});

describe("delivery API contract", () => {
  const good = {
    pointer: "touch", viewportWidth: 390, priorSessions: 0, seed: 7,
    friction: { rage: 1, dead: 0, miss: 2, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1 },
  };

  it("rejects malformed requests", () => {
    for (const bad of [
      null, "x", {}, { ...good, pointer: "foot" }, { ...good, seed: 1.5 },
      { ...good, friction: { rage: 1 } }, { ...good, viewportWidth: -1 },
      { ...good, friction: { ...good.friction, rage: "9" } },
    ]) expect(parseDecideRequest(bad)).toBeNull();
  });

  it("returns a labelled, reproducible decision", () => {
    const a = decideResponse(parseDecideRequest(good)!, () => 0);
    expect(a).toEqual(decideResponse(parseDecideRequest(good)!, () => 0));
    expect(a.surface.arm).toBe(a.decision.action);
    expect(a.provenance).toContain("SIMULATED");
    expect(policyDocument().policyVersion).toBe(a.policyVersion);
  });
});
