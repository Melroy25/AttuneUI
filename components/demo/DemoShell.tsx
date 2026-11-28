"use client";

import { useState } from "react";
import { XRayHud } from "@/components/hud/XRayHud";
import { Portal } from "@/components/portal/Portal";
import { StoreFooter } from "@/components/store/StoreFooter";
import type { Page } from "@/components/store/text";
import { TooltipLayer } from "@/components/ui/Tooltip";
import { useShop } from "@/components/store/useShop";
import { SURFACES } from "@/lib/attune-ui/surface/catalog";
import { ARTICLES } from "@/lib/demo/articles";
import { CATALOG, type Category, type Product } from "@/lib/demo/catalog";
import { guideFor } from "@/lib/demo/guides";
import { summarizeFriction } from "@/lib/attune-ui/telemetry/friction";
import { struggles } from "@/lib/bandit/shortcutBandit";
import type { UiState } from "@/lib/demo/uiState";
import { AdaptiveBar } from "./AdaptiveBar";
import { ExtraPrompt, QuickShelf } from "./ExtraViews";
import { ExtrasContext, useExtras } from "./useExtras";
import { ZonesContext, useZones } from "./Zones";
import { ConsentPrompt, useConsent } from "./Consent";
import { FrictionPulse } from "./FrictionPulse";
import { ReadingPill } from "./ReadingPill";
import { SettingsMenu } from "./SettingsMenu";
import { SuggestionStrip } from "./SuggestionStrip";
import { useActivity } from "./useActivity";
import { useBehaviour } from "./useBehaviour";
import { useComfort } from "./useComfort";
import { useDemo } from "./useDemo";
import { useFrictionLog } from "./useFrictionLog";
import { useHabits } from "./useHabits";
import { useHesitation } from "./useHesitation";
import { useLiveReport } from "./useLiveReport";
import { useQuickPrompt } from "./useQuickPrompt";
import { useShortcuts } from "./useShortcuts";
import { useTextSize } from "./useTextSize";
import { useFrontUse } from "./useFrontUse";

