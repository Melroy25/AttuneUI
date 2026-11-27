// Content for the dead-click shortcuts. Fictional, like the rest of the /demo catalog.
import { CATALOG, type Cart, type Product } from "./catalog";

export const LOCATIONS = [
  { en: "Bengaluru 560001", kn: "ಬೆಂಗಳೂರು 560001" },
  { en: "Mysuru 570001", kn: "ಮೈಸೂರು 570001" },
  { en: "Mangaluru 575001", kn: "ಮಂಗಳೂರು 575001" },
  { en: "Hubballi 580020", kn: "ಹುಬ್ಬಳ್ಳಿ 580020" },
];

export const SPECS: Record<string, string> = Object.fromEntries([
  "Mesh upper, sizes 6–11", "Bluetooth 5.3, 30 h battery", "1.5 L stainless steel", "30 L, laptop sleeve",
  "1.4 in screen, 7-day battery", "LED, 3 brightness levels", "20 W USB-C", "UV400 lenses", "750 ml, leak-proof",
  "10 W, 12 h battery", "Adjustable strap", "330 ml ceramic", "100% cotton, sizes S–XXL", "6.5 in, 128 GB",
  "Clear, shock-resistant", "100 g, for dry skin", "Set of 6 shades", "750 W, 3 jars", "400 mm, 3 speeds",
  "35 cm, soft plush", "120 pieces, age 3+", "5 kg aged rice", "500 g, 4 kinds", "Willow, size 6",
  "6 mm, non-slip", "10 books", "Adjustable height", "Holds 30 eggs",
].map((spec, i) => [CATALOG[i].id, spec]));

export const cityKey = (user: string | null) => `attune-city:${user ?? "guest"}`;
/** A saved index into LOCATIONS; null when never chosen or damaged. */
export function parseCity(v: unknown): number | null {
  const i = typeof v === "string" && v !== "" ? Number(v) : v;
  return typeof i === "number" && LOCATIONS[i] !== undefined ? i : null;
}

export type Prompt =
  | { kind: "location" } | { kind: "changer" }
  | { kind: "product"; id: string }
  | { kind: "cart"; id: string; latest: string }; // id: the clicked card; latest: newest in the cart

/** The cart item added last, if it is still there. */
export const latestInCart = (cart: Cart, last: string | null): string | null =>
  last && cart[last] ? last : Object.keys(cart).at(-1) ?? null;

/** What a dead click on a marked area offers; null for anything unknown. */
export function promptFor(context: string, inCart: string | null = null): { prompt: Prompt; product?: Product; latest?: Product } | null {
  if (context === "location") return { prompt: { kind: "location" } };
  const product = CATALOG.find((p) => `product:${p.id}` === context);
  if (!product) return null;
  // The cart item's own card needs no question about the cart.
  const latest = CATALOG.find((p) => p.id === inCart && p.id !== product.id);
  return latest
    ? { prompt: { kind: "cart", id: product.id, latest: latest.id }, product, latest }
    : { prompt: { kind: "product", id: product.id }, product };
}
