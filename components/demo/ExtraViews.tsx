"use client";

import { useContext, type ReactNode } from "react";
import { PAGE_TEXT } from "@/components/store/text";
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import { ARTICLES } from "@/lib/demo/articles";
import { CATALOG } from "@/lib/demo/catalog";
import { shoeIdeas } from "@/lib/demo/extras";
import { ExtrasContext, type useExtras } from "./useExtras";

const WORDS = {
  en: {
    boost: "Increase Font & Summary", quick: "Quick items", search: "Are you searching for shoes or another product?",
    scroll: "Want suggestions for other articles?", add: "Add {x} to quick items?", no: "No",
    summary: "Refunds within 7 days of delivery; delayed orders qualify earlier. UPI takes 1–2 working days, cards 5–7.",
  },
  kn: {
    boost: "ಅಕ್ಷರ ದೊಡ್ಡದು + ಸಾರಾಂಶ", quick: "ತ್ವರಿತ ವಸ್ತುಗಳು", search: "ನೀವು ಶೂ ಅಥವಾ ಬೇರೆ ಉತ್ಪನ್ನ ಹುಡುಕುತ್ತಿದ್ದೀರಾ?",
    scroll: "ಬೇರೆ ಲೇಖನಗಳನ್ನು ಸೂಚಿಸಲೇ?", add: "{x} ಅನ್ನು ತ್ವರಿತ ವಸ್ತುಗಳಿಗೆ ಸೇರಿಸಲೇ?", no: "ಬೇಡ",
    summary: "ತಲುಪಿದ 7 ದಿನಗಳೊಳಗೆ ಮರುಪಾವತಿ; ವಿಳಂಬವಾದ ಆರ್ಡರ್‌ಗಳು ಮೊದಲೇ ಅರ್ಹ. UPI 1–2, ಕಾರ್ಡ್ 5–7 ಕೆಲಸದ ದಿನಗಳು.",
  },
};

const main = "min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white";
const other = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-semibold";

/** One button turns the bigger text and summary on; an Undo in the same place turns them off. */
export function PolicyBoost({ locale, children }: { locale: Locale; children: ReactNode }) {
  const x = useContext(ExtrasContext);
  if (!x) return children;
  const t = WORDS[locale];
  return (
    <div className="space-y-2">
      <button type="button" className={x.policy ? other : main} onClick={() => x.setPolicy(!x.policy)}>
        {x.policy ? `↩︎ ${PAGE_TEXT[locale].undoAction}` : `🔍 ${t.boost}`}
      </button>
      {x.policy && <p className="rounded-lg border-l-4 border-sky-500 bg-sky-50 p-3 text-lg font-semibold text-slate-900">{t.summary}</p>}
      <div className={x.policy ? "[&_*]:text-lg! [&_*]:leading-8!" : ""}>{children}</div>
    </div>
  );
}

/** Copies only: the cards stay where they are. */
export function QuickShelf({ locale, x }: { locale: Locale; x: ReturnType<typeof useExtras> }) {
  const items = CATALOG.filter((p) => x.quick.includes(p.id));
  if (items.length === 0) return null;
  const t = WORDS[locale];
  return (
    <section lang={locale} aria-label={t.quick} className="mx-auto mt-2 flex max-w-6xl flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-900">
      <strong>{t.quick}</strong>
      {items.map((p) => (
        <span key={p.id} className={`flex items-center gap-1 rounded-lg p-1 transition-colors ${x.flash === p.id ? "bg-yellow-300" : "bg-slate-100"}`}>
          <button type="button" className="min-h-11 px-2 font-semibold" onClick={() => x.openProduct(p.id)}>{p.icon} {p.name}</button>
          <button type="button" className={other} onClick={() => x.remove(p.id)}>↩︎ {PAGE_TEXT[locale].undoAction}</button>
        </span>
      ))}
    </section>
  );
}

/** Takes the lowest place in the one floating slot, so it never stacks on another prompt. */
export function ExtraPrompt({ locale, x, fallback }: { locale: Locale; x: ReturnType<typeof useExtras>; fallback: ReactNode }) {
  const { ask } = x;
  if (!ask) return fallback;
  const t = WORDS[locale];
  const page = PAGE_TEXT[locale];
  const chosen = ask.kind !== "quick" && ask.yes;
  const question = ask.kind === "quick" ? t.add.replace("{x}", CATALOG.find((p) => p.id === ask.id)?.name ?? ask.id) : t[ask.kind];
  return (
    <section aria-live="polite" className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-blue-600 bg-white p-3 text-sm shadow-xl">
      <p className="min-w-0 flex-1 font-semibold">{question}</p>
      {chosen ? (
        <>
          <button type="button" aria-label={page.close} className={`${other} min-w-11`} onClick={x.close}>✕</button>
          {ask.kind === "search" ? shoeIdeas().map((p) => (
            <button key={p.id} type="button" className={other} onClick={() => x.openProduct(p.id)}>{p.icon} {p.name}</button>
          )) : ARTICLES.slice(0, 4).map((a) => (
            <button key={a.id} type="button" lang="en" className={`${other} w-full text-left`} onClick={() => x.openArticle(a.id, a.title)}>
              {a.image} {a.title}
            </button>
          ))}
        </>
      ) : (
        <>
          <button type="button" className={main} onClick={() => x.answer(true)}>{page.yes}</button>
          <button type="button" className={other} onClick={() => x.answer(false)}>{t.no}</button>
        </>
      )}
    </section>
  );
}
