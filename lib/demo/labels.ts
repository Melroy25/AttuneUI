// Plain words for the admin page.
import { ARM_IDS, type ArmId } from "../attune-ui/types";
import { SURFACE_NAMES } from "./explain";

export const STRUGGLE_LABELS = {
  rage: "Rage clicks", dead: "Dead clicks", miss: "Missed taps",
  dwell: "Long hovers", thrash: "Scroll shaking", backtrack: "Going back",
} as const;

const layout = (id: string) => (ARM_IDS.includes(id as ArmId) ? SURFACE_NAMES[id as ArmId] : id);

/** The store's log lines are written for engineers; this says the same thing shortly. */
export function plainLog(line: string): string {
  const decided = /-> (\w+) \(p = ([\d.]+)/.exec(line);
  if (decided) return `Switched to ${layout(decided[1])} (${Math.round(Number(decided[2]) * 100)}% chance)`;
  const undone = /^Undo: back to (\w+)/.exec(line);
  if (undone) return `Undone: back to ${layout(undone[1])}`;
  const preview = /^Manual preview: (\w+)/.exec(line);
  if (preview) return `Previewed ${layout(preview[1])} by hand`;
  if (line.startsWith("Automatic adapting paused")) return "Auto-change turned off after Undo";
  const learned = /^Learned: (\w+) scored ([\d.]+)/.exec(line);
  if (learned) return `Learned: ${layout(learned[1])} scored ${Math.round(Number(learned[2]) * 100)} out of 100`;
  if (line.startsWith("Pinned:")) return "Layout locked: no change";
  if (line.startsWith("Static mode")) return "Static mode: no change";
  if (line.startsWith("SIMULATED")) return "Learned from simulated users";
  return line.replace("Preference rule: ", "Preference: ").replace(" -> ", " → ");
}
