import type { Order } from "@/lib/study/data";
import type { PortalContext } from "./context";

export function OrderDetail({ ctx, order, onRefund }: {
  ctx: PortalContext;
  order: Order | null;
  onRefund: () => void;
}) {
  const { s, surface, control } = ctx;
  if (!order) return <p data-part="detail" className="rounded border p-3 text-sm">{s.selectOrder}</p>;
  return (
    <section data-part="detail" className="rounded border p-3 text-sm">
      <div className="flex items-start justify-between">
        <h2 className="font-bold">{order.id}</h2>
        {/* The buried path stays in every surface: adaptations duplicate, never move. */}
        <details key={order.id} className="relative">
          <summary aria-label={s.moreActions} className={`cursor-pointer list-none rounded px-2 ${control}`}>⋯</summary>
          <div className="absolute right-0 z-10 flex w-44 flex-col rounded border bg-white p-1 shadow">
            <button type="button" className={`text-left ${control}`}>{s.printSlip}</button>
            <button type="button" className={`text-left ${control}`}>{s.contact}</button>
            <button type="button" className={`text-left ${control}`} onClick={onRefund}>{s.refund}</button>
          </div>
        </details>
      </div>
      <dl className="grid grid-cols-2 gap-1">
        <dt>{s.customer}</dt><dd>{order.customer}</dd>
        <dt>{s.status}</dt><dd data-attune-id="detail-status">{s[order.status]}</dd>
        <dt>{s.priority}</dt><dd>{s[order.priority]}</dd>
        <dt>{s.region}</dt><dd>{order.region}</dd>
        <dt>{s.courier}</dt><dd>{order.courier}</dd>
        <dt>{s.payment}</dt><dd>{order.payment}</dd>
        <dt>{s.amount}</dt><dd>₹{order.amount}</dd>
      </dl>
      {surface.thumbZoneCta && (
        <button
          type="button"
          data-thumb-cta
          className="fixed inset-x-4 bottom-4 z-20 min-h-14 rounded-xl bg-indigo-600 text-base font-semibold text-white shadow-lg sm:static sm:mt-3 sm:w-full"
          onClick={onRefund}
        >
          {s.refund} · {order.id}
        </button>
      )}
    </section>
  );
}
