"use client";

import { useState, type ReactNode } from "react";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreOrderList } from "@/components/store/StoreOrderList";
import { Presets, StoreHint } from "@/components/store/SurfaceExtras";
import { StoreNav, StorePage } from "@/components/store/StorePages";
import type { Page } from "@/components/store/text";
import type { Shop } from "@/components/store/useShop";
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
import { STRINGS } from "./strings";

const HINT = { findDelayed: "hintFind", filterRefunds: "hintFilter", partialRefund: "hintRefund" } as const;

/** /demo only: storefront styling plus app chrome. The study never passes this. */
export interface StoreChrome {
  actions: ReactNode;
  page: Page; // held by the caller, so a new block stays on the same page
  onPage: (page: Page) => void;
  shop: Shop;
  user: string | null;
  onGoal: () => void;
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
    s: STRINGS[preferences.locale], surface, preferences, large, onSignal, onGoal: store?.onGoal,
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
  const goTo = (next: Page) => {
    store?.onPage(next);
    if (next === "orders") showList();
    else onView(`page:${next}`);
  };
  const nav = store ? <StoreNav ctx={ctx} page={page} onPage={goTo} /> : (
    <nav className="flex gap-3 text-sm">
      <button type="button" onClick={showList}>{s.orders}</button>
      <span data-attune-id="nav-reports">{s.reports}</span>
      <span data-attune-id="nav-help">{s.help}</span>
    </nav>
  );
  const List = store ? StoreOrderList : OrderTable;

  return (
    <div lang={preferences.locale} data-surface={store ? surface.arm : undefined}
      className={`${store ? "store " : ""}space-y-3 pb-20 sm:pb-0`}>
      {/* Locked skeleton: header and navigation never change position. */}
      {store ? (
        <StoreHeader ctx={ctx} shop={store.shop} page={page} onPage={goTo} nav={nav} actions={store.actions} user={store.user} />
      ) : (
        <header className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-900 p-3 text-white">
          <h1 className="font-bold">{s.title}</h1>
          {nav}
        </header>
      )}
      {store && surface.stepHints && <StoreHint ctx={ctx} page={page} />}
      {store && surface.smartPresets && (page === "home" || page === "products") && (
        <Presets ctx={ctx} shop={store.shop} onPick={() => goTo("products")} />
      )}
      {/* Shortcuts stay visible away from Orders, so an adaptation is seen on every page. */}
      {store && page !== "orders" && surface.quickActions.length > 0 && (
        <QuickActions ctx={ctx} selected={selected} onRefund={startRefund}
          onFilter={(next) => { store.onPage("orders"); filter(next); }} />
      )}
      {store && page !== "orders" ? (
        <StorePage ctx={ctx} shop={store.shop} page={page} onPage={goTo} onView={onView} />
      ) : (<>
      {!store && surface.stepHints && task && (
        <p data-part="hint" className="rounded border border-sky-400 bg-sky-50 p-2 text-sm">{s[HINT[task.id]]}</p>
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
