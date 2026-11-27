"use client";

import { useEffect, useRef, useState } from "react";
import type { PortalContext } from "@/components/portal/context";
import { ARTICLES, type Article, type Paragraph } from "@/lib/demo/articles";
import { PAGE_TEXT } from "./text";
import { useArticleReading } from "./useArticleReading";
import type { Shop } from "./useShop";

const meta = (a: Article, t: { minRead: string }) => `${a.category} · ${a.author} · ${a.readingTime} ${t.minRead}`;

export function ArticlesPage({ ctx, shop, onView }: { ctx: PortalContext; shop: Shop; onView: (view: string) => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const article = ARTICLES.find((a) => a.id === shop.article);
  const open = (id: string | null) => {
    shop.openArticle(id);
    onView(id ? `article:${id}` : "page:articles");
    window.scrollTo(0, 0);
  };

  if (article) return <Reader key={article.id} ctx={ctx} shop={shop} article={article} onBack={() => open(null)} />;
  return (
    <div className="space-y-2">
      <h2 data-attune-id="articles-title" className="font-bold">{t.articles}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ARTICLES.map((a) => (
          <li key={a.id}>
            <button type="button" data-part="tile" className="flex w-full gap-3 p-3 text-left sm:flex-col" onClick={() => open(a.id)}>
              <span aria-hidden data-part="art" className="grid h-20 w-20 flex-none place-items-center text-4xl sm:h-32 sm:w-full sm:text-6xl">
                {a.image}
              </span>
              <span className="min-w-0">
                <span className="block font-bold">{a.title}</span>
                <span data-part="meta" className="block">{meta(a, t)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Reader({ ctx, shop, article, onBack }: { ctx: PortalContext; shop: Shop; article: Article; onBack: () => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const ref = useRef<HTMLElement>(null);
  const helped = useArticleReading(article, ref, ctx.behaviour);
  const [hidden, setHidden] = useState<string[]>([]);
  const { resume, clearResume } = shop;

  useEffect(() => {
    if (!resume) return;
    ref.current?.querySelector(`[data-paragraph="${resume}"]`)?.scrollIntoView({ block: "center" });
    clearResume();
  }, [resume, clearResume]);

  const helper = (p: Paragraph) => (
    <aside lang="en" className="mt-2 rounded-xl border-l-4 border-sky-500 bg-sky-50 p-3 text-sm text-slate-900">
      <button type="button" aria-label={t.close} data-tip={t.close} className="float-right min-h-8 min-w-8"
        onClick={() => setHidden([...hidden, p.id])}>✕</button>
      <p><strong>{t.simpler}:</strong> {p.simpleExplanation}</p>
      <p className="mt-1"><strong>{t.summaryLabel}:</strong> {p.summary}</p>
      <p className="mt-1"><strong>{t.exampleLabel}:</strong> {p.example}</p>
    </aside>
  );

  return (
    <article ref={ref} data-part="detail" className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <button type="button" className={`rounded-lg border px-3 text-sm ${ctx.control}`} onClick={onBack}>← {t.allArticles}</button>
      <div aria-hidden data-part="art" className="grid h-36 place-items-center text-7xl">{article.image}</div>
      <div lang="en">
        <h2 className="text-2xl font-bold">{article.title}</h2>
        <p data-part="meta">{meta(article, t)}</p>
      </div>
      {article.content.map((p) => (
        <div key={p.id}>
          <p lang="en" data-paragraph={p.id} className="text-base leading-8">{p.text}</p>
          {helped.includes(p.id) && !hidden.includes(p.id) && helper(p)}
        </div>
      ))}
      {/* Room to scroll the last paragraph up to a comfortable height. */}
      <div aria-hidden className="h-24" />
    </article>
  );
}
