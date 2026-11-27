"use client";

import { useState, type ReactNode } from "react";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreOrderList } from "@/components/store/StoreOrderList";
import { StoreNav, StorePage } from "@/components/store/StorePages";
import type { Page } from "@/components/store/text";
import type { PreferenceSignals, Preferences } from "@/lib/attune-ui/preferences/rules";
import type { SurfaceConfig } from "@/lib/attune-ui/surface/catalog";
import { ORDERS } from "@/lib/study/data";
import { NO_FILTERS, applyFilters, type Filters as FilterState, type PortalAction, type Task } from "@/lib/study/tasks";
import type { PortalContext } from "./context";
import { Filters } from "./Filters";
import { OrderDetail } from "./OrderDetail";
import { OrderTable } from "./OrderTable";
import { PolicyCard } from "./PolicyCard";
import { QuickActions } from "./QuickActions";
import { RefundDialog } from "./RefundDialog";
import { STRINGS, taskText } from "./strings";

const HINT = { findDelayed: "hintFind", filterRefunds: "hintFilter", partialRefund: "hintRefund" } as const;

/** /demo only: storefront styling plus app chrome. The study never passes this. */
export interface StoreChrome {
  actions: ReactNode;
  banner: ReactNode;
  page: Page; // held by the caller, so a new block stays on the same page
  onPage: (page: Page) => void;
}

export function Portal({ surface, preferences, task, onAction, onSignal, onView, store }: {
  surface: SurfaceConfig;
  preferences: Preferences;
  task: Task | null;
  onAction: (action: PortalAction) => void;
  onSignal: (delta: Partial<PreferenceSignals>) => void;
  onView: (view: string) => void;
  store?: StoreChrome;
}) {
  const [filters, setFilters] = useState<FilterState>(NO_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const large = surface.targetSize === "large";
  const ctx: PortalContext = {
    s: STRINGS[preferences.locale], surface, preferences, large, onSignal,
    control: large ? "min-h-12 min-w-12 text-base" : "min-h-6",
  };
  const { s } = ctx;

  const filter = (next: FilterState) => {
    setFilters(next);
    onAction({ type: "filter", filters: next });
  };
  const open = (id: string) => {
    setSelected(id);
    onView(`order:${id}`);
    onAction({ type: "open", orderId: id });
  };
  const startRefund = (id: string) => {
    setSelected(id);
    setRefunding(id);
    onView(`refund:${id}`);
  };
  const closeRefund = () => {
    setRefunding(null);
    onView(selected ? `order:${selected}` : "list");
  };
  const refundOrder = ORDERS.find((o) => o.id === refunding);
  const showList = () => { setSelected(null); filter(NO_FILTERS); onView("list"); };
  const page = store?.page ?? "orders";
  const nav = store ? (
    <StoreNav ctx={ctx} page={page} onPage={(next) => {
      store.onPage(next);
      if (next === "orders") showList();
      else onView(`page:${next}`);
    }} />
  ) : (
    <nav className="flex gap-3 text-sm">
      <button type="button" onClick={showList}>{s.orders}</button>
      <span data-attune-id="nav-reports">{s.reports}</span>
      <span data-attune-id="nav-help">{s.help}</span>
    </nav>
  );
  const List = store ? StoreOrderList : OrderTable;

  return (
    <div lang={preferences.locale} className={`${store ? "store " : ""}space-y-3 pb-20 sm:pb-0`}>
      {/* Locked skeleton: header and navigation never change position. */}
      {store ? (
        <StoreHeader title={s.title} nav={nav} actions={store.actions} />
      ) : (
        <header className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-900 p-3 text-white">
          <h1 className="font-bold">{s.title}</h1>
          {nav}
        </header>
      )}
      {store?.banner}
      {page !== "orders" ? <StorePage ctx={ctx} page={page} onView={onView} /> : (<>
      {surface.stepHints && task && (
        <p data-part="hint" className="rounded border border-sky-400 bg-sky-50 p-2 text-sm">
          {/* The /demo cards have an arrow where the study table has an Open button. */}
          {s[store && task.id === "findDelayed" ? "hintFindArrow" : HINT[task.id]]}
        </p>
      )}
      {surface.quickActions.length > 0 && (
        <QuickActions ctx={ctx} selected={selected} onFilter={filter} onRefund={startRefund} />
      )}
      <Filters ctx={ctx} filters={filters} onChange={filter} />
      {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <List
          ctx={ctx}
          orders={applyFilters(ORDERS, filters)}
          selected={selected}
          onOpen={open}
          onBadge={startRefund}
        />
        <div className="space-y-3">
          <OrderDetail
            ctx={ctx}
            order={ORDERS.find((o) => o.id === selected) ?? null}
            onRefund={() => selected && startRefund(selected)}
          />
          <PolicyCard ctx={ctx} />
        </div>
      </div>
      </>)}
      {refundOrder && (
        <RefundDialog
          ctx={ctx}
          order={refundOrder}
          onClose={closeRefund}
          onConfirm={(amount) => {
            setNotice(`${s.refunded}: ₹${amount} · ${refundOrder.id}`);
            onAction({ type: "refund", orderId: refundOrder.id, amount });
            closeRefund();
          }}
        />
      )}
    </div>
  );
}
