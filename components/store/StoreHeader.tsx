import type { ReactNode } from "react";

/** /demo storefront header. The navigation keeps its place and its telemetry labels. */
export function StoreHeader({ title, nav, actions }: { title: string; nav: ReactNode; actions: ReactNode }) {
  return (
    <header data-part="header" className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 text-white">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span aria-hidden data-part="mark">V</span>
        <div className="min-w-0">
          <p data-part="brand">Veroxa<span>Kart</span></p>
          <h1 className="truncate text-xs font-medium text-blue-100">{title}</h1>
        </div>
      </div>
      <div className="order-last w-full sm:order-none sm:w-auto">{nav}</div>
      <div data-attune-ignore className="flex items-center gap-2">{actions}</div>
    </header>
  );
}
