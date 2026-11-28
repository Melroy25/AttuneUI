// /demo only: the manual refund-policy view, the quick-item area and three simple triggers.
// Nothing is stored apart from the activity log: each action is a tagged entry, and state is its replay.
import type { Activity } from "./activity";
import { CATALOG, type Product } from "./catalog";

export const TABS_RULE = { switches: 4, ms: 6000 };
export const SCROLL_RULE = { reversals: 4, ms: 15_000 };
export const DEAD_RULE = { taps: 2, ms: 3000 };

export type ExtraEvent = "policy:on" | "policy:off" | `quick:add:${string}` | `quick:remove:${string}`;
export interface Extras { policy: boolean; quick: string[] }

export const tagged = (change: string, event: ExtraEvent) => `${change} [x:${event}]`;

const TAG = /\[x:(?:policy:(on|off)|quick:(add|remove):(PRD-\d+))\]$/;

/** Replays what happened after the last Reset. Entries come from storage and the network: untrusted. */
export function replay(activity: Activity[]): Extras {
  const reset = Math.max(0, ...activity.filter((a) => a.trigger === "Pressed Reset").map((a) => a.at));
  let policy = false;
  let quick: string[] = [];
  for (const a of activity.filter((a) => a.at > reset).sort((a, b) => a.at - b.at)) {
    const [, view, action, id] = TAG.exec(a.change) ?? [];
    if (view) policy = view === "on";
    if (!id || !CATALOG.some((p) => p.id === id)) continue;
    quick = quick.filter((q) => q !== id);
    if (action === "add") quick.push(id);
  }
  return { policy, quick };
}

/** Keeps the times inside the window and adds this one. */
export const within = (times: number[], now: number, ms: number) => [...times.filter((t) => now - t <= ms), now];

export const rapidTabs = (times: number[]) => times.length >= TABS_RULE.switches;
export const excessiveScroll = (reversals: number[], now: number) =>
  reversals.filter((t) => now - t <= SCROLL_RULE.ms).length >= SCROLL_RULE.reversals;

/** Shoes first, then what goes with them. */
export const shoeIdeas = (): Product[] => {
  const shoes = CATALOG.filter((p) => /shoe/i.test(p.name));
  return [...shoes, ...CATALOG.filter((p) => p.category === "fashion" && !shoes.includes(p))].slice(0, 4);
};
