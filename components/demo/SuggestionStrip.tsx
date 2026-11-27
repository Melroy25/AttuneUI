"use client";

import { useState } from "react";
import { PAGE_TEXT, categoryLabel } from "@/components/store/text";
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import { CATALOG, CATEGORY_ICONS, type Category } from "@/lib/demo/catalog";
import { suggestions, type VisitUse } from "@/lib/demo/frontUse";

const chip = "min-h-9 rounded-full border border-sky-300 bg-white px-3 text-sm font-semibold";

/** Quiet, inline, from the second visit: what this user came back to before. Never blocks. */
export function SuggestionStrip({ locale, use, onCategory, onProduct }: {
  locale: Locale;
  use: VisitUse;
  onCategory: (c: Category) => void;
  onProduct: (id: string) => void;
}) {
  const [hidden, setHidden] = useState(false);
  const found = suggestions(use);
  if (!found || hidden) return null;
  const t = PAGE_TEXT[locale];
  return (
    <section aria-label={t.fromLastVisits} className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-2 text-sm">
      <p className="font-semibold">✨ {t.fromLastVisits}</p>
      {found.categories.map((c) => (
        <button key={c} type="button" className={chip} onClick={() => onCategory(c as Category)}>
          {CATEGORY_ICONS[c as Category]} {categoryLabel(t, c)}
        </button>
      ))}
      {found.products.flatMap((id) => CATALOG.filter((p) => p.id === id)).map((p) => (
        <button key={p.id} type="button" className={chip} onClick={() => onProduct(p.id)}>{p.icon} {p.name}</button>
      ))}
      <button type="button" aria-label={t.close} data-tip={t.close} className="ml-auto min-h-9 min-w-9 rounded-full"
        onClick={() => setHidden(true)}>✕</button>
    </section>
  );
}
