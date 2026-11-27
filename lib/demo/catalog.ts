// Fictional /demo-only content. The study never reads it.
import { ORDERS, type Order, type Status } from "../study/data";

export const CATEGORIES = [
  "fashion", "mobiles", "electronics", "beauty", "home", "appliances", "toys", "grocery", "sports", "books", "furniture",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ICONS: Record<Category, string> = {
  fashion: "👕", mobiles: "📱", electronics: "💻", beauty: "💄", home: "💡", appliances: "📺",
  toys: "🧸", grocery: "🫙", sports: "🏏", books: "📘", furniture: "🛋️",
};

export interface Product {
  id: string;
  name: string;
  icon: string;
  category: Category;
  price: number;
  stock: number;
  off: number; // discount shown on the card, percent
}

const p = (id: number, name: string, icon: string, category: Category, price: number, stock: number, off = 0): Product =>
  ({ id: `PRD-${id}`, name, icon, category, price, stock, off });

export const CATALOG: Product[] = [
  p(101, "Running shoes", "👟", "fashion", 1799, 24, 40),
  p(102, "Wireless headphones", "🎧", "electronics", 3299, 8, 25),
  p(103, "Steel kettle", "🫖", "home", 899, 0, 30),
  p(104, "Travel backpack", "🎒", "fashion", 1299, 15, 55),
  p(105, "Smart watch", "⌚", "electronics", 4599, 3, 20),
  p(106, "Desk lamp", "💡", "home", 649, 41, 35),
  p(107, "Phone charger", "🔌", "mobiles", 499, 60, 50),
  p(108, "Sunglasses", "🕶️", "fashion", 999, 0, 65),
  p(109, "Water bottle", "🧴", "home", 349, 33),
  p(110, "Bluetooth speaker", "🔊", "electronics", 2199, 5, 45),
  p(111, "Cotton cap", "🧢", "fashion", 299, 18),
  p(112, "Coffee mug", "☕", "home", 249, 52),
  p(113, "Casual shirt", "👔", "fashion", 332, 40, 65),
  p(114, "5G smartphone", "📱", "mobiles", 13999, 12, 18),
  p(115, "Phone case", "📲", "mobiles", 199, 80, 70),
  p(116, "Face moisturiser", "🧴", "beauty", 362, 30, 15),
  p(117, "Lipstick set", "💄", "beauty", 449, 22, 40),
  p(118, "Mixer grinder", "🥤", "appliances", 2899, 9, 35),
  p(119, "Table fan", "🌀", "appliances", 1499, 14, 28),
  p(120, "Teddy bear", "🧸", "toys", 599, 19, 50),
  p(121, "Building blocks", "🧱", "toys", 799, 11, 30),
  p(122, "Basmati rice 5 kg", "🍚", "grocery", 579, 48, 12),
  p(123, "Dry fruit box", "🥜", "grocery", 699, 4, 22),
  p(124, "Cricket bat", "🏏", "sports", 1199, 16, 33),
  p(125, "Yoga mat", "🧘", "sports", 449, 27, 55),
  p(126, "Story book set", "📚", "books", 399, 35, 20),
  p(127, "Study chair", "🪑", "furniture", 3499, 6, 42),
  p(128, "Egg storage box", "🥚", "home", 197, 50, 70),
];

export const searchCatalog = (query: string, category: Category | ""): Product[] => {
  const q = query.trim().toLowerCase();
  return CATALOG.filter((x) => (!category || x.category === category) && (!q || x.name.toLowerCase().includes(q)));
};

export type Cart = Record<string, number>;

/** Sets a quantity within stock; zero removes the line. */
export function withQuantity(cart: Cart, id: string, quantity: number): Cart {
  const product = CATALOG.find((x) => x.id === id);
  if (!product) return cart;
  const next = { ...cart };
  const q = Math.min(Math.max(Math.floor(quantity), 0), product.stock);
  if (q > 0) next[id] = q;
  else delete next[id];
  return next;
}

export function cartSummary(cart: Cart) {
  const lines = CATALOG.filter((x) => cart[x.id]).map((product) => ({ product, quantity: cart[product.id] }));
  return {
    lines,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    total: lines.reduce((s, l) => s + l.quantity * l.product.price, 0),
  };
}

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
