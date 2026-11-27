// The admin's per-user and all-users views, computed from the latest snapshots.
import { ARM_IDS, type ArmId, type FrictionSummary } from "../attune-ui/types";
import type { LiveSnapshot } from "./live";

export const ONLINE_MS = 15_000;
export const COUNTED = ["rage", "dead", "miss", "dwell", "thrash", "backtrack"] as const;

export interface Row { snapshot: LiveSnapshot; updatedAt: string }
export interface UserView {
  name: string;
  latest: Row;
  online: boolean;
  /** Struggles and adaptations added up over this user's browser sessions. */
  totals: FrictionSummary;
  adaptations: number;
  sessions: number;
}

const zero = (): FrictionSummary => ({ rage: 0, dead: 0, miss: 0, dwell: 0, thrash: 0, backtrack: 0, tortuosity: 1 });

/** Everything this tab sensed: finished blocks plus the one in progress. */
const sessionTotal = (s: LiveSnapshot, into: FrictionSummary) => {
  for (const k of COUNTED) into[k] += s.totals[k] + s.friction[k];
  return into;
};

export const userName = (s: LiveSnapshot) => s.user ?? `guest ${s.id.slice(0, 6)}`;

export function groupUsers(rows: Row[], now: number): UserView[] {
  const byName = new Map<string, Row[]>();
  for (const row of [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
    const name = userName(row.snapshot);
    byName.set(name, [...(byName.get(name) ?? []), row]);
  }
  return [...byName].map(([name, own]) => ({
    name,
    latest: own[0],
    online: now - Date.parse(own[0].updatedAt) < ONLINE_MS,
    totals: own.reduce((sum, r) => sessionTotal(r.snapshot, sum), zero()),
    adaptations: own.reduce((s, r) => s + r.snapshot.history.length, 0),
    sessions: own.length,
  }));
}

export function summariseAll(users: UserView[]) {
  const struggles = zero();
  const showing = Object.fromEntries(ARM_IDS.map((a) => [a, 0])) as Record<ArmId, number>;
  const chosen = { ...showing };
  const pages = new Map<string, number>();
  for (const u of users) {
    for (const k of COUNTED) struggles[k] += u.totals[k];
    showing[u.latest.snapshot.arm]++;
    for (const h of u.latest.snapshot.history) chosen[h.arm]++;
    if (u.online) pages.set(u.latest.snapshot.page, (pages.get(u.latest.snapshot.page) ?? 0) + 1);
  }
  return {
    users: users.length,
    online: users.filter((u) => u.online).length,
    adaptations: users.reduce((s, u) => s + u.adaptations, 0),
    struggles,
    showing,
    chosen,
    pages: [...pages],
    activity: users.flatMap((u) => u.latest.snapshot.log.slice(0, 3).map((line) => ({ name: u.name, line }))),
  };
}
