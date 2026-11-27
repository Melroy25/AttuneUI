// What a layout adds to the storefront pages, so an adaptation is visible wherever the user is.
import type { PortalContext } from "@/components/portal/context";
import { PRESETS } from "@/lib/demo/catalog";
import { PAGE_TEXT, type Page } from "./text";
import type { Shop } from "./useShop";

const HINTS = {
  home: "hintHome", products: "hintProducts", orders: "hintOrders", returns: "hintReturns",
  reports: "hintReports", help: "hintHelp", cart: "hintCart",
} as const;

/** "Step hints" layout: one plain tip for the page in front of the user. */
export function StoreHint({ ctx, page }: { ctx: PortalContext; page: Page }) {
  return (
    <p data-part="hint" role="status" className="border-2 p-3 text-sm font-semibold">
      💡 {PAGE_TEXT[ctx.preferences.locale][HINTS[page]]}
    </p>
  );
}

/** "Simplified filters" layout: one tap instead of searching. */
export function Presets({ ctx, shop, onPick }: { ctx: PortalContext; shop: Shop; onPick: () => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  return (
    <div data-part="presets" className="flex flex-wrap gap-2 p-2">
      {PRESETS.map((preset) => (
        <button key={preset} type="button" data-part="preset" aria-pressed={shop.preset === preset}
          className={`rounded-full border px-4 text-sm font-semibold ${ctx.control}`}
          onClick={() => {
            shop.setPreset(shop.preset === preset ? "" : preset);
            shop.setCategory("");
            shop.setSelected(null);
            onPick();
          }}>
          {t[preset]}
        </button>
      ))}
    </div>
  );
}
