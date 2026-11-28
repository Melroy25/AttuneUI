"use client";

import { useState } from "react";
import { hasKannada } from "@/lib/attune-ui/preferences/rules";
import { PRODUCTS, type Product } from "@/lib/study/data";
import { NO_FILTERS, type Filters as FilterState } from "@/lib/study/tasks";
import type { PortalContext } from "./context";
import { OrdersUndo } from "@/components/demo/Zones";

const OPTIONS = {
  status: ["delayed", "refund_requested", "shipped", "delivered"],
  priority: ["high", "normal", "low"],
  region: ["North", "South", "East", "West"],
  courier: ["BlueDart", "Delhivery", "IndiaPost"],
  payment: ["UPI", "Card", "COD"],
} as const;
type Key = keyof typeof OPTIONS;
const PRIMARY: Key[] = ["status", "priority"];
const SECONDARY: Key[] = ["region", "courier", "payment"];

export function Filters({ ctx, filters, onChange }: {
  ctx: PortalContext;
  filters: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const { s, surface, preferences, control, onSignal } = ctx;
  const [photoOpen, setPhotoOpen] = useState(false);
  const photoFirst = preferences.searchFirst === "photo";

  const select = (key: Key) => (
    <label key={key} className="flex flex-col text-xs" data-attune-id={`filter-${key}`}>
      {s[key]}
      <select
        className={`rounded border bg-white ${control}`}
        value={filters[key]}
        onChange={(e) => onChange({ ...filters, [key]: e.target.value })}
      >
        <option value="">{s.any}</option>
        {OPTIONS[key].map((v) => (
          <option key={v} value={v}>{(s as Record<string, string>)[v] ?? v}</option>
        ))}
      </select>
    </label>
  );

  const textSearch = (
    <input
      type="search"
      aria-label={s.search}
      placeholder={s.search}
      className={`min-w-48 flex-1 rounded border px-2 ${control}`}
      value={filters.query}
      onChange={(e) => onChange({ ...filters, query: e.target.value })}
      onBlur={(e) => {
        const text = e.target.value.trim();
        if (text) onSignal({ textSearches: 1, kannada: hasKannada(text) ? 1 : 0 });
      }}
    />
  );
  const photoToggle = (
    <button
      type="button"
      data-part="photo"
      data-first={photoFirst}
      aria-expanded={photoOpen}
      className={`rounded border px-3 ${control} ${photoFirst ? "order-first bg-indigo-600 text-white" : ""}`}
      onClick={() => setPhotoOpen(!photoOpen)}
    >
      📷 {s.photoSearch}
    </button>
  );

  return (
    <section data-part="filters" className="space-y-2">
      <div className="flex flex-wrap gap-2">{textSearch}{photoToggle}</div>
      {(photoOpen || photoFirst) && (
        <div data-part="photo-panel" className="rounded border p-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRODUCTS) as Product[]).map((p) => (
              <button
                key={p}
                type="button"
                aria-label={p}
                aria-pressed={filters.product === p}
                className={`rounded border text-2xl aria-pressed:bg-indigo-100 ${ctx.large ? "h-14 w-14" : "h-9 w-9"}`}
                onClick={() => {
                  if (filters.product !== p) onSignal({ photoSearches: 1 });
                  onChange({ ...filters, product: filters.product === p ? "" : p });
                }}
              >
                {PRODUCTS[p]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-600">{s.photoNote}</p>
        </div>
      )}

      {surface.smartPresets && (
        <div className="flex flex-wrap gap-2">
          {([["presetRefunds", "refund_requested"], ["presetDelayed", "delayed"]] as const).map(
            ([label, status]) => (
              <button
                key={label}
                type="button"
                data-part="preset"
                className={`rounded-full border border-indigo-600 px-3 text-indigo-700 ${control}`}
                onClick={() => onChange({ ...NO_FILTERS, status, priority: "high" })}
              >
                {s[label]}
              </button>
            ),
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        {PRIMARY.map(select)}
        {surface.secondaryFilters === "expanded" ? (
          SECONDARY.map(select)
        ) : (
          <details>
            <summary className={`cursor-pointer text-sm ${control}`}>{s.more}</summary>
            <div className="flex flex-wrap gap-2">{SECONDARY.map(select)}</div>
          </details>
        )}
        <button type="button" className={`rounded border px-2 text-sm ${control}`} onClick={() => onChange(NO_FILTERS)}>
          {s.clear}
        </button>
        <OrdersUndo locale={preferences.locale} className={`rounded border px-2 text-sm ${control}`} />
      </div>
    </section>
  );
}
