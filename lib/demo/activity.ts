// What changed on /demo and why, in plain words, for the admin Activity card.
import type { ArmId, FrictionSummary, InteractionEvent } from "../attune-ui/types";
import { SURFACE_NAMES, describeFriction } from "./explain";
import { REPEAT, similarTo, type Habits } from "./habits";

export interface Change { trigger: string; change: string }
export interface Activity extends Change { at: number } // ms since epoch

export const MAX_ACTIVITY = 20;
export const activityKey = (user: string | null) => `attune-activity:${user ?? "guest"}`;

const APPLIED: Record<ArmId, string> = {
  baseline: "removed the extra aids",
  ergonomic: "bigger buttons, tabs, categories and search",
  disclosure: "preset filter buttons shown, extra shelves and charts folded",
  shortcut: "shortcut bar with Refund, + Add buttons, clickable refund labels",
  guided: "a tip on each page",
};
export const layoutChange = (arm: ArmId) => `Switched to ${SURFACE_NAMES[arm]}: ${APPLIED[arm]}`;

const PARTS: Record<string, string> = {
  badge: "a status badge", thumb: "a picture", card: "an order card", tile: "a report tile", bar: "a report chart",
  stock: "a stock label", meta: "order details", buy: "a disabled Add to cart", cart: "a cart item",
  return: "a return card", banner: "a banner",
};

/** The struggles of a block, and where most of the ineffective taps landed. */
export function struggle(friction: FrictionSummary, events: InteractionEvent[]): string {
  const hits = new Map<string, number>();
  for (const e of events) {
    if (e.type !== "down" || e.interactive || !e.targetId) continue;
    const part = PARTS[e.targetId.split("-")[0]];
    if (part) hits.set(part, (hits.get(part) ?? 0) + 1);
  }
  const top = [...hits].sort((a, b) => b[1] - a[1])[0];
  return describeFriction(friction) + (top && friction.dead + friction.rage > 0 ? `, mostly on ${top[0]}` : "");
}

/** Preference rules already say "evidence -> change". */
export function fromReason(reason: string): Change {
  const [trigger, change = reason] = reason.split(" -> ");
  return { trigger, change };
}

/** Earlier fixed-count rule, kept for its test. The store now asks lib/bandit/shortcutBandit. */
export function habitChanges(before: Habits, after: Habits): Change[] {
  const out: Change[] = [];
  if (before.wishUses < REPEAT && after.wishUses >= REPEAT) {
    out.push({ trigger: `Pressed Wishlist ${after.wishUses}×`, change: "Promoted the Wishlist button to order cards" });
  }
  const had = similarTo(before);
  const opened = Object.keys(after.opens).find((id) => after.opens[id] !== before.opens[id]);
  for (const p of similarTo(after).filter((p) => !had.includes(p))) {
    out.push({ trigger: `Opened ${opened} ${REPEAT}×`, change: `Added a "Search similar to ${p.name}" card` });
  }
  if (before.supportUses < REPEAT && after.supportUses >= REPEAT) {
    out.push({ trigger: `Asked for support ${after.supportUses}×`, change: "Added a Customer Support button to the header" });
  }
  return out;
}

/** Checks entries from storage or the network; null if anything does not fit. */
export function parseActivity(v: unknown, max: number): Activity[] | null {
  const text = (x: unknown) => typeof x === "string" && x.length <= 200;
  if (!Array.isArray(v) || v.length > max) return null;
  const ok = v.every((e: Partial<Activity> | null) => !!e && Number.isFinite(e.at) && text(e.trigger) && text(e.change));
  return ok ? (v as Activity[]).map(({ at, trigger, change }) => ({ at, trigger, change })) : null;
}
