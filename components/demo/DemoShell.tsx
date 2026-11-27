"use client";

import { useState } from "react";
import { XRayHud } from "@/components/hud/XRayHud";
import { Portal } from "@/components/portal/Portal";
import { PAGE_TEXT, type Page } from "@/components/store/text";
import { useShop } from "@/components/store/useShop";
import { SURFACES } from "@/lib/attune-ui/surface/catalog";
import type { UiState } from "@/lib/demo/uiState";
import { SettingsMenu } from "./SettingsMenu";
import { useActivity } from "./useActivity";
import { useDemo } from "./useDemo";
import { useHabits } from "./useHabits";
import { useLiveReport } from "./useLiveReport";

export function DemoShell({ serverUi, renderedAt, user }: { serverUi: UiState; renderedAt: string; user: string | null }) {
  const { activity, add } = useActivity(user);
  const d = useDemo(serverUi, user, add);
  const [hud, setHud] = useState(false);
  const [page, setPage] = useState<Page>("home");
  const shop = useShop();
  const habits = useHabits(user, add);
  useLiveReport(d, page, activity);
  const surface = SURFACES[d.ui.arm];
  const renderedBy = d.offline
    ? "client (offline fallback)"
    : `server-rendered (${d.ui.arm}) at ${renderedAt.slice(11, 19)} UTC`;

  const actions = (
    <>
      <select aria-label="Language" value={d.ui.preferences.locale}
        className="min-h-11 rounded-lg border-0 bg-white px-2 text-sm font-medium text-slate-900"
        onChange={(e) => d.chooseLocale(e.target.value === "kn" ? "kn" : "en")}>
        <option value="en">English</option>
        <option value="kn">ಕನ್ನಡ</option>
      </select>
      <SettingsMenu canUndo={d.canUndo} pinned={d.session.pinned} hud={hud} onUndo={d.undoLast}
        onPin={d.togglePin} onHud={() => setHud(!hud)} onReset={d.reset} user={user}
        auto={d.auto} onAuto={() => d.setAuto(!d.auto)} />
    </>
  );

  return (
    <main className={`store-page min-h-dvh p-2 sm:p-4 ${hud ? "hud-open" : ""}`}>
      <div ref={d.rootRef} className="mx-auto max-w-6xl">
        <Portal key={d.portalKey} surface={surface} preferences={d.ui.preferences} task={null}
          onAction={d.onAction} onSignal={d.onSignal} onView={d.onView}
          store={{ actions, page, onPage: setPage, shop, user, onGoal: d.onGoal, habits, log: add, reading: d.readingPrompt }} />
      </div>
      <footer className="mx-auto mt-4 max-w-6xl">
        <button type="button" className="min-h-11 text-sm font-semibold underline"
          onClick={() => { habits.support(); setPage("help"); window.scrollTo(0, 0); }}>
          🎧 {PAGE_TEXT[d.ui.preferences.locale].customerSupport}
        </button>
      </footer>
      <p className="mx-auto mt-2 max-w-6xl text-xs text-slate-600">
        {user ? `Signed in as ${user}. ` : ""}Live demo: your clicks and layout changes are visible on the admin page. What you type is not sent.
      </p>
      {hud && <XRayHud d={d} surface={surface} renderedBy={renderedBy} onClose={() => setHud(false)} />}
    </main>
  );
}
