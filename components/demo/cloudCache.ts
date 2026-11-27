// The browser's copy of a user's saved state: read for uploads, written when the server's is newer.
import { newShortcuts } from "@/lib/bandit/shortcutBandit";
import { MAX_ACTIVITY, activityKey, parseActivity, type Activity } from "@/lib/demo/activity";
import {
  SENT_ACTIVITY, cursorKey, frictionKey, maxTotals, parseState, parseTotals, type CloudState,
} from "@/lib/demo/cloud";
import { habitsKey } from "@/lib/demo/habits";
import { memoryKey } from "@/lib/demo/memory";
import { decodeUi, encodeUi } from "@/lib/demo/uiState";
import { shortcutsKey, uiKey } from "./storage";

const GUEST_KEY = "attune-guest-id";

export const readJsonItem = (key: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
};

/** An anonymous visitor gets one random ID per browser. */
export function guestId(): string {
  const saved = localStorage.getItem(GUEST_KEY);
  if (saved) return saved;
  const id = `guest-${crypto.randomUUID().slice(0, 8)}`;
  localStorage.setItem(GUEST_KEY, id);
  return id;
}

/** Null until the store has put a layout on screen. */
export function readLocal(user: string | null): CloudState | null {
  const ui = localStorage.getItem(uiKey(user));
  if (!ui) return null;
  return parseState({
    ...decodeUi(ui),
    shortcuts: readJsonItem(shortcutsKey(user)) ?? newShortcuts(),
    memory: localStorage.getItem(memoryKey(user)),
    habits: readJsonItem(habitsKey(user)),
    friction: readJsonItem(frictionKey(user)),
  });
}

export const readActivity = (user: string | null): Activity[] =>
  parseActivity(readJsonItem(activityKey(user)) ?? [], MAX_ACTIVITY) ?? [];

/** Oldest entries not uploaded yet; the one at the cursor is repeated, which is harmless. */
export function pendingActivity(user: string | null): Activity[] {
  const cursor = Number(localStorage.getItem(cursorKey(user)) ?? 0);
  return readActivity(user).filter((a) => a.at >= cursor).reverse().slice(0, SENT_ACTIVITY);
}

export function writeLocal(user: string | null, s: CloudState) {
  localStorage.setItem(uiKey(user), encodeUi({ arm: s.arm, preferences: s.preferences }));
  localStorage.setItem(shortcutsKey(user), JSON.stringify(s.shortcuts));
  localStorage.setItem(habitsKey(user), JSON.stringify(s.habits));
  if (s.memory) localStorage.setItem(memoryKey(user), s.memory);
  const friction = maxTotals(parseTotals(readJsonItem(frictionKey(user))), s.friction);
  localStorage.setItem(frictionKey(user), JSON.stringify(friction));
}
