import type { PortalContext } from "@/components/portal/context";
import { CATEGORY_ICONS, type Category } from "@/lib/demo/catalog";
import { ArticlesPage } from "./ArticlesPage";
import { CartPage } from "./CartPage";
import { HelpPage } from "./HelpPage";
import { HomePage } from "./HomePage";
import { ProductsPage } from "./ProductsPage";
import { ReportsPage } from "./ReportsPage";
import { ReturnsPage } from "./ReturnsPage";
import { PAGE_TEXT, categoryLabel, type Page } from "./text";
import type { Shop } from "./useShop";

const TABS = ["orders", "products", "returns", "reports", "help", "articles"] as const;

/** The same places in the same order on every surface: navigation never moves, it only gains a copy. */
export function StoreNav({ ctx, page, onPage }: { ctx: PortalContext; page: Page; onPage: (page: Page) => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const names: Record<(typeof TABS)[number], string> = {
    orders: ctx.s.orders, products: t.products, returns: t.returns, reports: ctx.s.reports, help: ctx.s.help,
    articles: t.articles,
  };
  return (
    <nav data-part="nav" className="flex flex-wrap gap-1 text-sm">
      {/* Earned in an earlier visit. A copy in front: the original keeps its place (invariant 9). */}
      {ctx.front?.map((part) => {
        const category = part.startsWith("category:") ? (part.slice(9) as Category) : null;
        const label = category ? `${CATEGORY_ICONS[category]} ${categoryLabel(t, category)}`
          : part === "cart" ? `🛒 ${t.cart}` : names[part as (typeof TABS)[number]];
        return (
          <button key={part} type="button" data-part="front" data-tip="Used often last time"
            aria-current={!category && page === part ? "page" : undefined}
            className="min-h-9 px-3" onClick={() => ctx.onFront?.(part)}>{label}</button>
        );
      })}
      {TABS.map((p) => (
        <button key={p} type="button" data-cue={ctx.cues?.[p]} aria-current={page === p ? "page" : undefined}
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
  if (page === "articles") return <ArticlesPage ctx={ctx} shop={shop} onView={onView} />;
  if (page === "cart") return <CartPage ctx={ctx} shop={shop} onView={onView} />;
  if (page === "returns") return <ReturnsPage ctx={ctx} onView={onView} />;
  if (page === "reports") return <ReportsPage ctx={ctx} />;
  return <HelpPage ctx={ctx} />;
}
