"use client";

import { useState } from "react";
import { XRayHud } from "@/components/hud/XRayHud";
import { Portal } from "@/components/portal/Portal";
import { SURFACES } from "@/lib/attune-ui/surface/catalog";
import type { UiState } from "@/lib/demo/uiState";
import { DemoBanner } from "./DemoBanner";
import { SettingsMenu } from "./SettingsMenu";
import { useDemo } from "./useDemo";

export function DemoShell({ serverUi, renderedAt }: { serverUi: UiState; renderedAt: string }) {
  const d = useDemo(serverUi);
  const [hud, setHud] = useState(false);
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
        onPin={d.togglePin} onHud={() => setHud(!hud)} onReset={d.reset} />
    </>
  );

  return (
    <main className={`store-page min-h-dvh p-2 sm:p-4 ${hud ? "hud-open" : ""}`}>
      <div ref={d.rootRef} className="mx-auto max-w-6xl">
        <Portal key={d.portalKey} surface={surface} preferences={d.ui.preferences} task={d.task}
          onAction={d.onAction} onSignal={d.onSignal} onView={d.onView}
          store={{ actions, banner: <DemoBanner d={d} /> }} />
      </div>
      {hud && <XRayHud d={d} surface={surface} renderedBy={renderedBy} onClose={() => setHud(false)} />}
    </main>
  );
}
