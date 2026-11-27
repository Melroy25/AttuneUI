import type { PortalContext } from "@/components/portal/context";
import { summarise } from "@/lib/demo/catalog";
import { PAGE_TEXT } from "./text";

/** Figures that look tappable but are not: a natural place for dead clicks and scrolling. */
export function ReportsPage({ ctx }: { ctx: PortalContext }) {
  const { s } = ctx;
  const t = PAGE_TEXT[ctx.preferences.locale];
  const sum = summarise();
  const tiles = [
    ["orders", t.totalOrders, String(sum.orders)],
    ["value", t.totalValue, `₹${sum.value.toLocaleString("en-IN")}`],
    ["delayed", t.delayedOrders, String(sum.delayed)],
  ];
  const charts: [string, string, [string, number][]][] = [
    ["status", t.byStatus, sum.byStatus],
    ["region", t.byRegion, sum.byRegion],
    ["payment", t.byPayment, sum.byPayment],
  ];
  const label = (key: string) => (s as Record<string, string>)[key] ?? key;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map(([id, title, value]) => (
          <div key={id} data-part="order" data-attune-id={`tile-${id}`} className="min-w-0 p-3">
            <p data-part="meta">{title}</p>
            <p className="break-words text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {charts.map(([id, title, rows]) => (
          <section key={id} data-part="detail" className="space-y-2 p-3 text-sm">
            <h2 className="font-bold">{title}</h2>
            {rows.map(([key, n]) => (
              <div key={key} data-attune-id={`bar-${id}-${key}`} className="flex items-center gap-2">
                <span className="w-28 shrink-0">{label(key)}</span>
                <span aria-hidden className="h-3 flex-1">
                  <span className="block h-3 rounded-r bg-[#2a78d6]" style={{ width: `${(n / rows[0][1]) * 100}%` }} />
                </span>
                <span className="w-6 text-right tabular-nums">{n}</span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
