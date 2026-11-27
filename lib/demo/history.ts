// Finished /demo sessions, archived by Reset so they are not lost.
import { SHORTCUTS, type Shortcut } from "../bandit/shortcutBandit";
import { ARM_IDS, type ArmId } from "../attune-ui/types";
import { parseActivity, type Activity } from "./activity";

export interface PastSession { endedAt: number; layout: ArmId; shortcuts: Shortcut[]; changes: Activity[] }

export const MAX_PAST = 10;
export const SENT_PAST = 5; // how many the admin receives
export const historyKey = (user: string | null) => `attune-history:${user ?? "guest"}`;

/** Newest first. A session in which nothing changed is not worth keeping. */
export const archive = (past: PastSession[], done: PastSession): PastSession[] =>
  done.changes.length === 0 && done.shortcuts.length === 0 && done.layout === "baseline"
    ? past
    : [done, ...past].slice(0, MAX_PAST);

/** Checks sessions from storage or the network; null if anything does not fit. */
export function parsePast(v: unknown, max: number): PastSession[] | null {
  if (!Array.isArray(v) || v.length > max) return null;
  const out: PastSession[] = [];
  for (const s of v as (Partial<PastSession> | null)[]) {
    const changes = parseActivity(s?.changes, 20);
    const layout = ARM_IDS.find((a) => a === s?.layout);
    const ok = Array.isArray(s?.shortcuts) && s.shortcuts.every((k) => SHORTCUTS.includes(k));
    if (!s || !Number.isFinite(s.endedAt) || !layout || !ok || !changes) return null;
    out.push({ endedAt: s.endedAt!, layout, shortcuts: s.shortcuts!, changes });
  }
  return out;
}

/** Adds as much history as the upload limit allows, dropping the oldest first. */
export function withPast<T extends object>(snapshot: T, past: PastSession[], maxBytes: number): T & { past?: PastSession[] } {
  const short = (text: string) => text.slice(0, 120);
  let sent = past.slice(0, SENT_PAST).map((s) => ({
    ...s,
    changes: s.changes.slice(0, 3).map((c) => ({ at: c.at, trigger: short(c.trigger), change: short(c.change) })),
  }));
  const size = (v: object) => new TextEncoder().encode(JSON.stringify(v)).length;
  while (sent.length > 0 && size({ ...snapshot, past: sent }) > maxBytes) sent = sent.slice(0, -1);
  return sent.length > 0 ? { ...snapshot, past: sent } : snapshot;
}
