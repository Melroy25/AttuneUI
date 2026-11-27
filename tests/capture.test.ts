import { afterEach, describe, expect, it, vi } from "vitest";
import { startCapture } from "../lib/attune-ui/telemetry/capture";
import { summarizeFriction } from "../lib/attune-ui/telemetry/friction";

/** Just enough DOM for the listeners: no browser dependency. */
class FakeElement {
  constructor(private marks: Record<string, string>) {}
  closest(selector: string) {
    const hit = Object.keys(this.marks).find((attr) => selector.includes(`[${attr}]`));
    return hit ? { getAttribute: () => this.marks[hit] } : null;
  }
}

function setup() {
  const listeners = new Map<string, (e: object) => void>();
  const root = {
    addEventListener: (type: string, fn: (e: object) => void) => listeners.set(type, fn),
    querySelectorAll: () => [],
  };
  vi.stubGlobal("Element", FakeElement);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("window", { addEventListener: () => {}, scrollY: 0 });
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const fire = (type: string, marks: Record<string, string>) =>
    listeners.get(type)!({ pointerType: "mouse", target: new FakeElement(marks), clientX: 0, clientY: 0 });
  return {
    capture: startCapture(root as unknown as HTMLElement),
    fire,
    wait: (ms: number) => { now += ms; },
  };
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("capture", () => {
  it("keeps a long hover whole across refreshes", () => {
    const { capture, fire, wait } = setup();
    fire("pointerover", { "data-attune-id": "badge-1" });
    wait(1000);
    expect(summarizeFriction(capture.peek(), "fine").dwell).toBe(0);
    wait(1000);
    expect(summarizeFriction(capture.peek(), "fine").dwell).toBe(1);
    expect(summarizeFriction(capture.drain(), "fine").dwell).toBe(1);
    expect(capture.drain()).toEqual([]);
  });

  it("ignores taps on app chrome", () => {
    const { capture, fire } = setup();
    fire("pointerdown", { "data-attune-ignore": "" });
    fire("pointerup", {});
    expect(capture.peek()).toEqual([]);
    fire("pointerdown", { "data-attune-id": "badge-1" });
    fire("pointerup", {});
    expect(capture.peek()).toHaveLength(1);
  });
});
