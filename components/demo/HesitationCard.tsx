import { categoryLabel, PAGE_TEXT } from "@/components/store/text";
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import type { Category } from "@/lib/demo/catalog";
import { quickPicks, topCategories } from "@/lib/demo/hesitation";
import { SPECS } from "@/lib/demo/quick";
import type { useHesitation } from "./useHesitation";

const button = "min-h-11 rounded-lg border border-slate-300 px-3 font-semibold";

/** Asks first. Everything offered only moves around the store: nothing is bought or added. */
export function HesitationCard({ locale, hesitation, onProduct, onCategory }: {
  locale: Locale;
  hesitation: ReturnType<typeof useHesitation>;
  onProduct: (id: string) => void;
  onCategory: (category: Category) => void;
}) {
  const { offer, state, reply, close } = hesitation;
  if (!offer) return null;
  const t = PAGE_TEXT[locale];
  const { category, stage } = offer;
  return (
    <section aria-live="polite"
      className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-violet-600 bg-white p-3 text-sm shadow-xl">
      {stage === "ask" ? (
        <>
          <p className="w-full font-semibold">
            {category ? t.comparing.replace("{x}", categoryLabel(t, category)) : t.categoriesQ}
          </p>
          <button type="button" className={`${button} flex-1 border-violet-700 bg-violet-700 text-white`}
            onClick={() => reply(true)}>{t.yes}</button>
          <button type="button" className={`${button} flex-1`} onClick={() => reply(false)}>{t.no}</button>
        </>
      ) : (
        <>
          <p className="min-w-0 flex-1 font-semibold">{t.quickPicks}</p>
          <button type="button" aria-label={t.close} data-tip={t.close} className={`${button} min-w-11`} onClick={close}>✕</button>
          {category ? quickPicks(category).map((p) => (
            <button key={p.id} type="button" className={`${button} flex w-full items-center gap-2 py-1 text-left`}
              onClick={() => { onProduct(p.id); close(); }}>
              <span aria-hidden className="text-2xl">{p.icon}</span>
              <span className="min-w-0">
                {p.name} · ₹{p.price.toLocaleString("en-IN")}{p.off > 0 && ` · ↓${p.off}%`}
                <span className="block text-xs font-normal text-slate-600">{SPECS[p.id]}</span>
              </span>
            </button>
          )) : topCategories(state).map((c) => (
            <button key={c} type="button" className={`${button} flex-1`}
              onClick={() => { onCategory(c); close(); }}>{categoryLabel(t, c)}</button>
          ))}
        </>
      )}
    </section>
  );
}
