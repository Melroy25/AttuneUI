"use client";

import { useEffect, useRef, useState } from "react";
import type { Change } from "@/lib/demo/activity";
import { SIZES, nextBurst, parseStep, textKey, type Burst } from "@/lib/demo/textSize";
import { CONTROLS } from "./useComfort";

/** Text the user can read, not a control and not a picture. */
function isText(target: EventTarget | null): target is Element {
  return target instanceof Element && target.closest(".store-page") !== null &&
    !target.closest(`${CONTROLS},[aria-hidden],[data-attune-ignore]`) &&
    [...target.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== "");
}

/** For every user. Only Pin, an explicit "keep my screen as it is", holds the size. */
export function useTextSize(user: string | null, locked: boolean, log: (change: Change) => void) {
  const key = textKey(user);
  const [step, setStep] = useState(0);
  const current = useRef(0);
  const latest = useRef({ locked, log });
  useEffect(() => { latest.current = { locked, log }; });

  const commit = (next: number) => {
    current.current = next;
    setStep(next);
    try {
      localStorage.setItem(key, String(next));
    } catch {
      // storage full or blocked: it lasts as long as the tab
    }
  };

  useEffect(() => {
    try {
      current.current = parseStep(localStorage.getItem(key));
    } catch {
      current.current = 0; // storage blocked
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage exists only after mount
    setStep(current.current);
    let burst: Burst | null = null;
    const onClick = (e: MouseEvent) => {
      if (e.detail === 0 || !isText(e.target)) return; // keyboard, or not text
      burst = nextBurst(burst, performance.now(), e.clientX, e.clientY);
      const next = current.current + 1;
      if (burst.count !== 2 || latest.current.locked || SIZES[next] === undefined) return;
      commit(next);
      latest.current.log({ trigger: "Clicked the same text repeatedly", change: `Text size raised to ${SIZES[next]}%` });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per account
  }, [key]);

  // Sizes in the store are relative to the root, so spacing grows along with the text.
  useEffect(() => {
    document.documentElement.style.fontSize = step ? `${SIZES[step]}%` : "";
    return () => { document.documentElement.style.fontSize = ""; };
  }, [step]);

  return {
    percent: SIZES[step],
    undo: () => {
      const back = Math.max(current.current - 1, 0);
      commit(back);
      log({ trigger: "Pressed Undo on the bigger text", change: `Text size back to ${SIZES[back]}%` });
    },
  };
}
