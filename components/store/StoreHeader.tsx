import type { ReactNode } from "react";
import type { PortalContext } from "@/components/portal/context";
import { hasKannada } from "@/lib/attune-ui/preferences/rules";
import { CATEGORIES, CATEGORY_ICONS, cartSummary } from "@/lib/demo/catalog";
import { LOCATIONS } from "@/lib/demo/quick";
import { DismissShortcut } from "./Habits";
import { PAGE_TEXT, categoryLabel, type Page } from "./text";
import type { Shop } from "./useShop";

/** Locked skeleton of the /demo store: brand, search, categories and navigation never move. */
export function StoreHeader({ ctx, shop, page, onPage, nav, actions, user }: {
  ctx: PortalContext;
  shop: Shop;
  page: Page;
  onPage: (page: Page) => void;
  nav: ReactNode;
  actions: ReactNode;
  user: string | null;
}) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const { count } = cartSummary(shop.cart);
  const showResults = () => { shop.setSelected(null); onPage("products"); };
  const help = () => { ctx.habits?.support(); onPage("help"); };

  return (
    <header data-part="header" className="space-y-3 pb-1">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" data-part="brand" data-tip="Go to home" className="min-h-11 px-4" onClick={() => onPage("home")}>
          <span data-part="mark" aria-hidden>V</span> VeroxaKart
        </button>
        {/* One support button: the promoted one takes the default one's place. */}
        {ctx.shortcuts?.on("support") ? (
          <>
            <button type="button" data-part="support-quick" data-tip="Get help & support" data-fresh={ctx.shortcuts.fresh} className="min-h-11 px-4 text-sm"
              onClick={() => { ctx.shortcuts?.use("support"); help(); }}>
              ⚡ {t.customerSupport}
            </button>
            <DismissShortcut ctx={ctx} kind="support" />
          </>
        ) : (
          <button type="button" data-part="pill" data-tip="Get help & support" className="min-h-11 px-4 text-sm" onClick={help}>
            🎧 {t.support}
          </button>
        )}
        <span data-attune-id="location" data-dead-context="location" className="ml-auto text-sm">
          📍 {t.deliverTo} {LOCATIONS[shop.location][ctx.preferences.locale]}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form role="search" data-part="searchbar" className="flex min-w-0 flex-1 basis-full items-center gap-2 px-3 sm:basis-0"
          onSubmit={(e) => {
            e.preventDefault();
            showResults();
          }}>
          <button type="submit" aria-label={t.search} data-tip="Search products" className="min-h-8 min-w-8">🔍</button>
          <input type="search" aria-label={t.searchProducts} placeholder={t.searchProducts} value={shop.query}
            className="min-h-11 min-w-0 flex-1 bg-transparent outline-none"
            onChange={(e) => { shop.setQuery(e.target.value); if (e.target.value) showResults(); }}
            onBlur={(e) => {
              const text = e.target.value.trim();
              if (text) ctx.onSignal({ textSearches: 1, kannada: hasKannada(text) ? 1 : 0 });
            }} />
        </form>
        <span data-attune-id="account" tabIndex={0}
          data-tip={user ? "Switch user in settings ⚙" : "Guest account"} className="px-2 text-sm">👤 {user ?? t.guest}</span>
        <button type="button" data-part="cart" data-tip="View cart" aria-current={page === "cart" ? "page" : undefined}
          className="relative ml-auto min-h-11 px-3 text-sm font-semibold" onClick={() => onPage("cart")}>
          🛒 {t.cart}
          {count > 0 && <span data-part="count">{count}</span>}
        </button>
        <div data-attune-ignore className="flex items-center gap-2">{actions}</div>
      </div>

      <div data-part="categories" className="flex gap-1 overflow-x-auto">
        {(["", ...CATEGORIES] as const).map((c) => {
          const active = c === "" ? page === "home" : page === "products" && shop.category === c;
          return (
            <button key={c || "for-you"} type="button" aria-current={active ? "true" : undefined}
              className={`flex min-w-20 flex-none flex-col items-center gap-1 px-2 py-1 text-xs ${ctx.control}`}
              onClick={() => {
                shop.setCategory(c);
                shop.setQuery("");
                shop.setPreset("");
                if (c) showResults();
                else onPage("home");
              }}>
              <span aria-hidden className="text-2xl">{c ? CATEGORY_ICONS[c] : "🛍️"}</span>
              {c ? categoryLabel(t, c) : t.forYou}
            </button>
          );
        })}
      </div>
      {nav}
    </header>
  );
}
