"use client";

import { useState } from "react";
import { XRayHud } from "@/components/hud/XRayHud";
import { Portal } from "@/components/portal/Portal";
import { STRINGS, taskText } from "@/components/portal/strings";
import { SURFACES } from "@/lib/attune-ui/surface/catalog";
import type { DemoMode } from "@/lib/demo/session";
import type { UiState } from "@/lib/demo/uiState";
import { useDemo } from "./useDemo";

const MODES: [DemoMode, string][] = [["static", "Static"], ["placebo", "Random placebo"], ["attune", "AttuneUI"]];
const btn = "min-h-10 rounded border px-3 text-sm";

export function DemoShell({ serverUi, renderedAt }: { serverUi: UiState; renderedAt: string }) {
  const d = useDemo(serverUi);
  const [hud, setHud] = useState(true);
  const s = STRINGS[d.ui.preferences.locale];
  const surface = SURFACES[d.ui.arm];
  const renderedBy = d.offline
    ? "client (offline fallback)"
    : `server-rendered (${d.ui.arm}) at ${renderedAt.slice(11, 19)} UTC`;

  return (
    <main className="mx-auto max-w-7xl space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Policy" className="flex">
          {MODES.map(([mode, label]) => (
            <button key={mode} type="button" aria-pressed={d.mode === mode} onClick={() => d.setMode(mode)}
              className={`${btn} aria-pressed:bg-slate-900 aria-pressed:text-white`}>{label}</button>
          ))}
        </div>
        <button type="button" className={`${btn} border-emerald-700 bg-emerald-600 font-semibold text-white`} onClick={d.endBlock}>
          Finish Task / Trigger Next Block Decision
        </button>
        <span className="flex items-center gap-1 rounded border border-dashed border-amber-600 bg-amber-50 p-1">
          <strong className="text-xs text-amber-800">SIMULATED</strong>
          {[10, 50].map((n) => (
            <button key={n} type="button" className={btn} onClick={() => d.forward(n)}>Fast-Forward +{n}</button>
          ))}
        </span>
        <select aria-label="Language" className={btn} value={d.ui.preferences.locale}
          onChange={(e) => d.chooseLocale(e.target.value === "kn" ? "kn" : "en")}>
          <option value="en">English</option>
          <option value="kn">ಕನ್ನಡ</option>
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={d.demoReading} onChange={(e) => d.setDemoReading(e.target.checked)} />
          Demo reading threshold (5 s, else 60 s)
        </label>
        <button type="button" className={btn} onClick={() => setHud(!hud)} aria-pressed={hud}>X-Ray HUD</button>
        <button type="button" className={btn} onClick={d.reset}>Reset</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded bg-slate-100 p-2 text-sm">
        <strong>Block {d.session.blocks + 1}</strong>
        <span lang={d.ui.preferences.locale}>
          {d.task ? `${d.taskIndex + 1}/3 · ${taskText(d.task, d.ui.preferences.locale)}` : s.done}
        </span>
      </div>

      {(d.ui.arm !== "baseline" || !d.isDefault || d.session.pinned || d.changes.length > 0) && (
        <div role="status" lang={d.ui.preferences.locale} className="flex flex-wrap items-center gap-2 rounded border border-indigo-400 bg-indigo-50 p-2 text-sm">
          <strong>{s.adapted}</strong>
          <button type="button" className={btn} disabled={!d.canUndo} onClick={d.undoLast}>{s.undo}</button>
          <button type="button" className={btn} aria-pressed={d.session.pinned} onClick={d.togglePin}>
            {d.session.pinned ? s.unpin : s.pin}
          </button>
          <span lang="en">{d.changes.length > 0 ? `Changed: ${d.changes.join(" · ")}` : ""}</span>
        </div>
      )}

      <div className={hud ? "grid gap-3 lg:grid-cols-[1fr_20rem]" : ""}>
        <div ref={d.rootRef}>
          <Portal key={d.portalKey} surface={surface} preferences={d.ui.preferences} task={d.task}
            onAction={d.onAction} onSignal={d.onSignal} onView={d.onView} />
        </div>
        {hud && (
          <XRayHud session={d.session} surface={surface} events={d.events} modality={d.modality} renderedBy={renderedBy} />
        )}
      </div>
    </main>
  );
}
