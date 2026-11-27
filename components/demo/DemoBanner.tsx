"use client";

import { STRINGS, taskText } from "@/components/portal/strings";
import type { useDemo } from "./useDemo";

const chip = "min-h-10 rounded-lg border border-indigo-300 bg-white px-3 text-sm font-medium disabled:opacity-40";

/** Current ticket and the "adapted" notice. Marked ignore: instructions are not part of the task. */
export function DemoBanner({ d }: { d: ReturnType<typeof useDemo> }) {
  const { locale } = d.ui.preferences;
  const s = STRINGS[locale];
  return (
    <div data-attune-ignore className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border-l-4 border-amber-400 bg-white p-3 text-sm shadow-sm">
        <span aria-hidden className="text-lg">🎫</span>
        <p className="min-w-0 flex-1 font-semibold">
          {d.task ? `${d.taskIndex + 1}/3 · ${taskText(d.task, locale)}` : `✓ ${s.done}`}
        </p>
        {!d.task && (
          <button type="button" onClick={d.endBlock} className="min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white">
            {s.next} →
          </button>
        )}
      </div>
      {d.showNotice && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-2 text-sm">
          <strong className="mr-auto w-full px-1 sm:w-auto">✨ {s.adapted}</strong>
          <button type="button" className={chip} disabled={!d.canUndo} onClick={d.undoLast}>{s.undo}</button>
          <button type="button" className={`${chip} aria-pressed:bg-indigo-700 aria-pressed:text-white`}
            aria-pressed={d.session.pinned} onClick={d.togglePin}>
            {d.session.pinned ? s.unpin : s.pin}
          </button>
          {d.changes.length > 0 && (
            <details lang="en" className="w-full px-1 text-slate-700">
              <summary className="cursor-pointer">What changed ({d.changes.length})</summary>
              <ul className="list-disc pl-5">{d.changes.map((c) => <li key={c}>{c}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
