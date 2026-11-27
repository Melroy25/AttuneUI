// Rule-based personal preferences. Deliberately separate from the bandit: nothing here
// may enter context, reward, propensities or off-policy evaluation. Not used on /study.
export type Locale = "en" | "kn";

export interface Preferences {
  locale: Locale;
  textScale: "normal" | "large";
  structure: "paragraph" | "sections";
  searchFirst: "text" | "photo";
}

export const DEFAULT_PREFERENCES: Preferences = {
  locale: "en",
  textScale: "normal",
  structure: "paragraph",
  searchFirst: "text",
};

export interface PreferenceSignals {
  kannada: number;
  english: number;
  textSearches: number;
  photoSearches: number;
  longestReadMs: number;
}

export const EMPTY_SIGNALS: PreferenceSignals = {
  kannada: 0, english: 0, textSearches: 0, photoSearches: 0, longestReadMs: 0,
};

export const READ_THRESHOLD_MS = { normal: 60_000, demo: 5_000 } as const;
export const MIN_REPEATS = 2;

export const hasKannada = (text: string) => /[ಀ-೿]/.test(text);

/** Sticky: a rule only ever switches a preference on; Undo or Reset switches it back. */
export function derivePreferences(
  current: Preferences,
  s: PreferenceSignals,
  readThresholdMs: number,
): { preferences: Preferences; reasons: string[] } {
  const next = { ...current };
  const reasons: string[] = [];
  if (s.kannada >= MIN_REPEATS && s.kannada > s.english && current.locale !== "kn") {
    next.locale = "kn";
    reasons.push(`${s.kannada} Kannada interactions -> Kannada by default`);
  }
  if (s.longestReadMs >= readThresholdMs) {
    const seconds = Math.round(s.longestReadMs / 1000);
    if (current.textScale !== "large") {
      next.textScale = "large";
      reasons.push(`${seconds} s on a text block -> larger text`);
    }
    if (current.structure !== "sections") {
      next.structure = "sections";
      reasons.push(`${seconds} s on a text block -> sections and bullets`);
    }
  }
  if (
    s.photoSearches >= MIN_REPEATS && s.photoSearches > s.textSearches &&
    current.searchFirst !== "photo"
  ) {
    next.searchFirst = "photo";
    reasons.push(`${s.photoSearches} photo vs ${s.textSearches} text searches -> photo search first`);
  }
  return { preferences: next, reasons };
}

/** Strict validator for values arriving from a cookie. */
export function parsePreferences(input: unknown): Preferences | null {
  if (typeof input !== "object" || input === null) return null;
  const p = input as Record<string, unknown>;
  const ok =
    (p.locale === "en" || p.locale === "kn") &&
    (p.textScale === "normal" || p.textScale === "large") &&
    (p.structure === "paragraph" || p.structure === "sections") &&
    (p.searchFirst === "text" || p.searchFirst === "photo");
  return ok
    ? {
        locale: p.locale, textScale: p.textScale,
        structure: p.structure, searchFirst: p.searchFirst,
      } as Preferences
    : null;
}