export function DemoShell({ serverUi, renderedAt, user }: { serverUi: UiState; renderedAt: string; user: string | null }) {
  const { activity, add } = useActivity(user);
  const shortcuts = useShortcuts(user, add);
  // A later layout or preference change becomes what Undo reverts.
  const [page, setPage] = useState<Page>("home");
  const d = useDemo(serverUi, user, (change) => { shortcuts.supersede(); add(change); }, page === "articles");
  const [hud, setHud] = useState(false);
  const shop = useShop(user);
  const usage = useFrontUse(user, page, shop.category, shop.selected, add);
  // Wishlist never moves mid-visit: its presses are counted for the next one instead.
  const habits = useHabits(user, (kind, next) => kind === "wishlist" ? usage.wished() : shortcuts.consider(
    kind, next, struggles(d.session.totals, summarizeFriction(d.events, d.modality))));
  useLiveReport(d, page, activity, user);
  useFrictionLog(user, d.session.totals, d.events, d.modality);
  const comfort = useComfort(user, d.rootRef, d.auto && !d.session.pinned, add);
  const quick = useQuickPrompt(d.rootRef, shop.latest, add);
  const hesitation = useHesitation(user, page, shop, quick.prompt !== null, add);
  const behaviour = useBehaviour(user, page, shop, add);
  const extras = useExtras(user, activity, add, page, shop, setPage);
  const consent = useConsent(extras.log, add);
  const text = useTextSize(user, d.session.pinned, add, consent.request);
  const zones = useZones(extras.log, add, text, consent);
  const openGuide = (product: Product) => {
    const article = guideFor(product)?.article ?? null; // null: the list of all guides
    shop.openArticle(article);
    setPage("articles");
    window.scrollTo(0, 0);
    const title = ARTICLES.find((a) => a.id === article)?.title;
    add({ trigger: `Followed the guide link for ${product.name}`, change: title ? `Opened "${title}"` : "Opened the list of articles" });
  };
  const surface = SURFACES[d.ui.arm];
  const renderedBy = d.offline
    ? "client (offline fallback)"
    : `server-rendered (${d.ui.arm}) at ${renderedAt.slice(11, 19)} UTC`;

  const actions = (
    <>
      <select aria-label="Language" data-tip="Change language" value={d.ui.preferences.locale}
        className="min-h-11 rounded-lg border-0 bg-white px-2 text-sm font-medium text-slate-900"
        onChange={(e) => d.chooseLocale(e.target.value === "kn" ? "kn" : "en")}>
        <option value="en">English</option>
        <option value="kn">ಕನ್ನಡ</option>
      </select>
      <SettingsMenu canUndo={d.canUndo || shortcuts.latest !== null} fixes={[
        ...(text.percent > 100 ? [{ label: `Undo bigger text (${text.percent}%)`, run: text.undo }] : []),
        ...(comfort.on ? [{ label: "Normal button size", run: comfort.undo }] : []),
      ]} pinned={d.session.pinned} hud={hud}
        onUndo={() => shortcuts.latest ? shortcuts.dismiss(shortcuts.latest, "Pressed Undo") : d.undoLast()}
        onPin={d.togglePin} onHud={() => setHud(!hud)} onReset={d.reset} user={user}
        auto={d.auto} onAuto={() => d.setAuto(!d.auto)} />
    </>
  );

  return (
    <main className={`store-page min-h-dvh p-2 sm:p-4 ${hud ? "hud-open" : ""}`}>
      <div ref={d.rootRef} className="mx-auto max-w-6xl">
        <ExtrasContext.Provider value={extras}><ZonesContext.Provider value={zones}><Portal key={d.portalKey} surface={surface} preferences={d.ui.preferences} task={null}
          onAction={d.onAction} onSignal={d.onSignal} onView={d.onView}
          store={{ actions, page, onPage: setPage, shop, user, onGoal: d.onGoal, habits, shortcuts, log: add, reading: d.readingPrompt, behaviour, onGuide: openGuide, front: usage.front, wishCards: usage.wishCards,
            suggest: <SuggestionStrip locale={d.ui.preferences.locale} use={usage.state}
              onCategory={(c) => { shop.setCategory(c); shop.setQuery(""); shop.setPreset(""); shop.setSelected(null); setPage("products"); }}
              onProduct={(id) => {
                shop.setCategory(CATALOG.find((p) => p.id === id)?.category ?? ""); shop.setQuery(""); shop.setPreset("");
                shop.setSelected(id); setPage("products");
              }} />,
            onFront: (part) => {
              if (!part.startsWith("category:")) return setPage(part as Page);
              shop.setCategory(part.slice(9) as Category); shop.setQuery(""); shop.setPreset(""); shop.setSelected(null);
              setPage("products");
            } }} /></ZonesContext.Provider></ExtrasContext.Provider>
      </div>
      <QuickShelf locale={d.ui.preferences.locale} x={extras} />
      <StoreFooter locale={d.ui.preferences.locale} onSupport={habits.support} onSupportHover={habits.supportHover}
        onPage={setPage} />
      <p className="mx-auto mt-2 max-w-6xl text-xs text-slate-600">
        {user ? `Signed in as ${user}. ` : ""}Live demo: your clicks and layout changes are visible on the admin page. What you type is not sent.
      </p>
      <AdaptiveBar user={user} pill={<ConsentPrompt locale={d.ui.preferences.locale} consent={consent} fallback={<ExtraPrompt locale={d.ui.preferences.locale} x={extras} fallback={<ReadingPill locale={d.ui.preferences.locale} behaviour={behaviour}
          onResume={(article, paragraph) => { shop.openArticle(article, paragraph); setPage("articles"); }} />} />} />}
        locale={d.ui.preferences.locale} quick={quick} shop={shop} comfort={comfort} hesitation={hesitation}
        log={add} onGuide={openGuide} text={{ ...text, changedAt: 0 }}
        onView={(id) => {
          shop.setCategory(CATALOG.find((p) => p.id === id)?.category ?? "");
          shop.setQuery(""); shop.setPreset(""); shop.setSelected(id); setPage("products"); d.onGoal();
        }}
        onCategory={(c) => {
          shop.setCategory(c); shop.setQuery(""); shop.setPreset(""); shop.setSelected(null); setPage("products");
        }} />
      {hud && <FrictionPulse rootRef={d.rootRef} />}
      <TooltipLayer />
      {hud && <XRayHud d={d} surface={surface} renderedBy={renderedBy} onClose={() => setHud(false)} />}
    </main>
  );
}
