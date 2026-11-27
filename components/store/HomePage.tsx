import { useEffect, useRef, useState } from "react";
import type { PortalContext } from "@/components/portal/context";
import { CATALOG, type Category, type Product } from "@/lib/demo/catalog";
import { PAGE_TEXT, type PageText } from "./text";
import type { Shop } from "./useShop";

const ROTATE_MS = 5000;
const BANNERS: { title: keyof PageText; note: keyof PageText; art: string; category: Category }[] = [
  { title: "banner1", note: "banner1Note", art: "💻🎧", category: "electronics" },
  { title: "banner2", note: "banner2Note", art: "👟🎒", category: "fashion" },
  { title: "banner3", note: "banner3Note", art: "🛋️💡", category: "home" },
];

function Rail({ title, items, dark, ctx, onOpen, onAdd }: {
  title: string;
  items: Product[];
  dark?: boolean;
  ctx: PortalContext;
  onOpen: (id: string) => void;
  onAdd: (id: string) => void;
}) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const track = useRef<HTMLUListElement>(null);
  const slide = (direction: number) =>
    track.current?.scrollBy({ left: direction * track.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section data-part="rail" data-dark={dark} className="relative space-y-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 data-attune-id="rail-title" className="text-lg font-bold">{title}</h2>
        <span className="flex gap-1">
          {([[-1, "‹", t.previous], [1, "›", t.nextItems]] as const).map(([d, glyph, label]) => (
            <button key={label} type="button" data-part="slide" aria-label={label} onClick={() => slide(d)}
              className="grid h-10 w-10 place-items-center text-2xl">{glyph}</button>
          ))}
        </span>
      </div>
      <ul ref={track} className="flex gap-3 overflow-x-auto pb-1">
        {items.map((p) => (
          <li key={p.id} className="w-40 flex-none sm:w-48">
            <button type="button" data-part="tile" className="relative block w-full p-1.5 text-left" onClick={() => onOpen(p.id)}>
              {p.off > 0 && <span data-part="off">↓{p.off}%</span>}
              <span aria-hidden data-part="art" className="grid h-32 place-items-center text-6xl sm:h-40">{p.icon}</span>
              <span className="mt-1 block truncate text-sm">{p.name}</span>
              <span className="block font-bold">₹{p.price.toLocaleString("en-IN")}</span>
            </button>
            {ctx.surface.quickActions.length > 0 && p.stock > 0 && (
              <button type="button" data-part="quick-add" aria-label={`${t.addToCart}: ${p.name}`}
                className={`mt-1 w-full text-sm ${ctx.control}`} onClick={() => onAdd(p.id)}>
                {t.quickAdd}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomePage({ ctx, shop, onPage }: { ctx: PortalContext; shop: Shop; onPage: (page: "products") => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const [first, setFirst] = useState(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setFirst((i) => (i + 1) % BANNERS.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const open = (id: string) => { shop.setCategory(""); shop.setQuery(""); shop.setSelected(id); onPage("products"); };
  const browse = (category: Category) => { shop.setCategory(category); shop.setQuery(""); shop.setSelected(null); onPage("products"); };
  const deals = [...CATALOG].sort((a, b) => b.off - a.off);
  const add = (id: string) => shop.setQuantity(id, (shop.cart[id] ?? 0) + 1);
  const extra = (
    <>
      <Rail title={t.topDeals} ctx={ctx} onOpen={open} onAdd={add} items={deals.slice(0, 10)} />
      <Rail title={t.homePicks} ctx={ctx} onOpen={open} onAdd={add}
        items={CATALOG.filter((p) => p.category === "home" || p.category === "appliances" || p.category === "furniture")} />
    </>
  );

  return (
    <div className="space-y-3">
      <section aria-label={t.sale} className="space-y-1">
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((slot) => {
            const index = (first + slot) % BANNERS.length;
            const b = BANNERS[index];
            return (
              <div key={slot} data-part="banner" data-tone={index} data-attune-id={`banner-${index}`}
                className={`min-h-44 items-center justify-between gap-2 p-5 text-white ${slot ? "hidden md:flex" : "flex"}`}>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide">{t.sale}</p>
                  <h2 className="text-2xl font-extrabold">{t[b.title]}</h2>
                  <p>{t[b.note]}</p>
                  <button type="button" data-part="shop" className={`px-4 text-sm ${ctx.control}`} onClick={() => browse(b.category)}>
                    {t.shopNow}
                  </button>
                </div>
                <span aria-hidden className="text-5xl sm:text-6xl">{b.art}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-1">
          {BANNERS.map((b, i) => (
            <button key={b.title} type="button" aria-label={t[b.title]} aria-current={i === first ? "true" : undefined}
              data-part="dot" className="grid h-6 w-6 place-items-center" onClick={() => setFirst(i)}>
              <span />
            </button>
          ))}
        </div>
      </section>
      <Rail dark title={t.stillLooking} ctx={ctx} onOpen={open} onAdd={add} items={CATALOG.slice(12, 22)} />
      {/* "Simplified" layout: extra shelves are folded away, never removed. */}
      {ctx.surface.secondaryFilters === "collapsed" ? (
        <details data-part="more" className="space-y-3">
          <summary className={`cursor-pointer p-3 font-bold ${ctx.control}`}>{t.moreOffers}</summary>
          {extra}
        </details>
      ) : extra}
    </div>
  );
}
