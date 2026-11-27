// What /demo keeps per user: demo_users/{userId} in Firestore, cached in the browser. Never study data.
import { SHORTCUTS, newShortcuts, parseShortcuts, type ShortcutState } from "../bandit/shortcutBandit";
import { parsePreferences, type Locale, type Preferences } from "../attune-ui/preferences/rules";
import { ARM_IDS, type ArmId, type FrictionSummary } from "../attune-ui/types";
import type { Activity } from "./activity";
import { COUNTED } from "./aggregate";
import { keepCounts, parseComfort, type Comfort } from "./comfort";
import { NO_HABITS, parseHabits, type Habits } from "./habits";
import { parseLanguage } from "./language";
import { encodeMemory, parseMemory } from "./memory";

export type Totals = Record<(typeof COUNTED)[number], number>;
export interface CloudState {
  arm: ArmId;
  preferences: Preferences;
  shortcuts: ShortcutState; // promotions and the shortcut bandit's weights
  memory: string | null; // the layout bandit's weights, as encodeMemory writes them
  habits: Habits;
  friction: Totals; // only ever grows
  comfort: Comfort; // bigger tap targets and their before/after counts
  language: Locale | null; // picked by hand; null when never picked
}
export interface CloudRecord { id: string; updatedAt: string; state: CloudState }

export const USER_ID = /^(guest-[0-9a-f]{8}|[a-z0-9_]{1,40})$/;
export const GUEST_ID = /^guest-[0-9a-f]{8}$/;
export const SENT_ACTIVITY = 20; // entries per upload
export const frictionKey = (user: string | null) => `attune-friction:${user ?? "guest"}`;
export const syncKey = (user: string | null) => `attune-synced:${user ?? "guest"}`;
export const cursorKey = (user: string | null) => `attune-sent:${user ?? "guest"}`;

const totals = (value: (k: keyof Totals) => number) => Object.fromEntries(COUNTED.map((k) => [k, value(k)])) as Totals;

export function parseTotals(v: unknown): Totals {
  const from = (v ?? {}) as Partial<Record<keyof Totals, unknown>>;
  return totals((k) => (Number.isFinite(from[k]) && (from[k] as number) >= 0 ? (from[k] as number) : 0));
}

export const maxTotals = (a: Totals, b: Totals) => totals((k) => Math.max(a[k], b[k]));

/** Adds what is new since the last reading. A drained event buffer reads lower and adds nothing. */
export const addNew = (stored: Totals, last: Totals, now: FrictionSummary | Totals) =>
  totals((k) => stored[k] + Math.max(0, now[k] - last[k]));

/** Trust boundary for uploads, documents and the browser cache. */
export function parseState(v: unknown): CloudState | null {
  const s = v as Partial<Record<keyof CloudState, unknown>> | null;
  const arm = ARM_IDS.find((a) => a === s?.arm);
  const preferences = parsePreferences(s?.preferences);
  if (!s || !arm || !preferences) return null;
  const memory = typeof s.memory === "string" ? parseMemory(s.memory) : null;
  const saved = parseShortcuts(JSON.stringify(s.shortcuts ?? null));
  const promoted = Object.fromEntries(SHORTCUTS.flatMap((k) => (saved.promoted[k] ? [[k, saved.promoted[k]]] : [])));
  return {
    arm, preferences,
    shortcuts: { ...newShortcuts(), ...saved, promoted },
    memory: memory && encodeMemory(memory),
    habits: s.habits ? parseHabits(JSON.stringify(s.habits)) : NO_HABITS,
    friction: parseTotals(s.friction),
    comfort: parseComfort(s.comfort),
    language: parseLanguage(s.language),
  };
}

/** Newest first, each entry once. */
export const mergeActivity = (...lists: Activity[][]): Activity[] =>
  [...new Map(lists.flat().map((a) => [`${a.at}|${a.trigger}|${a.change}`, a])).values()].sort((a, b) => b.at - a.at);

/** Hover and open counts. */
export const counts = (h: Habits) => ({
  supportHovers: h.supportHovers,
  supportClicks: h.supportUses,
  orderOpens: Object.values(h.opens).reduce((s, n) => s + n, 0),
  wishlist: h.wishUses,
});

/** The server's copy wins; this browser's cache adds users and counts not uploaded yet. */
export function mergeUsers(remote: CloudRecord[], local: CloudRecord[]): CloudRecord[] {
  const byId = new Map(remote.map((r) => [r.id, r]));
  for (const mine of local) {
    const saved = byId.get(mine.id);
    if (!saved) {
      byId.set(mine.id, mine);
      continue;
    }
    const more = counts(mine.state.habits);
    const less = counts(saved.state.habits);
    const ahead = (Object.keys(more) as (keyof typeof more)[]).some((k) => more[k] > less[k]);
    const habits = ahead ? mine.state.habits : saved.state.habits;
    const friction = maxTotals(saved.state.friction, mine.state.friction);
    const comfort = keepCounts(mine.state.comfort, saved.state.comfort);
    byId.set(mine.id, { ...saved, state: { ...saved.state, habits, friction, comfort } });
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
