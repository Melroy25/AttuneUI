import { activityKey } from "@/lib/demo/activity";
import { habitsKey } from "@/lib/demo/habits";
import { memoryKey } from "@/lib/demo/memory";
import { readingKey } from "./useReading";

export const shortcutsKey = (user: string | null) => `attune-shortcuts:${user ?? "guest"}`;

/** Reset: everything the demo remembers about this account in this browser. */
export function forgetDemo(user: string | null) {
  try {
    for (const key of [memoryKey, habitsKey, activityKey, shortcutsKey]) localStorage.removeItem(key(user));
    sessionStorage.removeItem(readingKey);
  } catch {
    // nothing was saved
  }
}
