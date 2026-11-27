"use client";

import { useEffect, useRef, useState } from "react";
import type { Change } from "@/lib/demo/activity";
import { deliberate, enlarge, nextBurst, parseScales, textKey, undoLast, type Burst, type Scales } from "@/lib/demo/textSize";
import { CONTROLS } from "./useComfort";

const MARKED = "[data-text-id]";

/** Sets only the font size of each enlarged text, measured from what it would be without us. */
function apply(page: Element, scales: Scales) {
  for (const el of page.querySelectorAll<HTMLElement>(MARKED)) {
    if (el.style.fontSize) el.style.fontSize = "";
    const size = scales[el.dataset.textId!];
    if (size) el.style.fontSize = `${(parseFloat(getComputedStyle(el).fontSize) * size) / 100}px`;
  }
}

/** For every user. Only Pin, an explicit "keep my screen as it is", holds the sizes. */
export function useTextSize(user: string | null, locked: boolean, log: (change: Change) => void) {
  const key = textKey(user);
  const [scales, setScales] = useState<Scales>({});
  const [changedAt, setChangedAt] = useState(0);
  const current = useRef<Scales>({});
  const latest = useRef({ locked, log });
  useEffect(() => { latest.current = { locked, log }; });

  const commit = (next: Scales) => {
    current.current = next;
    setScales(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage full or blocked: it lasts as long as the tab
    }
  };

  useEffect(() => {
    try {
      current.current = parseScales(localStorage.getItem(key));
    } catch {
      current.current = {}; // storage blocked
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage exists only after mount
    setScales(current.current);
    let burst: Burst | null = null;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      // Keyboard clicks and anything that does something (buttons, links, fields) never count.
      if (e.detail === 0 || target.closest(CONTROLS)) return;
      const id = target.closest<HTMLElement>(MARKED)?.dataset.textId;
      if (!id) return;
      burst = nextBurst(burst, id, performance.now());
      if (!deliberate(burst) || latest.current.locked) return;
      burst = null; // each further step needs four new clicks
      const next = enlarge(current.current, id);
      if (!next) return;
      commit(next);
      setChangedAt(Date.now());
      latest.current.log({ trigger: `Clicked the text "${id}" 4 times in 2.5 s`, change: `Font size of "${id}" raised to ${next[id]}%` });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per account
  }, [key]);

  useEffect(() => {
    const page = document.querySelector(".store-page");
    if (!page) return;
    const run = () => apply(page, scales);
    run();
    // Pages, layouts and prompts come and go; "style" is not watched, so this cannot loop.
    const watcher = new MutationObserver(run);
    watcher.observe(page, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["class", "data-surface", "data-roomy", "data-text-id"],
    });
    return () => {
      watcher.disconnect();
      apply(page, {});
    };
  }, [scales]);

  const last = Object.keys(scales).at(-1);
  return {
    percent: last ? scales[last] : 100,
    changedAt,
    undo: () => {
      const back = undoLast(current.current);
      if (!back) return;
      commit(back.scales);
      log({ trigger: "Pressed Undo on the bigger text", change: `Font size of "${back.id}" back to ${back.size}%` });
    },
  };
}
