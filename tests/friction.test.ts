import { describe, expect, it } from "vitest";
import { buildContext, modalityOf } from "../lib/attune-ui/telemetry/context";
import { summarizeFriction } from "../lib/attune-ui/telemetry/friction";
import type { InteractionEvent } from "../lib/attune-ui/types";

const down = (t: number, over: object = {}): InteractionEvent => ({
  type: "down", t, x: 100, y: 100, targetId: "btn", interactive: true, nearTargetPx: 0, ...over,
});

describe("friction", () => {
  it("counts one rage cluster for 5 fast taps, none when slow or far apart", () => {
    expect(summarizeFriction([0, 100, 200, 300, 400].map((t) => down(t)), "coarse").rage).toBe(1);
    expect(summarizeFriction([0, 600, 1200].map((t) => down(t)), "coarse").rage).toBe(0);
    expect(
      summarizeFriction([down(0), down(100, { x: 200 }), down(200, { x: 300 })], "fine").rage,
    ).toBe(0);
  });

  it("separates a near miss from a dead click and ignores blank background", () => {
    const s = summarizeFriction(
      [
        down(0, { interactive: false, nearTargetPx: 10 }),
        down(2000, { interactive: false, nearTargetPx: 80, targetId: "badge" }),
        down(4000, { interactive: false, nearTargetPx: null, targetId: null }),
      ],
      "fine",
    );
    expect([s.miss, s.dead]).toEqual([1, 1]);
  });

  it("ignores hover on touch", () => {
    const events: InteractionEvent[] = [{ type: "hover", t: 0, targetId: "f", durationMs: 2000 }];
    expect(summarizeFriction(events, "fine").dwell).toBe(1);
    expect(summarizeFriction(events, "coarse").dwell).toBe(0);
  });

  it("detects scroll thrash and A-B-A backtracking", () => {
    const scroll: InteractionEvent[] = [0, 100, 20, 120, 40, 140].map((y, i) => ({
      type: "scroll", t: i * 100, y,
    }));
    expect(summarizeFriction(scroll, "coarse").thrash).toBe(1);
    const views: InteractionEvent[] = ["list", "detail", "list"].map((view, t) => ({
      type: "view", t, view,
    }));
    expect(summarizeFriction(views, "coarse").backtrack).toBe(1);
  });

  it("builds a bounded context and maps pen to the fine model", () => {
    const friction = { rage: 99, dead: 0, miss: 1, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1 };
    const x = buildContext({ friction, viewportWidth: 390, priorSessions: 50 });
    expect(x).toEqual([1, 1, 1, 0, 1, 1 / 3, 0]);
    expect(modalityOf("pen")).toBe("fine");
    expect(modalityOf("touch")).toBe("coarse");
  });
});
