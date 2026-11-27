import { PRODUCTS, type Order } from "@/lib/study/data";
import type { PortalContext } from "./context";

export function OrderTable({ ctx, orders, selected, onOpen, onBadge }: {
  ctx: PortalContext;
  orders: Order[];
  selected: string | null;
  onOpen: (id: string) => void;
  onBadge: (id: string) => void;
}) {
  const { s, surface, control } = ctx;
  if (orders.length === 0) return <p className="p-3 text-sm">{s.noOrders}</p>;
  // Looks clickable. Only actually is when the surface promotes it.
  const badge = "rounded-full border-b-2 border-amber-500 bg-amber-100 px-2 text-xs font-semibold shadow";
  return (
    <ul className="divide-y rounded border">
      {orders.map((o) => (
        <li key={o.id} className={`flex items-center gap-2 p-1.5 ${selected === o.id ? "bg-indigo-50" : ""}`}>
          <span aria-hidden>{PRODUCTS[o.product]}</span>
          <span className="min-w-0 flex-1 text-sm">
            <strong>{o.id}</strong> · {o.customer} · ₹{o.amount} · {s[o.priority]}
          </span>
          {surface.actionableBadge && o.status === "refund_requested" ? (
            <button type="button" className={`${badge} ${control}`} onClick={() => onBadge(o.id)}>
              {s[o.status]} → {s.refund}
            </button>
          ) : (
            <span className={badge} data-attune-id={`badge-${o.id}`}>{s[o.status]}</span>
          )}
          <button type="button" className={`rounded border px-2 text-xs ${control}`} onClick={() => onOpen(o.id)}>
            {s.openOrder}
          </button>
        </li>
      ))}
    </ul>
  );
}
