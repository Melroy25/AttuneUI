"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { encodeMemory, parseMemory } from "@/lib/demo/memory";
import type { DemoSession } from "@/lib/demo/session";

/** What was learned stays in this browser, one memory per account. */
export function useModelMemory(key: string, session: DemoSession, setSession: Dispatch<SetStateAction<DemoSession>>) {
  useEffect(() => {
    try {
      const memory = parseMemory(localStorage.getItem(key));
      if (memory) setSession((s) => ({ ...s, ...memory }));
    } catch {
      // storage blocked: this tab starts from the prior
    }
  }, [key, setSession]);
  const { models, liveUpdates, simulatedUpdates } = session;
  useEffect(() => {
    if (!models || liveUpdates + simulatedUpdates === 0) return;
    try {
      localStorage.setItem(key, encodeMemory({ models, liveUpdates, simulatedUpdates }));
    } catch {
      // storage full or blocked: learning lasts as long as the tab
    }
  }, [key, models, liveUpdates, simulatedUpdates]);
}
