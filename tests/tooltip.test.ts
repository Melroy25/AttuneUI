import { describe, expect, it } from "vitest";
import { placeTooltip } from "../lib/demo/tooltip";

describe("tooltip position", () => {
  const tip = { width: 100, height: 24 };

  it("sits above, centred", () => {
    expect(placeTooltip({ top: 100, bottom: 144, left: 200, width: 40 }, tip, 800)).toEqual({ top: 70, left: 170 });
  });

  it("drops below at the top edge and stays inside the sides", () => {
    expect(placeTooltip({ top: 4, bottom: 48, left: 0, width: 40 }, tip, 375)).toEqual({ top: 54, left: 8 });
    expect(placeTooltip({ top: 100, bottom: 144, left: 340, width: 35 }, tip, 375).left).toBe(267);
  });
});
