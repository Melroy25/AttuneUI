import type { PortalContext } from "@/components/portal/context";
import { HelpPage } from "./HelpPage";
import { ProductsPage } from "./ProductsPage";
import { ReportsPage } from "./ReportsPage";
import { ReturnsPage } from "./ReturnsPage";
import { PAGES, PAGE_TEXT, type Page } from "./text";

/** The same five places in the same order on every surface: navigation never moves. */
export function StoreNav({ ctx, page, onPage }: { ctx: PortalContext; page: Page; onPage: (page: Page) => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const names: Record<Page, string> = {
    orders: ctx.s.orders, products: t.products, returns: t.returns, reports: ctx.s.reports, help: ctx.s.help,
  };
  return (
    <nav data-part="nav" className="flex flex-wrap gap-1 text-sm">
      {PAGES.map((p) => (
        <button key={p} type="button" aria-current={page === p ? "page" : undefined}
          className="min-h-8 px-2" onClick={() => onPage(p)}>
          {names[p]}
        </button>
      ))}
    </nav>
  );
}

export function StorePage({ ctx, page, onView }: {
  ctx: PortalContext;
  page: Exclude<Page, "orders">;
  onView: (view: string) => void;
}) {
  if (page === "products") return <ProductsPage ctx={ctx} onView={onView} />;
  if (page === "returns") return <ReturnsPage ctx={ctx} onView={onView} />;
  if (page === "reports") return <ReportsPage ctx={ctx} />;
  return <HelpPage ctx={ctx} />;
}
