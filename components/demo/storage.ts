import { parseShortcuts } from "@/lib/bandit/shortcutBandit";
import { MAX_ACTIVITY, activityKey, parseActivity } from "@/lib/demo/activity";
import { habitsKey } from "@/lib/demo/habits";
import { MAX_PAST, archive, historyKey, parsePast, type PastSession } from "@/lib/demo/history";
import type { ArmId } from "@/lib/attune-ui/types";
import { readingKey } from "./useReading";

export const shortcutsKey = (user: string | null) => `attune-shortcuts:${user ?? "guest"}`;
export const uiKey = (user: string | null) => `attune-ui:${user ?? "guest"}`;

const read = (key: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
};

export const readPast = (user: string | null): PastSession[] => parsePast(read(historyKey(user)) ?? [], MAX_PAST) ?? [];

/** Reset: archive this session, then clear what is on screen. Learned weights and history stay. */
export function resetDemo(user: string | null, layout: ArmId) {
  try {
    const bandit = parseShortcuts(localStorage.getItem(shortcutsKey(user)));
    const past = archive(readPast(user), {
      endedAt: Date.now(),
      layout,
      shortcuts: Object.keys(bandit.promoted) as PastSession["shortcuts"],
      changes: parseActivity(read(activityKey(user)) ?? [], MAX_ACTIVITY) ?? [],
    });
    // Saved first: if this fails, nothing below runs and nothing is lost.
    localStorage.setItem(historyKey(user), JSON.stringify(past));
    localStorage.setItem(shortcutsKey(user), JSON.stringify({ ...bandit, promoted: {} }));
    for (const key of [habitsKey, activityKey, uiKey]) localStorage.removeItem(key(user));
    sessionStorage.removeItem(readingKey);
  } catch {
    // storage blocked or full: only the layout resets
  }
}
