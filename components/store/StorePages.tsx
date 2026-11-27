import type { PortalContext } from "@/components/portal/context";
import { ArticlesPage } from "./ArticlesPage";
import { CartPage } from "./CartPage";
import { HelpPage } from "./HelpPage";
import { HomePage } from "./HomePage";
import { ProductsPage } from "./ProductsPage";
import { ReportsPage } from "./ReportsPage";
import { ReturnsPage } from "./ReturnsPage";
import { PAGE_TEXT, type Page } from "./text";
import type { Shop } from "./useShop";
import { WishlistPage } from "./WishlistPage";

const TABS = ["orders", "products", "returns", "reports", "help", "articles", "wishlist"] as const;

/** The same places in the same order on every surface: navigation never moves, it only gains a copy. */
export function StoreNav({ ctx, page, onPage }: { ctx: PortalContext; page: Page; onPage: (page: Page) => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const names: Record<(typeof TABS)[number], string> = {
    orders: ctx.s.orders, products: t.products, returns: t.returns, reports: ctx.s.reports, help: ctx.s.help,
    articles: t.articles, wishlist: `♥ ${t.wishlist}`,
  };
  return (
    <nav data-part="nav" className="flex flex-wrap gap-1 text-sm">
      {/* Earned in an earlier visit. A copy in front: the original keeps its place (invariant 9). */}
      {ctx.wishFirst && (
        <button type="button" data-part="wish-first" aria-current={page === "wishlist" ? "page" : undefined}
          data-tip="Used often last time" className="min-h-9 px-3" onClick={() => onPage("wishlist")}>
          {names.wishlist}
        </button>
      )}
      {TABS.map((p) => (
        <button key={p} type="button" data-cue={p === "wishlist" ? undefined : ctx.cues?.[p]} aria-current={page === p ? "page" : undefined}
          className="min-h-9 px-3" onClick={() => onPage(p)}>
          {names[p]}
        </button>
      ))}
    </nav>
  );
}

export function StorePage({ ctx, shop, page, onPage, onView }: {
  ctx: PortalContext;
  shop: Shop;
  page: Exclude<Page, "orders">;
  onPage: (page: Page) => void;
  onView: (view: string) => void;
}) {
  if (page === "home") return <HomePage ctx={ctx} shop={shop} onPage={onPage} />;
  if (page === "products") return <ProductsPage ctx={ctx} shop={shop} onView={onView} />;
  if (page === "wishlist") return <WishlistPage ctx={ctx} shop={shop} onPage={onPage} />;
  if (page === "articles") return <ArticlesPage ctx={ctx} shop={shop} onView={onView} />;
  if (page === "cart") return <CartPage ctx={ctx} shop={shop} onView={onView} />;
  if (page === "returns") return <ReturnsPage ctx={ctx} onView={onView} />;
  if (page === "reports") return <ReportsPage ctx={ctx} />;
  return <HelpPage ctx={ctx} />;
}
