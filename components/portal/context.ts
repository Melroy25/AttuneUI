import type { PreferenceSignals, Preferences } from "@/lib/attune-ui/preferences/rules";
import type { SurfaceConfig } from "@/lib/attune-ui/surface/catalog";
import type { Strings } from "./strings";

export interface PortalContext {
  s: Strings;
  surface: SurfaceConfig;
  preferences: Preferences;
  large: boolean;
  /** Height classes for controls: compact is deliberately small (baseline friction). */
  control: string;
  /** Counts to add. longestReadMs is a maximum, not a sum. */
  onSignal: (delta: Partial<PreferenceSignals>) => void;
  /** Store only: an action was finished (the demo model learns from these). */
  onGoal?: () => void;
}
