"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PAGE_TEXT } from "@/components/store/text";
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import type { Change } from "@/lib/demo/activity";
import { newestText, stillAsking, type Ask } from "@/lib/demo/textAsk";
import { parseScales, textKey } from "@/lib/demo/textSize";
import { placeBelow } from "@/lib/demo/tooltip";

const WORDS = { en: { ask: "Is that okay?", keep: "Keep" }, kn: { ask: "ಇದು ಸರಿಯೇ?", keep: "ಇರಲಿ" } };

const read = (user: string | null) => {
  try {
    return parseScales(localStorage.getItem(textKey(user)));
  } catch {
    return {}; // storage blocked: no question, Undo stays in the ⚙ menu
  }
};

/** Open from the moment a text grows until it is answered or that size is gone. */
export function useTextAsk(user: string | null, changedAt: number) {
  const [asked, setAsked] = useState<Ask | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is written before changedAt moves
    if (changedAt) setAsked(newestText(read(user)));
  }, [user, changedAt]);
  return { asked: asked && stillAsking(asked, read(user)) ? asked : null, close: () => setAsked(null) };
}

/** Sits under the text that grew; stays in the bottom slot if that text is not on this page. */
export function TextSizePrompt({ locale, ask, onUndo, onClose, log }: {
  locale: Locale;
  ask: Ask;
  onUndo: () => void;
  onClose: () => void;
  log: (change: Change) => void;
}) {
  const t = WORDS[locale];
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const place = () => {
      const box = ref.current;
      if (!box) return;
      const anchor = document.querySelector(`.store-page [data-text-id="${ask.id}"]`)?.getBoundingClientRect();
      box.style.position = anchor ? "fixed" : "";
      const at = anchor && placeBelow(anchor, box.getBoundingClientRect(),
        { width: document.documentElement.clientWidth, height: window.innerHeight });
      box.style.top = at ? `${at.top}px` : "";
      box.style.left = at ? `${at.left}px` : "";
    };
    place();
    const frame = requestAnimationFrame(place); // again once the new font size is applied
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, { capture: true });
    };
  });

  return (
    <section ref={ref} role="status"
      className="pointer-events-auto z-40 flex w-72 max-w-[calc(100vw-1rem)] flex-wrap items-center gap-2 rounded-2xl border border-amber-500 bg-amber-50 p-3 text-sm text-slate-900 shadow-xl">
      <p className="w-full font-semibold">{t.ask} · {ask.size}%</p>
      <button type="button" className="min-h-11 flex-1 rounded-lg bg-blue-700 px-4 font-semibold text-white" onClick={() => {
        onClose();
        log({ trigger: "Pressed Keep on the bigger text", change: `Font size of "${ask.id}" stays at ${ask.size}%` });
      }}>{t.keep}</button>
      <button type="button" className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 font-semibold"
        onClick={() => { onClose(); onUndo(); }}>↩︎ {PAGE_TEXT[locale].undoAction}</button>
    </section>
  );
}
