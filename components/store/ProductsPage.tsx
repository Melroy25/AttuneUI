import { useState } from "react";
import type { PortalContext } from "@/components/portal/context";
import { CATALOG, searchCatalog, type Product } from "@/lib/demo/catalog";
import { ArrowButton, useCardHint } from "./cardHint";
import { PAGE_TEXT, categoryLabel } from "./text";
import type { Shop } from "./useShop";

const stockOf = (p: Product) => (p.stock === 0 ? "outOfStock" : p.stock <= 5 ? "lowStock" : "inStock");

export function ProductsPage({ ctx, shop, onView }: { ctx: PortalContext; shop: Shop; onView: (view: string) => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const [quantity, setQuantity] = useState(1);
  const hint = useCardHint();
  // A preset only filters while the layout that shows its buttons is on screen.
  const found = searchCatalog(shop.query, shop.category, ctx.surface.smartPresets ? shop.preset : "");
  const product = CATALOG.find((p) => p.id === shop.selected);
  const inCart = product ? shop.cart[product.id] ?? 0 : 0;
  const open = (id: string) => {
    hint.clear(id);
    shop.setSelected(id);
    setQuantity(1);
    onView(`product:${id}`);
  };

  return (
    <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
      <div className="order-2 space-y-2 md:order-1">
        <h2 data-attune-id="results-title" className="font-bold">
          {shop.category ? categoryLabel(t, shop.category) : t.products} ({found.length})
        </h2>
        <ul className="grid content-start gap-2 sm:grid-cols-2">
          {found.length === 0 && <li className="p-3 text-sm">{t.noProducts}</li>}
          {found.map((p) => (
            <li key={p.id} data-part="order" data-selected={shop.selected === p.id} className="flex items-center gap-3 p-3"
              {...hint.cardProps(p.id)}>
              <span aria-hidden data-part="thumb" data-attune-id={`thumb-${p.id}`}>{p.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{p.name}</p>
                <p data-part="price">₹{p.price.toLocaleString("en-IN")}</p>
                <span data-stock={stockOf(p)} data-attune-id={`stock-${p.id}`} className="text-xs font-semibold">
                  {t[stockOf(p)]}
                </span>
              </div>
              {ctx.surface.quickActions.length > 0 && p.stock > 0 && (
                <button type="button" data-part="quick-add" aria-label={`${t.addToCart}: ${p.name}`}
                  className={`flex-none px-3 text-xs ${ctx.control}`}
                  onClick={() => shop.setQuantity(p.id, (shop.cart[p.id] ?? 0) + 1)}>
                  {t.quickAdd}
                </button>
              )}
              <ArrowButton ctx={ctx} label={`${ctx.s.openOrder} ${p.name}`} hint={hint.hinted(p.id)} onClick={() => open(p.id)} />
            </li>
          ))}
        </ul>
      </div>
      {!product ? <p data-part="detail" className="order-1 hidden self-start p-3 text-sm md:order-2 md:block">{t.selectProduct}</p> : (
        <section data-part="detail" className="order-1 space-y-3 self-start p-3 text-sm md:order-2">
          <div aria-hidden data-part="art" data-attune-id="detail-art" className="grid h-40 place-items-center text-7xl">{product.icon}</div>
          <h2 className="text-base font-bold">{product.name}</h2>
          <p>
            <span data-part="price" className="text-xl">₹{product.price.toLocaleString("en-IN")}</span>{" "}
            {product.off > 0 && <span data-stock="inStock" className="font-semibold">↓{product.off}%</span>}
          </p>
          <div className="flex items-center gap-2">
            <span>{t.quantity}</span>
            <button type="button" aria-label={`${t.quantity} −`} className={`w-8 border ${ctx.control}`}
              disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}>−</button>
            <output className="w-6 text-center font-semibold">{quantity}</output>
            <button type="button" aria-label={`${t.quantity} +`} className={`w-8 border ${ctx.control}`}
              disabled={quantity >= product.stock} onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>
          {/* A disabled button that looks tappable: taps on it are sensed as dead clicks. */}
          <span className="block" data-attune-tap={`buy-${product.id}`}>
            <button type="button" data-part="primary" disabled={product.stock === 0 || inCart >= product.stock}
              className={`w-full px-3 disabled:pointer-events-none disabled:opacity-50 ${ctx.control}`}
              onClick={() => shop.setQuantity(product.id, inCart + quantity)}>
              {t.addToCart}
            </button>
          </span>
          {inCart > 0 && <p role="status">🛒 {t.cart}: {inCart}</p>}
          {product.stock === 0 && <p>{t.outOfStock} · {t.notify}</p>}
        </section>
      )}
    </div>
  );
}
