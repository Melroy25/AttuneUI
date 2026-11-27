// Fictional orders for the testbed.
export type Status = "delayed" | "refund_requested" | "shipped" | "delivered";
export type Priority = "high" | "normal" | "low";

export interface Order {
  id: string;
  customer: string;
  product: Product;
  status: Status;
  priority: Priority;
  region: "North" | "South" | "East" | "West";
  courier: "BlueDart" | "Delhivery" | "IndiaPost";
  payment: "UPI" | "Card" | "COD";
  amount: number;
}

export const PRODUCTS = {
  shoes: "👟", headphones: "🎧", kettle: "🫖", backpack: "🎒", watch: "⌚", lamp: "💡",
} as const;
export type Product = keyof typeof PRODUCTS;

const o = (
  id: number, customer: string, product: Product, status: Status, priority: Priority,
  region: Order["region"], courier: Order["courier"], payment: Order["payment"], amount: number,
): Order => ({ id: `ORD-${id}`, customer, product, status, priority, region, courier, payment, amount });

export const ORDERS: Order[] = [
  o(4802, "Asha", "kettle", "delivered", "normal", "South", "Delhivery", "UPI", 899),
  o(4809, "Ravi", "watch", "refund_requested", "low", "North", "BlueDart", "Card", 2499),
  o(4816, "Meera", "shoes", "refund_requested", "high", "South", "BlueDart", "UPI", 1799),
  o(4821, "Kiran", "headphones", "delayed", "high", "West", "IndiaPost", "Card", 3299),
  o(4833, "Divya", "backpack", "shipped", "normal", "East", "Delhivery", "COD", 1299),
  o(4847, "Imran", "lamp", "delayed", "normal", "North", "Delhivery", "UPI", 649),
  o(5290, "Neha", "shoes", "shipped", "high", "South", "IndiaPost", "COD", 2199),
  o(5302, "Suresh", "backpack", "refund_requested", "high", "East", "Delhivery", "UPI", 1499),
  o(5310, "Latha", "watch", "delayed", "low", "South", "BlueDart", "Card", 4599),
  o(5318, "Joseph", "kettle", "delayed", "high", "East", "IndiaPost", "UPI", 999),
  o(5325, "Farah", "headphones", "delivered", "low", "West", "BlueDart", "COD", 1999),
  o(5341, "Gopal", "lamp", "refund_requested", "normal", "West", "IndiaPost", "Card", 549),
];
