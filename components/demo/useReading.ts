"use client";

import { useState } from "react";

export const readingKey = "attune-reading-answered";

/** Asks once per browser session whether a long read needs larger text. */
export function useReading() {
  const [seconds, setSeconds] = useState(0); // 0: nothing to ask
  return {
    seconds,
    offer: (ms: number) => {
      try {
        if (sessionStorage.getItem(readingKey)) return;
      } catch {
        // storage blocked: the answer is remembered only until the next long read
      }
      setSeconds((s) => s || Math.round(ms / 1000));
    },
    answered: () => {
      try {
        sessionStorage.setItem(readingKey, "1");
      } catch {
        // storage blocked
      }
      setSeconds(0);
    },
  };
}
