// /demo only: whole sections that grow by themselves after repeated clicks, with no question.
// State is a replay of tagged activity entries.
import type { Activity } from "./activity";
import type { Scales } from "./textSize";

export const ZONES = ["help:policy", "help:faq", "orders:policy"] as const;
export type Zone = (typeof ZONES)[number];
export type ZoneAction = "tap" | "undo";

export const ORDERS_TEXT = "order:"; // data-text-id prefix of the Orders page

export const zoneTag = (change: string, action: ZoneAction, zone: Zone) => `${change} [z:${action}:${zone}]`;

const TAG = /\[z:(tap|undo):([a-z]+:[a-z]+)\]$/;

const sinceReset = (activity: Activity[]) => {
  const reset = Math.max(0, ...activity.filter((a) => a.trigger === "Pressed Reset").map((a) => a.at));
  return activity.filter((a) => a.at > reset).sort((a, b) => a.at - b.at);
};

/** When each zone was clicked repeatedly, since the last Reset or Undo. Entries are untrusted. */
export function zoneTaps(activity: Activity[]): Record<Zone, number[]> {
  const taps: Record<Zone, number[]> = { "help:policy": [], "help:faq": [], "orders:policy": [] };
  for (const a of sinceReset(activity)) {
    const [, action, name] = TAG.exec(a.change) ?? [];
    const zone = ZONES.find((z) => z === name);
    if (!zone) continue;
    if (action === "tap") taps[zone].push(a.at);
    else taps[zone] = [];
  }
  return taps;
}

/** Big after a refresh that follows the interaction, or after the interaction a second time. */
export const isBig = (taps: number[], loadedAt: number) => taps.length >= 2 || taps.some((t) => t < loadedAt);

/** "Is that okay?" is asked about the first text that grows, and never again until Reset. */
export const isFirstRaise = (activity: Activity[]) =>
  sinceReset(activity).filter((a) => /^Font size of ".+" raised to/.test(a.change)).length <= 1;

export const withoutPrefix = (scales: Scales, prefix: string): Scales =>
  Object.fromEntries(Object.entries(scales).filter(([id]) => !id.startsWith(prefix)));
