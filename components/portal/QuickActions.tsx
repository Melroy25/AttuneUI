import { NO_FILTERS, type Filters } from "@/lib/study/tasks";
import type { PortalContext } from "./context";

export function QuickActions({ ctx, selected, onFilter, onRefund }: {
  ctx: PortalContext;
  selected: string | null;
  onFilter: (filters: Filters) => void;
  onRefund: (orderId: string) => void;
}) {
  const { s, surface, control } = ctx;
  return (
    <section aria-label={s.quick} className="flex flex-wrap items-center gap-2 rounded border border-indigo-300 bg-indigo-50 p-2">
      <strong className="text-sm">{s.quick}</strong>
      {surface.quickActions.map((action) => (
        <button
          key={action}
          type="button"
          disabled={action === "refund" && !selected}
          className={`rounded bg-indigo-600 px-3 text-sm text-white disabled:opacity-40 ${control}`}
          onClick={() => {
            if (action === "refund") { if (selected) onRefund(selected); return; }
            onFilter(
              action === "findDelayed"
                ? { ...NO_FILTERS, status: "delayed" }
                : { ...NO_FILTERS, status: "refund_requested", priority: "high" },
            );
          }}
        >
          {s[action]}
        </button>
      ))}
    </section>
  );
}
