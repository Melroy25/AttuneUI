import { PAGE_TEXT } from "@/components/store/text";
import type { Shop } from "@/components/store/useShop";
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import type { Change } from "@/lib/demo/activity";
import { CATALOG } from "@/lib/demo/catalog";
import { LOCATIONS, SPECS, type Prompt } from "@/lib/demo/quick";

const card = "pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 text-sm shadow-xl";
const main = "min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white disabled:opacity-50";
const other = "min-h-11 rounded-lg border border-slate-300 px-3 font-semibold";

/** Floats above the page, so nothing in the store moves when it appears. */
export function AdaptiveBar({ locale, prompt, setPrompt, shop, comfort, onView, onAdded, log }: {
  locale: Locale;
  prompt: Prompt | null;
  setPrompt: (prompt: Prompt | null) => void;
  shop: Shop;
  comfort: { on: boolean; undo: () => void };
  onView: (id: string) => void;
  onAdded: () => void;
  log: (change: Change) => void;
}) {
  const t = PAGE_TEXT[locale];
  const product = prompt?.kind === "product" ? CATALOG.find((p) => p.id === prompt.id) : undefined;
  const close = (
    <button type="button" aria-label={t.close} data-tip={t.close} className={`${other} ml-auto min-w-11`}
      onClick={() => setPrompt(null)}>✕</button>
  );

  return (
    <div lang={locale} className="pointer-events-none fixed inset-x-2 bottom-2 z-40 mx-auto flex max-w-md flex-col gap-2 text-slate-900">
      {prompt?.kind === "location" && (
        <section aria-live="polite" className={`${card} border-blue-600`}>
          <p className="font-semibold">📍 {t.changeLocation}</p>
          <button type="button" className={main} onClick={() => {
            setPrompt({ kind: "changer" });
            log({ trigger: "Pressed Yes on the location shortcut", change: "Opened the location changer" });
          }}>{t.yes}</button>
          {close}
        </section>
      )}
      {prompt?.kind === "changer" && (
        <section aria-label={t.chooseLocation} className={`${card} border-blue-600`}>
          <p className="font-semibold">{t.chooseLocation}</p>
          {close}
          {LOCATIONS.map((place, i) => (
            <button key={place.en} type="button" autoFocus={i === shop.location} aria-pressed={i === shop.location}
              className={`${other} w-full text-left aria-pressed:border-blue-700 aria-pressed:bg-blue-50`}
              onClick={() => {
                shop.setLocation(i);
                setPrompt(null);
                log({ trigger: "Chose in the location changer", change: `Delivery location: ${place.en}` });
              }}>{place[locale]}</button>
          ))}
        </section>
      )}
      {product && (
        <section aria-live="polite" className={`${card} border-blue-600`}>
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
  );
}
