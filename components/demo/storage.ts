import { parseShortcuts } from "@/lib/bandit/shortcutBandit";
import { MAX_ACTIVITY, activityKey, parseActivity } from "@/lib/demo/activity";
import { behaviourKey, parseBehaviour } from "@/lib/demo/behaviour";
import { syncKey } from "@/lib/demo/cloud";
import { archive, historyKey, parsePast, type PastSession } from "@/lib/demo/history";
import { comfortKey, parseComfort } from "@/lib/demo/comfort";
import { languageKey, parseLanguage } from "@/lib/demo/language";
import { textKey } from "@/lib/demo/textSize";
import { parseUse, useKey } from "@/lib/demo/frontUse";
import { encodeUi, type UiState } from "@/lib/demo/uiState";
import { DEFAULT_PREFERENCES, type Locale } from "@/lib/attune-ui/preferences/rules";
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

// Reset adds a session and never drops one; this only bounds what a damaged store can load.
const MAX_STORED = 500;
export const readPast = (user: string | null): PastSession[] => parsePast(read(historyKey(user)) ?? [], MAX_STORED) ?? [];

/** Reset changes the screen only: default layout and shortcuts. Logs, counts, totals and weights stay. */
export function resetDemo(user: string | null, ui: UiState): UiState {
  // The default screen, in the language the user has now.
  const next: UiState = { arm: "baseline", preferences: { ...DEFAULT_PREFERENCES, locale: ui.preferences.locale } };
  try {
    const bandit = parseShortcuts(localStorage.getItem(shortcutsKey(user)));
    const past = readPast(user);
    const activity = parseActivity(read(activityKey(user)) ?? [], MAX_ACTIVITY) ?? [];
    const done: PastSession = {
      endedAt: Date.now(),
      layout: ui.arm,
      shortcuts: Object.keys(bandit.promoted) as PastSession["shortcuts"],
      changes: activity.filter((a) => a.at > (past[0]?.endedAt ?? 0)).slice(0, 20),
    };
    // Saved first: if this fails, nothing below runs.
    if (archive(past, done) !== past) localStorage.setItem(historyKey(user), JSON.stringify([done, ...past]));
    const entry = { at: done.endedAt, trigger: "Pressed Reset", change: "Screen back to the Static layout and default shortcuts" };
    localStorage.setItem(activityKey(user), JSON.stringify([entry, ...activity].slice(0, MAX_ACTIVITY)));
    localStorage.setItem(shortcutsKey(user), JSON.stringify({ ...bandit, promoted: {} }));
    localStorage.setItem(uiKey(user), encodeUi(next));
    const comfort = parseComfort(read(comfortKey(user)));
    localStorage.setItem(comfortKey(user), JSON.stringify({ ...comfort, on: false, reverted: false, targets: [] }));
    const behaviour = parseBehaviour(read(behaviourKey(user)));
    localStorage.setItem(behaviourKey(user), JSON.stringify({ ...behaviour, pinned: null }));
    localStorage.removeItem(textKey(user)); // every text back to normal
    const use = parseUse(read(useKey(user)));
    localStorage.setItem(useKey(user), JSON.stringify({ ...use, front: [] }));
    localStorage.setItem(syncKey(user), "local"); // the saved copy must not undo this
    sessionStorage.removeItem(readingKey);
  } catch {
    // storage blocked or full: only the layout resets
  }
  return next;
}

export const readLanguage = (user: string | null): Locale | null => {
  try {
    return parseLanguage(localStorage.getItem(languageKey(user)));
  } catch {
    return null;
  }
};

export const saveLanguage = (user: string | null, locale: Locale) => {
  try {
    localStorage.setItem(languageKey(user), locale);
  } catch {
    // storage blocked: the cookie still holds the language
  }
};
