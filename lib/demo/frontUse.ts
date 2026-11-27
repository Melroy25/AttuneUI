// /demo only: how often each part of the store is used, per visit. What was used 3+ times gets a
// copy at the front of the navigation from the start of the NEXT visit, so nothing moves mid-visit.
import { CATEGORIES } from "./catalog";

export const FRONT_PAGES = ["orders", "products", "returns", "reports", "help", "articles", "wishlist", "cart"] as const;
export const COMPONENTS: string[] = [...FRONT_PAGES, ...CATEGORIES.map((c) => `category:${c}`)];
export type Counts = Record<string, number>;

export interface VisitUse {
  session: string; // which page load `current` belongs to
  current: Counts; // uses in this visit
  last: Counts; // uses in the previous visit
  front: string[]; // promoted for this visit, most used first
}

export const FRONT_AT = 3;
export const MAX_FRONT = 3;
export const NO_USE: VisitUse = { session: "", current: {}, last: {}, front: [] };
export const useKey = (user: string | null) => `attune-front:${user ?? "guest"}`;

/** A new visit judges the one before it; the same visit again (a remount) changes nothing. */
export function startVisit(s: VisitUse, session: string): { state: VisitUse; started: boolean } {
  if (s.session === session) return { state: s, started: false };
  const front = Object.entries(s.current).filter(([, n]) => n >= FRONT_AT)
    .sort((a, b) => b[1] - a[1]).slice(0, MAX_FRONT).map(([k]) => k);
  return { state: { session, current: {}, last: s.current, front }, started: true };
}

export const used = (s: VisitUse, key: string): VisitUse =>
  COMPONENTS.includes(key) ? { ...s, current: { ...s.current, [key]: (s.current[key] ?? 0) + 1 } } : s;

const counts = (v: unknown): Counts => {
  const from = (typeof v === "object" && v !== null ? v : {}) as Record<string, unknown>;
  return Object.fromEntries(COMPONENTS.flatMap((k) => {
    const n = from[k];
    return Number.isInteger(n) && (n as number) > 0 ? [[k, Math.min(n as number, 1e6)]] : [];
  }));
};

/** Storage, uploads and documents are untrusted: only known parts and whole counts survive. */
export function parseUse(v: unknown): VisitUse {
  const u = (typeof v === "object" && v !== null ? v : {}) as Partial<Record<keyof VisitUse, unknown>>;
  const session = typeof u.session === "string" && u.session.length <= 40 ? u.session : "";
  const front = Array.isArray(u.front)
    ? [...new Set(u.front.filter((k): k is string => typeof k === "string" && COMPONENTS.includes(k)))].slice(0, MAX_FRONT)
    : [];
  return { session, current: counts(u.current), last: counts(u.last), front };
}
