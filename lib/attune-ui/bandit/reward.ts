export const T_REF_MS = 15_000; // fixed at the study freeze
export const TASK_CAP_MS = 90_000;

export interface TaskOutcome {
  success: boolean;
  timeMs: number;
  friction: number; // post-decision friction event count
}

export function taskReward(o: TaskOutcome, surfaceChanged: boolean, refMs = T_REF_MS): number {
  if (!(o.timeMs > 0) || !(o.friction >= 0)) throw new Error("invalid task outcome");
  // A quick give-up must not score as "fast".
  const speed = o.success ? Math.min(refMs / o.timeMs, 1) : 0;
  const calm = 1 - Math.min(o.friction / 5, 1);
  const r = 0.5 * Number(o.success) + 0.35 * speed + 0.15 * calm - (surfaceChanged ? 0.05 : 0);
  return Math.min(Math.max(r, 0), 1);
}

export function blockReward(tasks: TaskOutcome[], surfaceChanged: boolean): number {
  if (tasks.length === 0) throw new Error("empty block");
  return tasks.reduce((s, t) => s + taskReward(t, surfaceChanged), 0) / tasks.length;
}
