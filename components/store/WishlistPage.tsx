import type { PortalContext } from "@/components/portal/context";
import { CATALOG } from "@/lib/demo/catalog";
import { ORDERS, PRODUCTS } from "@/lib/study/data";
import { WishlistButton } from "./Habits";
import { PAGE_TEXT } from "./text";
import type { Shop } from "./useShop";

/** What the user saved with ♡: products and orders, newest first. */
export function WishlistPage({ ctx, shop, onPage }: { ctx: PortalContext; shop: Shop; onPage: (page: "products") => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const ids = [...(ctx.habits?.habits.wished ?? [])].reverse();
  type Row = { id: string; icon: string; name: string; price: number; open: string | null };
  const rows = ids.flatMap((id): Row[] => {
    const product = CATALOG.find((p) => p.id === id);
    if (product) return [{ id, icon: product.icon, name: product.name, price: product.price, open: product.id }];
    const order = ORDERS.find((o) => o.id === id);
    return order ? [{ id, icon: PRODUCTS[order.product], name: `${order.id} · ${order.customer}`, price: order.amount, open: null }] : [];
  });

  return (
    <div className="space-y-2">
      <h2 data-text-id="wishlist:heading" className="font-bold">♥ {t.wishlist} ({rows.length})</h2>
      {rows.length === 0 && <p data-part="detail" className="p-3 text-sm">{t.emptyWishlist}</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.id} data-part="order" className="flex items-center gap-3 p-3">
            <span aria-hidden data-part="thumb">{r.icon}</span>
            <div className="min-w-0 flex-1">
              <p data-text-id={`wishlist:${r.id}:name`} className="text-sm font-semibold">{r.name}</p>
              <p data-text-id={`wishlist:${r.id}:price`} data-part="price">₹{r.price.toLocaleString("en-IN")}</p>
            </div>
            {r.open && (
              <button type="button" className={`rounded-lg border px-3 text-sm ${ctx.control}`}
                onClick={() => { shop.setQuery(""); shop.setCategory(""); shop.setSelected(r.open); onPage("products"); }}>
                {t.viewDetails}
              </button>
            )}
            <WishlistButton ctx={ctx} id={r.id} compact />
          </li>
        ))}
      </ul>
    </div>
  );
}
