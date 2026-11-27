// /demo only: how often each part of the store is used, per visit. Nothing moves mid-visit; from
// the start of the NEXT visit, what was used 3+ times comes forward (nav copy, or ♥ on cards).
import { CATALOG, CATEGORIES } from "./catalog";

export const FRONT_PAGES = ["orders", "products", "returns", "reports", "help", "articles", "cart"] as const;
const CATEGORY_KEYS = CATEGORIES.map((c) => `category:${c}`);
const PRODUCT_KEYS = CATALOG.map((p) => `product:${p.id}`);
export const COMPONENTS: string[] = [...FRONT_PAGES, "wishlist", ...CATEGORY_KEYS, ...PRODUCT_KEYS];
const CAN_FRONT = new Set<string>([...FRONT_PAGES, ...CATEGORY_KEYS]);
const IS_INTEREST = new Set<string>([...CATEGORY_KEYS, ...PRODUCT_KEYS]);
export type Counts = Record<string, number>;

export interface VisitUse {
  session: string; // which page load `current` belongs to
  visits: number; // visits so far, this one included
  current: Counts; // uses in this visit
  last: Counts; // uses in the previous visit
  interest: Counts; // categories and products, over all visits
  front: string[]; // promoted for this visit, most used first
  wishCards: boolean; // ♥ Wishlist on each product card for this visit
}

export const FRONT_AT = 3;
export const MAX_FRONT = 3;
export const NO_USE: VisitUse = { session: "", visits: 0, current: {}, last: {}, interest: {}, front: [], wishCards: false };
export const useKey = (user: string | null) => `attune-front:${user ?? "guest"}`;

/** A new visit judges the one before it; the same visit again (a remount) changes nothing. */
export function startVisit(s: VisitUse, session: string): { state: VisitUse; started: boolean } {
  if (s.session === session) return { state: s, started: false };
  const front = Object.entries(s.current).filter(([k, n]) => CAN_FRONT.has(k) && n >= FRONT_AT)
    .sort((a, b) => b[1] - a[1]).slice(0, MAX_FRONT).map(([k]) => k);
  return {
    state: { ...s, session, visits: s.visits + 1, current: {}, last: s.current, front, wishCards: (s.current.wishlist ?? 0) >= FRONT_AT },
    started: true,
  };
}

export function used(s: VisitUse, key: string): VisitUse {
  if (!COMPONENTS.includes(key)) return s;
  const interest = IS_INTEREST.has(key) ? { ...s.interest, [key]: (s.interest[key] ?? 0) + 1 } : s.interest;
  return { ...s, interest, current: { ...s.current, [key]: (s.current[key] ?? 0) + 1 } };
}

const top = (c: Counts, prefix: string, n: number) => Object.entries(c).filter(([k]) => k.startsWith(prefix))
  .sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k.slice(prefix.length));

/** From the second visit on: the categories and products this user keeps coming back to. */
export function suggestions(s: VisitUse): { categories: string[]; products: string[] } | null {
  if (s.visits < 2) return null;
  const found = { categories: top(s.interest, "category:", 2), products: top(s.interest, "product:", 2) };
  return found.categories.length + found.products.length > 0 ? found : null;
}

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
    ? [...new Set(u.front.filter((k): k is string => typeof k === "string" && CAN_FRONT.has(k)))].slice(0, MAX_FRONT)
    : [];
  const visits = Number.isInteger(u.visits) && (u.visits as number) > 0 ? Math.min(u.visits as number, 1e6) : 0;
  return {
    session, visits, current: counts(u.current), last: counts(u.last), interest: counts(u.interest), front,
    wishCards: u.wishCards === true,
  };
}
