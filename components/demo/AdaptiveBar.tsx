import type { ReactNode } from "react";
import { PAGE_TEXT } from "@/components/store/text";
import type { Shop } from "@/components/store/useShop";
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import type { Change } from "@/lib/demo/activity";
import { CATALOG } from "@/lib/demo/catalog";
import { SPECS, type Prompt } from "@/lib/demo/quick";
import { HesitationCard } from "./HesitationCard";
import { LocationPopover } from "./LocationPopover";
import type { useHesitation } from "./useHesitation";
import type { useQuickPrompt } from "./useQuickPrompt";

const card = "pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 text-sm shadow-xl";
const main = "min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white disabled:opacity-50";
const other = "min-h-11 rounded-lg border border-slate-300 px-3 font-semibold";

/** Floats above the page, so nothing in the store moves when it appears. */
export function AdaptiveBar({ pill, locale, quick, shop, comfort, hesitation, onView, onCategory, onAdded, log }: {
  pill: ReactNode;
  locale: Locale;
  quick: ReturnType<typeof useQuickPrompt>;
  shop: Shop;
  comfort: { on: boolean; undo: () => void };
  hesitation: ReturnType<typeof useHesitation>;
  onView: (id: string) => void;
  onCategory: Parameters<typeof HesitationCard>[0]["onCategory"];
  onAdded: () => void;
  log: (change: Change) => void;
}) {
  const t = PAGE_TEXT[locale];
  const { prompt, setPrompt, aboutClicked } = quick;
  const find = (id?: string) => CATALOG.find((p) => p.id === id);
  const product = prompt?.kind === "product" ? find(prompt.id) : undefined;
  const cart = prompt?.kind === "cart" ? { latest: find(prompt.latest), clicked: find(prompt.id) } : undefined;
  const close = (
    <button type="button" aria-label={t.close} data-tip={t.close} className={`${other} ml-auto min-w-11`}
      onClick={() => quick.dismiss()}>✕</button>
  );

  return (
    <>
      {(prompt?.kind === "location" || prompt?.kind === "changer") && (
        <LocationPopover locale={locale} prompt={prompt} setPrompt={setPrompt} shop={shop} log={log} />
      )}
      <div lang={locale} className="pointer-events-none fixed inset-x-2 bottom-2 z-40 flex max-w-md flex-col gap-2 text-slate-900 sm:left-auto sm:w-96">
        {pill}
        <HesitationCard locale={locale} hesitation={hesitation} onProduct={onView} onCategory={onCategory} />
        {cart?.latest && cart.clicked && (
          <section aria-live="polite" className={`${card} border-blue-600`}>
            <span aria-hidden className="text-3xl">{cart.latest.icon}</span>
            <p className="min-w-0 flex-1 font-semibold">{t.searchingFrom.replace("{x}", cart.latest.name)}</p>
            {close}
            <button type="button" className={`${main} w-full`} onClick={() => {
              onView(cart.latest!.id); // opens it among the others of its category
              setPrompt(null);
              log({ trigger: "Said yes to the cart question", change: `Showed ${cart.latest!.name} and similar items` });
            }}>{t.showSimilar}</button>
            <button type="button" className={`${other} w-full`} onClick={aboutClicked}>
              {t.aboutThis.replace("{x}", cart.clicked.name)}
            </button>
          </section>
        )}
        {product && (
          <section aria-live="polite" className={`${card} border-blue-600`}>
            <p className="w-full text-slate-600">{t.isThis}</p>
            <span aria-hidden className="text-3xl">{product.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{product.name}</p>
              <p><strong>₹{product.price.toLocaleString("en-IN")}</strong> · {SPECS[product.id]}</p>
            </div>
            {close}
            <button type="button" className={`${main} flex-1`} disabled={(shop.cart[product.id] ?? 0) >= product.stock}
              onClick={() => {
                shop.setQuantity(product.id, (shop.cart[product.id] ?? 0) + 1);
                onAdded();
                setPrompt(null);
                log({ trigger: "Used the quick summary", change: `Added ${product.name} to the cart` });
              }}>{product.stock === 0 ? t.outOfStock : t.addToCart}</button>
            <button type="button" className={other} onClick={() => { onView(product.id); setPrompt(null); }}>{t.viewDetails}</button>
          </section>
        )}
        {comfort.on && (
          <section role="status" className={`${card} border-amber-500 bg-amber-50`}>
            <p className="min-w-0 flex-1 font-semibold">{t.biggerOn}</p>
            <button type="button" className={main} onClick={comfort.undo}>↩︎ {t.undoAction}</button>
          </section>
        )}
      </div>
    </>
  );
}
