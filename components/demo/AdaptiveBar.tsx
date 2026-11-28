"use client";

import { useEffect, useState, type ReactNode } from "react";
import { GuideLink } from "@/components/store/GuideLink";
import { PAGE_TEXT } from "@/components/store/text";
import type { Shop } from "@/components/store/useShop";
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import type { Change } from "@/lib/demo/activity";
import { CATALOG, type Product } from "@/lib/demo/catalog";
import { SPECS } from "@/lib/demo/quick";
import { HesitationCard } from "./HesitationCard";
import { LocationPopover } from "./LocationPopover";
import { TextSizePrompt, useTextAsk } from "./TextSizePrompt";
import type { useHesitation } from "./useHesitation";
import type { useQuickPrompt } from "./useQuickPrompt";

const card = "pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 text-sm shadow-xl";
const main = "min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white disabled:opacity-50";
const other = "min-h-11 rounded-lg border border-slate-300 px-3 font-semibold";
const NOTICE_MS = 8000; // an Undo notice, then Undo stays in the ⚙ menu

/** True for a few seconds after `at`. */
function useRecent(at: number) {
  const [recent, setRecent] = useState(false);
  useEffect(() => {
    if (!at) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- shown at once, hidden later
    setRecent(true);
    const timer = setTimeout(() => setRecent(false), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [at]);
  return recent;
}

/**
 * One floating slot, so prompts never pile up. First match wins: what the user just clicked,
 * then the hesitation question, then a fresh Undo notice, then the reading pin.
 */
export function AdaptiveBar({ pill, user, locale, quick, shop, comfort, text, hesitation, onView, onCategory, onGuide, log }: {
  pill: ReactNode;
  user: string | null;
  locale: Locale;
  quick: ReturnType<typeof useQuickPrompt>;
  shop: Shop;
  comfort: { on: boolean; changedAt: number; undo: () => void };
  text: { percent: number; changedAt: number; undo: () => void };
  hesitation: ReturnType<typeof useHesitation>;
  onView: (id: string) => void;
  onCategory: Parameters<typeof HesitationCard>[0]["onCategory"];
  onGuide: (product: Product) => void;
  log: (change: Change) => void;
}) {
  const t = PAGE_TEXT[locale];
  const comfortNew = useRecent(comfort.changedAt);
  const textAsk = useTextAsk(user, text.changedAt);
  const { prompt, setPrompt, aboutClicked } = quick;

  // The location question sits under "Deliver to" and is the only prompt while it is open.
  if (prompt?.kind === "location" || prompt?.kind === "changer") {
    return <LocationPopover locale={locale} prompt={prompt} setPrompt={setPrompt} shop={shop} log={log} />;
  }

  const find = (id?: string) => CATALOG.find((p) => p.id === id);
  const product = prompt?.kind === "product" ? find(prompt.id) : undefined;
  const cart = prompt?.kind === "cart" ? { latest: find(prompt.latest), clicked: find(prompt.id) } : undefined;
  const guide = (p: Product, className: string) => (
    <GuideLink locale={locale} product={p} className={className} onOpen={() => { onGuide(p); setPrompt(null); }} />
  );
  const close = (
    <button type="button" aria-label={t.close} data-tip={t.close} className={`${other} ml-auto min-w-11`}
      onClick={() => quick.dismiss()}>✕</button>
  );
  const notice = (message: string, undo: () => void) => (
    <section role="status" className={`${card} border-amber-500 bg-amber-50`}>
      <p className="min-w-0 flex-1 font-semibold">{message}</p>
      <button type="button" className={main} onClick={undo}>↩︎ {t.undoAction}</button>
    </section>
  );

  let slot: ReactNode = pill;
  if (cart?.latest && cart.clicked) {
    slot = (
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
        {guide(cart.clicked, `${other} w-full`)}
      </section>
    );
  } else if (product) {
    slot = (
      <section aria-live="polite" className={`${card} border-blue-600`}>
        <p className="w-full text-slate-600">{t.isThis}</p>
        <span aria-hidden className="text-3xl">{product.icon}</span>
        <div className="min-w-0 flex-1">
          <p data-text-id={`quick:${product.id}:name`} className="font-semibold">{product.name}</p>
          <p data-text-id={`quick:${product.id}:spec`}><strong>₹{product.price.toLocaleString("en-IN")}</strong> · {SPECS[product.id]}</p>
        </div>
        {close}
        {guide(product, `${main} flex-1`)}
        <button type="button" className={other} onClick={() => { onView(product.id); setPrompt(null); }}>{t.viewDetails}</button>
      </section>
    );
  } else if (hesitation.offer) {
    slot = <HesitationCard locale={locale} hesitation={hesitation} onProduct={onView} onCategory={onCategory} />;
  } else if (comfortNew && comfort.on) {
    slot = notice(t.biggerOn, comfort.undo);
  } else if (textAsk.asked) {
    slot = <TextSizePrompt locale={locale} ask={textAsk.asked} onUndo={text.undo} onClose={textAsk.close} log={log} />;
  }

  return (
    <div lang={locale} className="pointer-events-none fixed inset-x-2 bottom-2 z-40 flex max-w-md flex-col text-slate-900 sm:left-auto sm:w-96">
      {slot}
    </div>
  );
}
