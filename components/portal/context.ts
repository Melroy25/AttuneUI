import type { Change } from "@/lib/demo/activity";
import type { HabitsApi } from "@/components/demo/useHabits";
import type { ShortcutsApi } from "@/components/demo/useShortcuts";
import type { BehaviourApi } from "@/components/demo/useBehaviour";
import type { Product } from "@/lib/demo/catalog";
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
  /** Store only: shortcuts earned by repeated use. */
  habits?: HabitsApi;
  /** Store only: which shortcuts the bandit has promoted. */
  shortcuts?: ShortcutsApi;
  /** Store only: note a screen change for the admin. */
  logChange?: (change: Change) => void;
  /** Store only: open the article that goes with a product. */
  onGuide?: (product: Product) => void;
  /** Store only: familiarity cues and reading signals. */
  behaviour?: BehaviourApi;
  cues?: BehaviourApi["state"]["cues"];
  /** Store only: set while the policy text should offer larger type. */
  readingPrompt?: { confirm: () => void; dismiss: () => void };
}
