import { PAGE_TEXT } from "@/components/store/text";
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import { ARTICLES } from "@/lib/demo/articles";
import type { BehaviourApi } from "./useBehaviour";

/** Appears by itself while an article is being read; one tap goes back to the same paragraph. */
export function ReadingPill({ locale, behaviour, onResume }: {
  locale: Locale;
  behaviour: BehaviourApi;
  onResume: (article: string, paragraph: string) => void;
}) {
  const pin = behaviour.state.pinned;
  const article = ARTICLES.find((a) => a.id === pin?.article);
  if (!pin || !article) return null;
  const t = PAGE_TEXT[locale];
  return (
    <section aria-label={t.currentlyReading}
      className="pointer-events-auto flex items-center gap-2 rounded-full border border-sky-600 bg-white py-1 pl-3 pr-1 text-sm shadow-lg">
      <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left" data-tip={t.continueReading}
        onClick={() => onResume(article.id, pin.paragraph)}>
        <span aria-hidden className="text-xl">📖</span>
        <span className="min-w-0 truncate">
          <strong>{t.currentlyReading}:</strong> <span lang="en">{article.title}</span> · {Math.round(pin.progress * 100)}%
        </span>
      </button>
      <button type="button" aria-label={t.unpin} data-tip={t.unpin} className="min-h-11 min-w-11 flex-none rounded-full"
        onClick={() => behaviour.unpin("Pressed ✕ on the reading pin", true)}>✕</button>
    </section>
  );
}
