"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { PAGE_TEXT } from "@/components/store/text";
import type { Shop } from "@/components/store/useShop";
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import type { Change } from "@/lib/demo/activity";
import { LOCATIONS, type Prompt } from "@/lib/demo/quick";
import { placeBelow } from "@/lib/demo/tooltip";

const ANCHOR = '[data-dead-context="location"]';

/** The location question and the city list, held just under "Deliver to". */
export function LocationPopover({ locale, prompt, setPrompt, shop, log }: {
  locale: Locale;
  prompt: Extract<Prompt, { kind: "location" | "changer" }>;
  setPrompt: (prompt: Prompt | null) => void;
  shop: Shop;
  log: (change: Change) => void;
}) {
  const t = PAGE_TEXT[locale];
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const place = () => {
      const box = ref.current;
      const anchor = document.querySelector(ANCHOR)?.getBoundingClientRect();
      if (!box || !anchor) return;
      const at = placeBelow(anchor, box.getBoundingClientRect(),
        { width: document.documentElement.clientWidth, height: window.innerHeight });
      box.style.top = `${at.top}px`;
      box.style.left = `${at.left}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, { capture: true });
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPrompt(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPrompt]);

  return (
    <section ref={ref} lang={locale} aria-label={t.chooseLocation}
      className="fixed z-40 flex w-72 max-w-[calc(100vw-1rem)] flex-wrap items-center gap-2 rounded-2xl border border-blue-600 bg-white p-3 text-sm text-slate-900 shadow-xl">
      <p aria-live="polite" className="min-w-0 flex-1 font-semibold">
        📍 {prompt.kind === "location" ? t.changeLocation : t.chooseLocation}
      </p>
      <button type="button" aria-label={t.close} data-tip={t.close} className="min-h-11 min-w-11 rounded-lg border border-slate-300"
        onClick={() => setPrompt(null)}>✕</button>
      {prompt.kind === "location" ? (
        <button type="button" className="min-h-11 w-full rounded-lg bg-blue-700 font-semibold text-white" onClick={() => {
          setPrompt({ kind: "changer" });
          log({ trigger: "Pressed Yes on the location shortcut", change: "Opened the location changer" });
        }}>{t.yes}</button>
      ) : LOCATIONS.map((place, i) => (
        <button key={place.en} type="button" autoFocus={i === shop.location} aria-pressed={i === shop.location}
          className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-left font-semibold aria-pressed:border-blue-700 aria-pressed:bg-blue-50"
          onClick={() => {
            shop.setLocation(i);
            setPrompt(null);
            log({ trigger: "Chose in the location changer", change: `Delivery city saved: ${place.en}` });
          }}>{place[locale]}</button>
      ))}
    </section>
  );
}
