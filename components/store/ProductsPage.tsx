import { useState } from "react";
import type { PortalContext } from "@/components/portal/context";
import { hasKannada } from "@/lib/attune-ui/preferences/rules";
import { CATALOG, CATEGORIES, searchCatalog, type Category, type Product } from "@/lib/demo/catalog";
import { ArrowButton, useCardHint } from "./cardHint";
import { PAGE_TEXT } from "./text";

const stockOf = (p: Product) => (p.stock === 0 ? "outOfStock" : p.stock <= 5 ? "lowStock" : "inStock");

export function ProductsPage({ ctx, onView }: { ctx: PortalContext; onView: (view: string) => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [selected, setSelected] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState(0);
  const hint = useCardHint();
  const found = searchCatalog(query, category);
  const product = CATALOG.find((p) => p.id === selected);
  const open = (id: string) => {
    hint.clear(id);
    setSelected(id);
    setQuantity(1);
    onView(`product:${id}`);
  };

  return (
    <div className="space-y-3">
      <section data-part="filters" className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input type="search" aria-label={t.searchProducts} placeholder={t.searchProducts} value={query}
            className={`min-w-40 flex-1 border px-2 ${ctx.control}`} onChange={(e) => setQuery(e.target.value)}
            onBlur={(e) => {
              const text = e.target.value.trim();
              if (text) ctx.onSignal({ textSearches: 1, kannada: hasKannada(text) ? 1 : 0 });
            }} />
          <span data-part="cart" data-attune-id="cart" className="text-sm font-semibold">🛒 {t.cart}: {cart}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["", ...CATEGORIES] as const).map((c) => (
            <button key={c || "all"} type="button" data-part="preset" aria-pressed={category === c}
              className={`rounded-full border px-3 text-sm ${ctx.control}`} onClick={() => setCategory(c)}>
              {c ? t[c] : t.all}
            </button>
          ))}
        </div>
      </section>
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <ul className="grid content-start gap-2 sm:grid-cols-2">
          {found.length === 0 && <li className="p-3 text-sm">{t.noProducts}</li>}
          {found.map((p) => (
            <li key={p.id} data-part="order" data-selected={selected === p.id} className="flex items-center gap-3 p-3"
              {...hint.cardProps(p.id)}>
              <span aria-hidden data-part="thumb" data-attune-id={`thumb-${p.id}`}>{p.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{p.name}</p>
                <p data-part="price">₹{p.price.toLocaleString("en-IN")}</p>
                <span data-stock={stockOf(p)} data-attune-id={`stock-${p.id}`} className="text-xs font-semibold">
                  {t[stockOf(p)]}
                </span>
              </div>
              <ArrowButton ctx={ctx} label={`${ctx.s.openOrder} ${p.name}`} hint={hint.hinted(p.id)} onClick={() => open(p.id)} />
            </li>
          ))}
        </ul>
        {!product ? <p data-part="detail" className="self-start p-3 text-sm">{t.selectProduct}</p> : (
          <section data-part="detail" className="space-y-3 self-start p-3 text-sm">
            <h2 className="font-bold">{product.icon} {product.name}</h2>
            <p>{product.id} · {t[product.category]} · ₹{product.price.toLocaleString("en-IN")}</p>
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
              <button type="button" data-part="primary" disabled={product.stock === 0}
                className={`w-full px-3 disabled:pointer-events-none disabled:opacity-50 ${ctx.control}`}
                onClick={() => setCart(cart + quantity)}>
                {t.addToCart}
              </button>
            </span>
            {product.stock === 0 && <p>{t.outOfStock} · {t.notify}</p>}
          </section>
        )}
      </div>
    </div>
  );
}
