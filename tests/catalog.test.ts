import { describe, expect, it } from "vitest";
import { CATALOG, refundQueue, searchCatalog, summarise } from "../lib/demo/catalog";
import { ORDERS } from "../lib/study/data";

describe("demo catalogue", () => {
  it("has unique products and filters by name and category", () => {
    expect(new Set(CATALOG.map((p) => p.id)).size).toBe(CATALOG.length);
    expect(searchCatalog(" KETTLE ", "").map((p) => p.id)).toEqual(["PRD-103"]);
    expect(searchCatalog("kettle", "fashion")).toEqual([]);
    expect(searchCatalog("", "home").every((p) => p.category === "home")).toBe(true);
  });

  it("derives returns and report totals from the orders", () => {
    expect(refundQueue().every((o) => o.status === "refund_requested")).toBe(true);
    const sum = summarise();
    expect(sum.orders).toBe(ORDERS.length);
    expect(sum.value).toBe(ORDERS.reduce((s, o) => s + o.amount, 0));
    for (const rows of [sum.byStatus, sum.byRegion, sum.byPayment]) {
      expect(rows.reduce((s, [, n]) => s + n, 0)).toBe(ORDERS.length);
    }
  });
});
