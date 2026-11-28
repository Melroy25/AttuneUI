// /demo only: "Do you want to keep changes?" is asked until the first Yes; after that, matching
// changes apply by themselves. The approval is a tagged activity entry, so Reset forgets it.
import type { Activity } from "./activity";

export const consentTag = (change: string, yes: boolean) => `${change} [c:${yes ? "yes" : "no"}]`;

/** A Yes since the last Reset. A No saves nothing, so the next trigger asks again. */
export function approved(activity: Activity[]): boolean {
  const reset = Math.max(0, ...activity.filter((a) => a.trigger === "Pressed Reset").map((a) => a.at));
  return activity.some((a) => a.at > reset && a.change.endsWith("[c:yes]"));
}
