// /demo only. Hesitation is a prediction, never a confirmed problem: the store asks, the user
// answers, and the answers move how soon it asks again. Counting rules, not the layout bandit.
import { CATEGORIES, CATALOG, type Category, type Product } from "./catalog";

export interface Hesitation {
  threshold: number; // signal score needed before asking
  cooldownMs: number;
  askedAt: number; // epoch ms
  yes: number;
  no: number;
  liked: Partial<Record<Category, number>>; // +1 per Yes, -1 per No: orders what is offered
}
export type SignalKind = "thrash" | "repeat" | "pingpong";
export interface Signal { t: number; kind: SignalKind; category: Category | null }
export interface Visit { t: number; key: string; category: Category | null }

export const H = {
  threshold: 3, maxThreshold: 8, cooldownMs: 60_000, maxCooldownMs: 30 * 60_000,
  windowMs: 60_000, visitWindowMs: 120_000, repeats: 3,
};
const WEIGHT: Record<SignalKind, number> = { thrash: 1, repeat: 3, pingpong: 3 };

export const NO_HESITATION: Hesitation =
  { threshold: H.threshold, cooldownMs: H.cooldownMs, askedAt: 0, yes: 0, no: 0, liked: {} };
export const hesitationKey = (user: string | null) => `attune-hesitation:${user ?? "guest"}`;

/** What the newest visit says, given the earlier ones: a third look, or A, B, A, B. */
export function visitSignal(earlier: Visit[], visit: Visit): Signal | null {
  const recent = [...earlier.filter((v) => visit.t - v.t <= H.visitWindowMs), visit];
  const signal = (kind: SignalKind): Signal => ({ t: visit.t, kind, category: visit.category });
  const [a, b, c, d] = recent.slice(-4).map((v) => v.key);
  if (d !== undefined && a === c && b === d && a !== b) return signal("pingpong");
  const looked = !visit.key.startsWith("page:") && recent.filter((v) => v.key === visit.key).length >= H.repeats;
  return looked ? signal("repeat") : null;
}

/** Ask when recent signals add up and the user has had a rest since the last question. */
export function shouldAsk(state: Hesitation, signals: Signal[], now: number): { category: Category | null; kinds: SignalKind[] } | null {
  const recent = signals.filter((s) => now - s.t <= H.windowMs);
  const score = recent.reduce((sum, s) => sum + WEIGHT[s.kind], 0);
  if (score < state.threshold || now - state.askedAt < state.cooldownMs) return null;
  const category = [...recent].reverse().find((s) => s.category)?.category ?? null;
  return { category, kinds: [...new Set(recent.map((s) => s.kind))] };
}

export function answer(state: Hesitation, yes: boolean, category: Category | null): Hesitation {
  const liked = category ? { ...state.liked, [category]: (state.liked[category] ?? 0) + (yes ? 1 : -1) } : state.liked;
  return yes
    ? { ...state, liked, yes: state.yes + 1, threshold: Math.max(H.threshold, state.threshold - 1),
        cooldownMs: Math.max(H.cooldownMs, state.cooldownMs / 2) }
    : { ...state, liked, no: state.no + 1, threshold: Math.min(H.maxThreshold, state.threshold + 1),
        cooldownMs: Math.min(H.maxCooldownMs, state.cooldownMs * 2) };
}

/** The three biggest discounts among what is in stock: something to compare. */
export const quickPicks = (category: Category): Product[] =>
  CATALOG.filter((p) => p.category === category && p.stock > 0).sort((a, b) => b.off - a.off).slice(0, 3);

/** Categories to offer when none is being compared: the ones said yes to, first. */
export const topCategories = (state: Hesitation, count = 4): Category[] =>
  [...CATEGORIES].sort((a, b) => (state.liked[b] ?? 0) - (state.liked[a] ?? 0)).slice(0, count);

/** Storage, uploads and documents are untrusted. */
export function parseHesitation(v: unknown): Hesitation {
  const h = (v ?? {}) as Partial<Record<keyof Hesitation, unknown>>;
  const within = (x: unknown, low: number, high: number, otherwise: number) =>
    typeof x === "number" && Number.isFinite(x) ? Math.min(Math.max(x, low), high) : otherwise;
  const liked = (h.liked ?? {}) as Record<string, unknown>;
  return {
    threshold: within(h.threshold, H.threshold, H.maxThreshold, H.threshold),
    cooldownMs: within(h.cooldownMs, H.cooldownMs, H.maxCooldownMs, H.cooldownMs),
    askedAt: within(h.askedAt, 0, 1e14, 0),
    yes: within(h.yes, 0, 1e6, 0),
    no: within(h.no, 0, 1e6, 0),
    liked: Object.fromEntries(CATEGORIES.flatMap((c) =>
      (Number.isFinite(liked[c]) ? [[c, within(liked[c], -1e6, 1e6, 0)]] : []))),
  };
}

/** Answer counts never fall; the rest comes from the newer copy. */
export const keepAnswers = (older: Hesitation, newer: Hesitation): Hesitation =>
  ({ ...newer, yes: Math.max(older.yes, newer.yes), no: Math.max(older.no, newer.no) });
