"use client";

import { useEffect, useRef, useState } from "react";
import { PAGE_TEXT } from "@/components/store/text";
import type { PortalContext } from "./context";
import { POLICY } from "./strings";

/** Counts time while the block is open and the tab is visible (a proxy for reading). */
export function PolicyCard({ ctx }: { ctx: PortalContext }) {
  const { s, preferences, onSignal, readingPrompt } = ctx;
  const t = PAGE_TEXT[preferences.locale];
  const [open, setOpen] = useState(false);
  const report = useRef(onSignal);
  useEffect(() => { report.current = onSignal; });

  useEffect(() => {
    if (!open) return;
    let read = 0;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      read += 1000;
      report.current({ longestReadMs: read });
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  const sections = POLICY[preferences.locale];
  const size = preferences.textScale === "large" ? "text-lg leading-8" : "text-xs leading-4";
  return (
    <details
      data-part="policy"
      className="rounded border p-3"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-semibold">{s.policy}</summary>
      {open && readingPrompt && (
        <div role="group" aria-label={t.hardToRead}
          className="mt-2 flex w-fit items-center gap-2 rounded-2xl border border-sky-500 bg-sky-50 px-3 py-1 text-sm text-slate-900">
          <span role="status">{t.hardToRead}</span>
          <button type="button" aria-label={t.comfortYes} onClick={readingPrompt.confirm}
            className="grid h-9 w-9 place-items-center rounded-full bg-sky-700 font-bold text-white">✓</button>
          <button type="button" aria-label={t.comfortNo} onClick={readingPrompt.dismiss}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-400 bg-white font-bold">✕</button>
        </div>
      )}
      <div className={`mt-2 ${size}`}>
        {preferences.structure === "paragraph" ? (
          <p>{sections.flatMap((x) => x.points).join(" ")}</p>
        ) : (
          sections.map((section, i) => (
            <details key={section.heading} open={i === 0}>
              <summary className="cursor-pointer font-semibold">{section.heading}</summary>
              <ul className="list-disc pl-5">
                {section.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </details>
          ))
        )}
      </div>
    </details>
  );
}
