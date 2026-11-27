// /demo only: Wishlist use is counted per visit. Frequent use earns it a place at the front of the
// navigation from the start of the NEXT visit, so nothing moves while the user is shopping.

export interface WishSession {
  session: string; // which page load this count belongs to
  current: number; // presses in this visit
  last: number; // presses in the previous visit
  promoted: boolean; // Wishlist first in the navigation for this visit
}

export const WISH_AT = 3;
export const NO_WISH: WishSession = { session: "", current: 0, last: 0, promoted: false };
export const wishKey = (user: string | null) => `attune-wish:${user ?? "guest"}`;

/** A new visit judges the one before it; the same visit again (a remount) changes nothing. */
export function startVisit(s: WishSession, session: string): { state: WishSession; started: boolean } {
  if (s.session === session) return { state: s, started: false };
  return { state: { session, current: 0, last: s.current, promoted: s.current >= WISH_AT }, started: true };
}

export const pressed = (s: WishSession): WishSession => ({ ...s, current: s.current + 1 });

/** Storage, uploads and documents are untrusted. */
export function parseWish(v: unknown): WishSession {
  const w = (typeof v === "object" && v !== null ? v : {}) as Partial<Record<keyof WishSession, unknown>>;
  const n = (x: unknown) => (Number.isInteger(x) && (x as number) >= 0 ? Math.min(x as number, 1e6) : 0);
  const session = typeof w.session === "string" && w.session.length <= 40 ? w.session : "";
  return { session, current: n(w.current), last: n(w.last), promoted: w.promoted === true };
}
