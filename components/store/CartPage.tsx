import type { PortalContext } from "@/components/portal/context";
import { cartSummary } from "@/lib/demo/catalog";
import { PAGE_TEXT } from "./text";
import type { Shop } from "./useShop";

/** A demo cart. It never asks for payment or address details. */
export function CartPage({ ctx, shop, onView }: { ctx: PortalContext; shop: Shop; onView: (view: string) => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const { lines, total } = cartSummary(shop.cart);
  const step = `w-8 border ${ctx.control}`;

  if (lines.length === 0) {
    return <p role="status" data-part="detail" className="p-4 text-sm">{shop.placed ? `✓ ${t.orderPlaced}` : t.emptyCart}</p>;
  }
  return (
    <div className="grid items-start gap-3 md:grid-cols-[2fr_1fr]">
      <ul className="space-y-2">
        {lines.map(({ product: p, quantity }) => (
          <li key={p.id} data-part="order" data-attune-tap={`cart-${p.id}`} className="flex flex-wrap items-center gap-3 p-3">
            <span aria-hidden data-part="thumb">{p.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{p.name}</p>
              <p data-part="price">₹{(p.price * quantity).toLocaleString("en-IN")}</p>
            </div>
            <span className="flex items-center gap-1">
              <button type="button" aria-label={`${t.quantity} − ${p.name}`} className={step}
                onClick={() => shop.setQuantity(p.id, quantity - 1)}>−</button>
              <output className="w-6 text-center font-semibold">{quantity}</output>
              <button type="button" aria-label={`${t.quantity} + ${p.name}`} className={step} disabled={quantity >= p.stock}
                onClick={() => shop.setQuantity(p.id, quantity + 1)}>+</button>
            </span>
            <button type="button" className={`px-2 text-xs underline ${ctx.control}`} onClick={() => shop.setQuantity(p.id, 0)}>
              {t.remove}
            </button>
          </li>
        ))}
      </ul>
      <section data-part="detail" className="space-y-3 p-4">
        <p className="flex justify-between text-lg font-bold">
          <span>{t.total}</span><span>₹{total.toLocaleString("en-IN")}</span>
        </p>
        <button type="button" data-part="primary" className={`w-full px-3 ${ctx.control}`}
          onClick={() => { shop.placeOrder(); onView("order-placed"); }}>
          {t.placeOrder}
        </button>
      </section>
    </div>
  );
}
