import { useState } from "react";
import type { PortalContext } from "@/components/portal/context";
import { refundQueue } from "@/lib/demo/catalog";
import { PRODUCTS } from "@/lib/study/data";
import { PAGE_TEXT } from "./text";

type Verdict = "approved" | "rejected";

export function ReturnsPage({ ctx, onView }: { ctx: PortalContext; onView: (view: string) => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const [done, setDone] = useState<Record<string, Verdict>>({});
  const queue = refundQueue();
  const decide = (id: string, verdict: Verdict | null) => {
    setDone((d) => {
      const next = { ...d };
      if (verdict) next[id] = verdict;
      else delete next[id];
      return next;
    });
    onView(`return:${id}`);
    if (verdict) ctx.onGoal?.();
  };
  const small = `border px-2 text-xs ${ctx.control}`;

  return (
    <div className="space-y-2">
      {queue.every((o) => done[o.id]) && <p role="status" data-part="detail" className="p-3 text-sm">{t.noReturns}</p>}
      <ul className="space-y-2">
        {queue.map((o) => (
          <li key={o.id} data-part="order" className="flex flex-wrap items-center gap-3 p-3"
            data-attune-tap={`return-${o.id}`}>
            <span aria-hidden data-part="thumb" data-product={o.product}>{PRODUCTS[o.product]}</span>
            <div className="min-w-0 flex-1">
              <p data-text-id={`return:${o.id}:line`} className="text-sm"><strong>{o.id}</strong> · {o.customer}</p>
              <p data-text-id={`return:${o.id}:price`} data-part="price">₹{o.amount.toLocaleString("en-IN")}</p>
              <p data-text-id={`return:${o.id}:meta`} data-part="meta" data-attune-id={`meta-${o.id}`}>{o.region} · {o.payment}</p>
            </div>
            {done[o.id] ? (
              <span className="flex items-center gap-2 text-sm font-semibold">
                {t[done[o.id]]}
                <button type="button" className={small} onClick={() => decide(o.id, null)}>{t.undoAction}</button>
              </span>
            ) : (
              // Deliberately close together and small in the compact layout.
              <span className="flex gap-1">
                <button type="button" data-part="primary" data-target-id={`approve:${o.id}`} className={small} onClick={() => decide(o.id, "approved")}>{t.approve}</button>
                <button type="button" data-target-id={`reject:${o.id}`} className={small} onClick={() => decide(o.id, "rejected")}>{t.reject}</button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
