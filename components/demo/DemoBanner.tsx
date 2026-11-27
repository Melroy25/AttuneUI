"use client";

import { STRINGS } from "@/components/portal/strings";
import type { useDemo } from "./useDemo";

const chip = "min-h-10 rounded-lg border border-indigo-300 bg-white px-3 text-sm font-medium disabled:opacity-40";

/** The "adapted" notice. Marked ignore: its buttons are not part of what is being sensed. */
export function DemoBanner({ d }: { d: ReturnType<typeof useDemo> }) {
  const s = STRINGS[d.ui.preferences.locale];
  if (!d.showNotice) return null;
  return (
    <div data-attune-ignore role="status"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-2 text-sm">
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
  );
}
