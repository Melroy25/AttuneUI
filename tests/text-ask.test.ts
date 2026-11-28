import { describe, expect, it } from "vitest";
import { newestText, stillAsking } from "../lib/demo/textAsk";
import { enlarge, parseScales, undoLast } from "../lib/demo/textSize";

describe("\"Is that okay?\" on a bigger text", () => {
  it("asks about the text that grew last, and again after a reload and another step", () => {
    const first = enlarge(enlarge({}, "cart:total")!, "order:status")!;
    expect(newestText(first)).toEqual({ id: "order:status", size: 112.5 });
    const reloaded = parseScales(JSON.stringify(first));
    const again = enlarge(reloaded, "cart:total")!;
    expect(newestText(again)).toEqual({ id: "cart:total", size: 125 });
    expect(stillAsking(newestText(again), again)).toBe(true);
  });

  it("closes when that size is gone, even if another text has the same size", () => {
    const two = enlarge(enlarge({}, "cart:total")!, "order:status")!;
    const asked = newestText(two);
    expect(stillAsking(asked, undoLast(two)!.scales)).toBe(false);
    expect(stillAsking(asked, {})).toBe(false); // Reset
    expect(stillAsking(null, two)).toBe(false);
  });
});
