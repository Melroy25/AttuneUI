import { useState } from "react";
import type { PortalContext } from "@/components/portal/context";
import { PRODUCTS, type Order } from "@/lib/study/data";

/** Taps on a card itself, not on a button, before its arrow starts to glow. */
const HINT_AFTER = 2;

/** /demo version of OrderTable: same labels and control sizes, shown as cards with an arrow. */
export function StoreOrderList({ ctx, orders, selected, onOpen, onBadge }: {
  ctx: PortalContext;
  orders: Order[];
  selected: string | null;
  onOpen: (id: string) => void;
  onBadge: (id: string) => void;
}) {
  const { s, surface, control } = ctx;
  // A fixed rule, not the bandit. It lasts until that order is opened or the block ends.
  const [cardTaps, setCardTaps] = useState<Record<string, number>>({});
  if (orders.length === 0) return <p data-part="detail" className="p-3 text-sm">{s.noOrders}</p>;
  // Looks clickable. Only actually is when the surface promotes it.
  const badge = "rounded-full border-b-2 px-2 py-0.5 text-xs font-semibold shadow-sm";
  return (
    <ul className="space-y-2">
      {orders.map((o) => {
        const hint = (cardTaps[o.id] ?? 0) >= HINT_AFTER;
        return (
          <li key={o.id} data-part="order" data-selected={selected === o.id} data-attune-tap={`card-${o.id}`}
            className="flex items-center gap-3 p-3"
            // Repeated taps must not select the card's text.
            onMouseDown={(e) => { if (e.detail > 1) e.preventDefault(); }}
            onClick={(e) => {
              if ((e.target as Element).closest("button")) return;
              setCardTaps((t) => ({ ...t, [o.id]: (t[o.id] ?? 0) + 1 }));
            }}>
            <span aria-hidden data-part="thumb" data-product={o.product} data-attune-id={`thumb-${o.id}`}>
              {PRODUCTS[o.product]}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-sm"><strong>{o.id}</strong> · {o.customer}</p>
                <p data-part="price">₹{o.amount.toLocaleString("en-IN")}</p>
              </div>
              <p data-part="meta">
                {o.region} · {o.courier} · {o.payment} ·{" "}
                <span data-priority={o.priority}>{s.priority}: {s[o.priority]}</span>
              </p>
              {surface.actionableBadge && o.status === "refund_requested" ? (
                <button type="button" data-status={o.status} className={`${badge} ${control}`} onClick={() => onBadge(o.id)}>
                  {s[o.status]} → {s.refund}
                </button>
              ) : (
                <span data-status={o.status} className={`inline-block ${badge}`} data-attune-id={`badge-${o.id}`}>
                  {s[o.status]}
                </span>
              )}
            </div>
            <button type="button" data-part="open" data-hint={hint} aria-label={`${s.openOrder} ${o.id}`}
              className={`grid flex-none place-items-center ${ctx.large ? control : `${control} w-6`}`}
              onClick={() => {
                setCardTaps((t) => ({ ...t, [o.id]: 0 }));
                onOpen(o.id);
              }}>
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
