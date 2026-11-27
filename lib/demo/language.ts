// A language picked by hand stays until another is picked: no rule, Undo or Reset changes it.
import type { Locale, Preferences } from "../attune-ui/preferences/rules";

export const languageKey = (user: string | null) => `attune-language:${user ?? "guest"}`;
export const parseLanguage = (v: unknown): Locale | null => (v === "en" || v === "kn" ? v : null);

export function holdLanguage(
  result: { preferences: Preferences; reasons: string[] }, chosen: Locale | null,
): { preferences: Preferences; reasons: string[] } {
  if (!chosen || result.preferences.locale === chosen) return result;
  return {
    preferences: { ...result.preferences, locale: chosen },
    reasons: result.reasons.filter((r) => !r.endsWith("Kannada by default")),
  };
}
