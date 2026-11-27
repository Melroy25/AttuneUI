"use client";

import { useState } from "react";
import type { Order } from "@/lib/study/data";
import type { PortalContext } from "./context";

export function RefundDialog({ ctx, order, onConfirm, onClose }: {
  ctx: PortalContext;
  order: Order;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}) {
  const { s, control } = ctx;
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-title"
        className="w-full max-w-sm space-y-3 rounded-lg bg-white p-4"
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        onSubmit={(e) => {
          e.preventDefault();
          const amount = Number(value);
          if (amount > 0 && amount <= order.amount) onConfirm(amount);
          else setError(true);
        }}
      >
        <h2 id="refund-title" className="font-bold">{s.refund} · {order.id} (₹{order.amount})</h2>
        <label className="block text-sm">
          {s.refundAmount}
          <input
            autoFocus
            inputMode="numeric"
            className={`mt-1 w-full rounded border px-2 ${control}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{s.invalidAmount}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={`rounded border px-3 ${control}`} onClick={onClose}>{s.cancel}</button>
          <button type="submit" className={`rounded bg-indigo-600 px-3 text-white ${control}`}>{s.confirm}</button>
        </div>
      </form>
    </div>
  );
}
