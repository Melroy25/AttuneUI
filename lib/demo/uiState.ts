// The cookie the server renders /demo from. Untrusted input: validate everything.
import {
  DEFAULT_PREFERENCES, parsePreferences, type Preferences,
} from "../attune-ui/preferences/rules";
import { ARM_IDS, type ArmId } from "../attune-ui/types";

export const UI_COOKIE = "attune_ui";

export interface UiState {
  arm: ArmId;
  preferences: Preferences;
}

export const encodeUi = (ui: UiState): string => encodeURIComponent(JSON.stringify(ui));

/** Accept-Language only matters on a first visit, when there is no valid cookie. */
export function decodeUi(raw: string | undefined, acceptLanguage = ""): UiState {
  if (raw && raw.length < 600) {
    try {
      // Next already URL-decodes cookie values; tolerate both forms.
      const text = raw.startsWith("%") ? decodeURIComponent(raw) : raw;
      const value = JSON.parse(text) as { arm?: unknown; preferences?: unknown };
      const preferences = parsePreferences(value.preferences);
      const arm = ARM_IDS.find((a) => a === value.arm);
      if (arm && preferences) return { arm, preferences };
    } catch {
      // fall through to defaults
    }
  }
  const kannadaFirst = acceptLanguage.trim().toLowerCase().startsWith("kn");
  return {
    arm: "baseline",
    preferences: { ...DEFAULT_PREFERENCES, locale: kannadaFirst ? "kn" : "en" },
  };
}
