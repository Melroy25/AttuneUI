import type { Order, Priority, Status } from "./data";

export type Variant = "A" | "B";

export interface Filters {
  query: string;
  status: Status | "";
  priority: Priority | "";
  region: Order["region"] | "";
  courier: Order["courier"] | "";
  payment: Order["payment"] | "";
  product: Order["product"] | "";
}

export const NO_FILTERS: Filters = {
  query: "", status: "", priority: "", region: "", courier: "", payment: "", product: "",
};

export const applyFilters = (orders: Order[], f: Filters): Order[] => {
  const q = f.query.trim().toLowerCase();
  return orders.filter(
    (o) =>
      (!q || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q)) &&
      (!f.status || o.status === f.status) &&
      (!f.priority || o.priority === f.priority) &&
      (!f.region || o.region === f.region) &&
      (!f.courier || o.courier === f.courier) &&
      (!f.payment || o.payment === f.payment) &&
      (!f.product || o.product === f.product),
  );
};

export type PortalAction =
  | { type: "open"; orderId: string }
  | { type: "filter"; filters: Filters }
  | { type: "refund"; orderId: string; amount: number };

export type Task =
  | { id: "findDelayed"; orderId: string }
  | { id: "filterRefunds"; status: Status; priority: Priority }
  | { id: "partialRefund"; orderId: string; amount: number };

/** Two matched variants so Block 1 and Block 2 can be counterbalanced. */
export const TASKS: Record<Variant, Task[]> = {
  A: [
    { id: "findDelayed", orderId: "ORD-4821" },
    { id: "filterRefunds", status: "refund_requested", priority: "high" },
    { id: "partialRefund", orderId: "ORD-4816", amount: 450 },
  ],
  B: [
    { id: "findDelayed", orderId: "ORD-5310" },
    { id: "filterRefunds", status: "delayed", priority: "high" },
    { id: "partialRefund", orderId: "ORD-5302", amount: 350 },
  ],
};

export function isComplete(task: Task, action: PortalAction): boolean {
  switch (task.id) {
    case "findDelayed":
      return action.type === "open" && action.orderId === task.orderId;
    case "filterRefunds":
      return (
        action.type === "filter" &&
        action.filters.status === task.status &&
        action.filters.priority === task.priority
      );
    case "partialRefund":
      return (
        action.type === "refund" &&
        action.orderId === task.orderId &&
        action.amount === task.amount
      );
  }
}
