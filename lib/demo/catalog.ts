// Fictional /demo-only content. The study never reads it.
import { ORDERS, type Order, type Status } from "../study/data";

export const CATEGORIES = ["electronics", "home", "fashion"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Product {
  id: string;
  name: string;
  icon: string;
  category: Category;
  price: number;
  stock: number;
}

const p = (id: number, name: string, icon: string, category: Category, price: number, stock: number): Product =>
  ({ id: `PRD-${id}`, name, icon, category, price, stock });

export const CATALOG: Product[] = [
  p(101, "Running shoes", "👟", "fashion", 1799, 24),
  p(102, "Wireless headphones", "🎧", "electronics", 3299, 8),
  p(103, "Steel kettle", "🫖", "home", 899, 0),
  p(104, "Travel backpack", "🎒", "fashion", 1299, 15),
  p(105, "Smart watch", "⌚", "electronics", 4599, 3),
  p(106, "Desk lamp", "💡", "home", 649, 41),
  p(107, "Phone charger", "🔌", "electronics", 499, 60),
  p(108, "Sunglasses", "🕶️", "fashion", 999, 0),
  p(109, "Water bottle", "🧴", "home", 349, 33),
  p(110, "Bluetooth speaker", "🔊", "electronics", 2199, 5),
  p(111, "Cotton cap", "🧢", "fashion", 299, 18),
  p(112, "Coffee mug", "☕", "home", 249, 52),
];

export const searchCatalog = (query: string, category: Category | ""): Product[] => {
  const q = query.trim().toLowerCase();
  return CATALOG.filter((x) => (!category || x.category === category) && (!q || x.name.toLowerCase().includes(q)));
};

export const refundQueue = (): Order[] => ORDERS.filter((o) => o.status === "refund_requested");

/** Totals shown on the Reports page, computed from the fictional orders. */
export function summarise(orders: Order[] = ORDERS) {
  const count = <K extends string>(key: (o: Order) => K) => {
    const out = new Map<K, number>();
    for (const o of orders) out.set(key(o), (out.get(key(o)) ?? 0) + 1);
    return [...out].sort((a, b) => b[1] - a[1]);
  };
  return {
    orders: orders.length,
    value: orders.reduce((s, o) => s + o.amount, 0),
    delayed: orders.filter((o) => o.status === "delayed").length,
    byStatus: count<Status>((o) => o.status),
    byRegion: count((o) => o.region),
    byPayment: count((o) => o.payment),
  };
}
