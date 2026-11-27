import { describe, expect, it } from "vitest";
import {
  CATALOG, CATEGORIES, cartSummary, refundQueue, searchCatalog, summarise, withQuantity,
} from "../lib/demo/catalog";
import { ORDERS } from "../lib/study/data";

describe("demo catalogue", () => {
  it("has unique products and filters by name and category", () => {
    expect(new Set(CATALOG.map((p) => p.id)).size).toBe(CATALOG.length);
    expect(searchCatalog(" KETTLE ", "").map((p) => p.id)).toEqual(["PRD-103"]);
    expect(searchCatalog("kettle", "fashion")).toEqual([]);
    expect(searchCatalog("", "home").every((p) => p.category === "home")).toBe(true);
  });

  it("narrows by preset", () => {
    expect(searchCatalog("", "", "underFive").every((p) => p.price <= 500)).toBe(true);
    expect(searchCatalog("", "", "halfOff").every((p) => p.off >= 50)).toBe(true);
    expect(searchCatalog("", "", "halfOff").length).toBeGreaterThan(0);
  });

  it("keeps the cart within stock and totals it", () => {
    expect(CATEGORIES.every((c) => searchCatalog("", c).length > 0)).toBe(true);
    let cart = withQuantity({}, "PRD-105", 99); // only 3 in stock
    cart = withQuantity(cart, "PRD-103", 2); // out of stock
    cart = withQuantity(cart, "nope", 1);
    expect(cartSummary(cart)).toMatchObject({ count: 3, total: 3 * 4599 });
    expect(withQuantity(cart, "PRD-105", 0)).toEqual({});
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
