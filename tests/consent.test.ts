import { describe, expect, it } from "vitest";
import type { Activity } from "../lib/demo/activity";
import { approved, consentTag } from "../lib/demo/consent";

const said = (at: number, yes: boolean): Activity => ({ at, trigger: "t", change: consentTag("c", yes) });

describe("learn-once confirmation", () => {
  it("applies nothing by itself until a Yes, and a No saves no approval", () => {
    expect(approved([])).toBe(false);
    expect(approved([said(1, false)])).toBe(false);
  });

  it("stays approved after the first Yes, whatever follows, until Reset", () => {
    const log = [said(1, false), said(2, true), { at: 3, trigger: "Pressed Undo", change: "Back to normal" }];
    expect(approved(log)).toBe(true);
    const reset = { at: 4, trigger: "Pressed Reset", change: "Screen back" };
    expect(approved([...log, reset])).toBe(false);
    expect(approved([...log, reset, said(5, true)])).toBe(true);
  });

  it("ignores the tag unless it ends the entry", () => {
    expect(approved([{ at: 1, trigger: "t", change: "[c:yes] quoted" }])).toBe(false);
  });
});
