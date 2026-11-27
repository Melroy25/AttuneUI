"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { distanceToRect, type Rect } from "@/lib/attune-ui/telemetry/capture";
import type { Change } from "@/lib/demo/activity";
import {
  NO_COMFORT, NO_RECENT, comfortKey, isSmall, parseComfort, recordTap, revert, type Comfort,
} from "@/lib/demo/comfort";
import { readJsonItem } from "./cloudCache";

export const CONTROLS = "button:not(:disabled),a[href],input,select,textarea,summary,label";

/** Space between two boxes, 0 when they touch or overlap. */
const between = (a: Rect, b: Rect) =>
  Math.hypot(Math.max(b.left - a.right, a.left - b.right, 0), Math.max(b.top - a.bottom, a.top - b.bottom, 0));

/** Where a click landed, measured against the real boxes on screen. */
export function measure(root: HTMLElement, e: MouseEvent) {
  const boxes = [...root.querySelectorAll(CONTROLS)]
    .map((el) => ({ el, box: el.getBoundingClientRect() }))
    .filter((c) => c.box.width > 0);
  const hit = e.target instanceof Element ? e.target.closest(CONTROLS) : null;
  let aimed = boxes.find((c) => c.el === hit);
  let distance = aimed ? 0 : Infinity;
  if (!aimed) {
    for (const c of boxes) {
      const d = distanceToRect(e.clientX, e.clientY, c.box);
      if (d < distance) { distance = d; aimed = c; }
    }
  }
  let gap = Infinity;
  for (const c of boxes) {
    if (!aimed || c.el === aimed.el || c.el.contains(aimed.el) || aimed.el.contains(c.el)) continue;
    gap = Math.min(gap, between(aimed.box, c.box));
  }
  return {
    t: performance.now(), x: e.clientX, y: e.clientY, distance,
    control: hit && aimed ? `${Math.round(aimed.box.left)},${Math.round(aimed.box.top)}` : null,
    small: !!aimed && isSmall(aimed.box.width, aimed.box.height, gap),
  };
}

export function useComfort(
  user: string | null, rootRef: RefObject<HTMLElement | null>, canAdapt: boolean, log: (change: Change) => void,
) {
  const key = comfortKey(user);
  const [state, setState] = useState(NO_COMFORT);
  const current = useRef(state);
  const latest = useRef({ canAdapt, log });
  useEffect(() => { latest.current = { canAdapt, log }; });

  const commit = (next: Comfort) => {
    current.current = next;
    setState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage full or blocked: it lasts as long as the tab
    }
  };

  useEffect(() => {
    current.current = parseComfort(readJsonItem(key));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage exists only after mount
    setState(current.current);
    const root = rootRef.current;
    if (!root) return;
    let recent = NO_RECENT;
    const onClick = (e: MouseEvent) => {
      if (e.detail === 0 || (e.target instanceof Element && e.target.closest("[data-attune-ignore]"))) return;
      const next = recordTap(current.current, recent, measure(root, e), latest.current.canAdapt);
      recent = next.recent;
      commit(next.state);
      if (next.reason) latest.current.log({ trigger: next.reason, change: "Made buttons, links and text bigger (Undo shown)" });
    };
    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per account
  }, [key, rootRef]);

  return {
    on: state.on,
    undo: () => {
      commit(revert(current.current));
      log({ trigger: "Pressed Undo on the bigger buttons", change: "Back to normal size; stays off until Reset" });
    },
  };
}
