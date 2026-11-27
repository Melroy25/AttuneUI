import type { PortalContext } from "@/components/portal/context";
import { PRODUCTS, type Order } from "@/lib/study/data";
import { ArrowButton, useCardHint } from "./cardHint";
import { DismissShortcut, WishlistButton } from "./Habits";

/** /demo version of OrderTable: same labels and control sizes, shown as cards with an arrow. */
export function StoreOrderList({ ctx, orders, selected, onOpen, onBadge }: {
  ctx: PortalContext;
  orders: Order[];
  selected: string | null;
  onOpen: (id: string) => void;
  onBadge: (id: string) => void;
}) {
  const { s, surface, control } = ctx;
  const hint = useCardHint(ctx.logChange);
  const wishOnCards = ctx.shortcuts?.on("wishlist");
  if (orders.length === 0) return <p data-part="detail" className="p-3 text-sm">{s.noOrders}</p>;
  // Looks clickable. Only actually is when the surface promotes it.
  const badge = "rounded-full border-b-2 px-2 py-0.5 text-xs font-semibold shadow-sm";
  return (
    <ul className="space-y-2">
      {wishOnCards && <li className="flex justify-end"><DismissShortcut ctx={ctx} kind="wishlist" label /></li>}
      {orders.map((o) => (
        <li key={o.id} data-part="order" data-selected={selected === o.id} className="flex items-center gap-3 p-3"
          {...hint.cardProps(o.id)}>
          <span aria-hidden data-part="thumb" data-product={o.product} data-attune-id={`thumb-${o.id}`}>
            {PRODUCTS[o.product]}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <p data-text-id={`order:${o.id}:line`} className="text-sm"><strong>{o.id}</strong> · {o.customer}</p>
              <p data-text-id={`order:${o.id}:price`} data-part="price">₹{o.amount.toLocaleString("en-IN")}</p>
            </div>
            <p data-text-id={`order:${o.id}:meta`} data-part="meta">
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
          {wishOnCards && <WishlistButton ctx={ctx} id={o.id} compact />}
          <ArrowButton ctx={ctx} label={`${s.openOrder} ${o.id}`} hint={hint.hinted(o.id)}
            onClick={() => { hint.clear(o.id); onOpen(o.id); }} />
        </li>
      ))}
    </ul>
  );
}
