import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "../lib/attune-ui/preferences/rules";
import { CATALOG } from "../lib/demo/catalog";
import { parseState } from "../lib/demo/cloud";
import { NO_COMFORT, NO_RECENT, isSmall, keepCounts, recordTap, revert, type Tap } from "../lib/demo/comfort";
import { holdLanguage } from "../lib/demo/language";
import { SPECS, promptFor } from "../lib/demo/quick";

const miss = (t: number, over: Partial<Tap> = {}): Tap =>
  ({ t, x: t / 10, y: 0, control: null, distance: 10, small: true, ...over });
const run = (taps: Tap[], from = NO_COMFORT, canAdapt = true) => taps.reduce(
  (s, tap) => recordTap(s.state, s.recent, tap, canAdapt),
  { state: from, recent: NO_RECENT, reason: null as string | null });

describe("bigger tap targets", () => {
  it("switches on after repeated problems on small targets only", () => {
    expect(isSmall(60, 16, 40)).toBe(true);
    expect(isSmall(48, 48, 12)).toBe(false);
    expect(run([miss(0)]).state.on).toBe(false);
    expect(run([miss(0), miss(2000)]).state.on).toBe(true);
    expect(run([miss(0), miss(2000, { small: false })]).state.on).toBe(false);
    expect(run([miss(0), miss(2000)], NO_COMFORT, false).state.on).toBe(false);
  });

  it("counts rage and accidental taps, and keeps before and after apart", () => {
    const quick = [0, 100, 200].map((t) => miss(t, { control: "a", distance: 0, x: 0 }));
    expect(run(quick).state.before).toEqual({ taps: 3, misses: 0, rage: 1, nearby: 0 });
    const slip = [miss(0, { control: "a", x: 0 }), miss(900, { control: "b", x: 20 })];
    expect(run(slip).state.before.nearby).toBe(1);
    const on = run([miss(0), miss(2000), miss(4000)]).state;
    expect([on.before.misses, on.after.misses]).toEqual([2, 1]);
  });

  it("stays off after Undo and never loses counts", () => {
    const undone = revert(run([miss(0), miss(2000)]).state);
    expect(run([miss(9000), miss(11000), miss(13000)], undone).state.on).toBe(false);
    expect(keepCounts(undone, NO_COMFORT).before.misses).toBe(2);
  });
});

describe("chosen language and shortcuts", () => {
  it("is not changed by a rule", () => {
    const rule = { preferences: { ...DEFAULT_PREFERENCES, locale: "kn" as const }, reasons: ["2 Kannada interactions -> Kannada by default"] };
    expect(holdLanguage(rule, "en")).toEqual({ preferences: DEFAULT_PREFERENCES, reasons: [] });
    expect(holdLanguage(rule, null)).toBe(rule);
    const state = { arm: "baseline", preferences: DEFAULT_PREFERENCES };
    expect(parseState({ ...state, language: "kn" })!.language).toBe("kn");
    expect(parseState({ ...state, language: "fr" })!.language).toBeNull();
  });

  it("offers a shortcut only for known areas, with a spec for every product", () => {
    expect(promptFor("location")?.prompt).toEqual({ kind: "location" });
    expect(promptFor(`product:${CATALOG[0].id}`)?.product).toBe(CATALOG[0]);
    expect(promptFor("product:nope")).toBeNull();
    expect(CATALOG.every((p) => SPECS[p.id])).toBe(true);
    expect(Object.keys(SPECS)).toHaveLength(CATALOG.length);
  });
});
