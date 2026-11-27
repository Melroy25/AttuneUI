// /demo shortcuts from repeated use. Fixed rules in the visitor's browser, not part of the bandit.
import { ORDERS, PRODUCTS } from "../study/data";
import { CATALOG, type Product } from "./catalog";

export const REPEAT = 2;

export interface Habits {
  wishUses: number;
  wished: string[]; // order ids
  opens: Record<string, number>; // per order id
  supportUses: number;
}

export const NO_HABITS: Habits = { wishUses: 0, wished: [], opens: {}, supportUses: 0 };
export const habitsKey = (user: string | null) => `attune-habits:${user ?? "guest"}`;

export const toggleWish = (h: Habits, id: string): Habits => ({
  ...h,
  wishUses: h.wishUses + 1,
  wished: h.wished.includes(id) ? h.wished.filter((x) => x !== id) : [...h.wished, id],
});
export const openOrder = (h: Habits, id: string): Habits =>
  ({ ...h, opens: { ...h.opens, [id]: (h.opens[id] ?? 0) + 1 } });
export const askSupport = (h: Habits): Habits => ({ ...h, supportUses: h.supportUses + 1 });

/** One catalog item for each product whose order was opened repeatedly. */
export const similarTo = (h: Habits): Product[] => [...new Set(
  ORDERS.filter((o) => (h.opens[o.id] ?? 0) >= REPEAT)
    .flatMap((o) => CATALOG.find((p) => p.icon === PRODUCTS[o.product]) ?? []),
)];

const count = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;

/** Storage can be edited or damaged: anything that does not fit starts over. */
export function parseHabits(raw: string | null): Habits {
  try {
    const v = JSON.parse(raw ?? "null") as Habits;
    const fits = count(v.wishUses) && count(v.supportUses) && Array.isArray(v.wished) &&
      v.wished.every((x) => typeof x === "string") && Object.values(v.opens).every(count);
    return fits ? { wishUses: v.wishUses, wished: v.wished, opens: v.opens, supportUses: v.supportUses } : NO_HABITS;
  } catch {
    return NO_HABITS;
  }
}
