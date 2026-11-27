import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES, EMPTY_SIGNALS, derivePreferences, hasKannada, parsePreferences,
} from "../lib/attune-ui/preferences/rules";
import { SURFACES } from "../lib/attune-ui/surface/catalog";
import { describeChanges } from "../lib/attune-ui/surface/diff";
import { distanceToRect } from "../lib/attune-ui/telemetry/capture";
import { decodeUi, encodeUi } from "../lib/demo/uiState";
import { ORDERS } from "../lib/study/data";
import { NO_FILTERS, TASKS, applyFilters, isComplete } from "../lib/study/tasks";
import { ARM_IDS } from "../lib/attune-ui/types";

describe("preference rules", () => {
  const derive = (s: Partial<typeof EMPTY_SIGNALS>) =>
    derivePreferences(DEFAULT_PREFERENCES, { ...EMPTY_SIGNALS, ...s }, 5000).preferences;

  it("needs repeated evidence", () => {
    expect(derive({ kannada: 1, photoSearches: 1, longestReadMs: 4000 })).toEqual(DEFAULT_PREFERENCES);
    expect(derive({ kannada: 2, english: 2 }).locale).toBe("en");
    expect(derive({ photoSearches: 2, textSearches: 3 }).searchFirst).toBe("text");
  });

  it("applies each rule independently", () => {
    expect(derive({ kannada: 2 }).locale).toBe("kn");
    expect(derive({ photoSearches: 2 }).searchFirst).toBe("photo");
    expect(derive({ longestReadMs: 5000 })).toMatchObject({ textScale: "large", structure: "sections" });
    expect(hasKannada("ಆರ್ಡರ್")).toBe(true);
    expect(hasKannada("ORD-4821")).toBe(false);
  });

  it("rejects invalid cookie preferences", () => {
    expect(parsePreferences({ ...DEFAULT_PREFERENCES, locale: "xx" })).toBeNull();
    expect(parsePreferences(null)).toBeNull();
  });
});

describe("ui cookie", () => {
  it("round-trips encoded and decoded forms", () => {
    const ui = { arm: "shortcut" as const, preferences: { ...DEFAULT_PREFERENCES, locale: "kn" as const } };
    expect(decodeUi(encodeUi(ui))).toEqual(ui);
    expect(decodeUi(JSON.stringify(ui))).toEqual(ui);
  });

  it("falls back safely and uses Accept-Language only without a valid cookie", () => {
    for (const bad of [undefined, "", "{", "%", '{"arm":"evil"}', "x".repeat(1000)]) {
      expect(decodeUi(bad)).toEqual({ arm: "baseline", preferences: DEFAULT_PREFERENCES });
    }
    expect(decodeUi(undefined, "kn-IN,kn;q=0.9").preferences.locale).toBe("kn");
    expect(decodeUi(undefined, "en-IN,kn;q=0.5").preferences.locale).toBe("en");
  });
});

describe("tasks", () => {
  it("has exactly one reachable answer set per variant", () => {
    for (const variant of ["A", "B"] as const) {
      const [find, filter, refund] = TASKS[variant];
      if (find.id !== "findDelayed" || filter.id !== "filterRefunds" || refund.id !== "partialRefund") {
        throw new Error("task order changed");
      }
      expect(ORDERS.find((o) => o.id === find.orderId)?.status).toBe("delayed");
      expect(ORDERS.find((o) => o.id === refund.orderId)!.amount).toBeGreaterThan(refund.amount);
      const filters = { ...NO_FILTERS, status: filter.status, priority: filter.priority };
      expect(applyFilters(ORDERS, filters).length).toBeGreaterThan(0);
      expect(isComplete(filter, { type: "filter", filters })).toBe(true);
      expect(isComplete(filter, { type: "filter", filters: NO_FILTERS })).toBe(false);
      expect(isComplete(refund, { type: "refund", orderId: refund.orderId, amount: refund.amount + 1 })).toBe(false);
      expect(isComplete(find, { type: "open", orderId: find.orderId })).toBe(true);
    }
  });
});

describe("surface helpers", () => {
  it("measures distance to a rectangle", () => {
    const r = { left: 0, top: 0, right: 10, bottom: 10 };
    expect(distanceToRect(5, 5, r)).toBe(0);
    expect(distanceToRect(13, 14, r)).toBe(5);
  });

  it("describes every non-static arm as a visible change", () => {
    for (const arm of ARM_IDS) {
      const changes = describeChanges(SURFACES.baseline, SURFACES[arm]);
      expect(changes.length > 0).toBe(arm !== "baseline");
    }
  });
});
