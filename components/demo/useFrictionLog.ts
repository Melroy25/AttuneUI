"use client";

import { useEffect, useRef } from "react";
import { summarizeFriction } from "@/lib/attune-ui/telemetry/friction";
import type { FrictionSummary, InteractionEvent, Modality } from "@/lib/attune-ui/types";
import { addNew, frictionKey, parseTotals } from "@/lib/demo/cloud";
import { COUNTED } from "@/lib/demo/aggregate";
import { readJsonItem } from "./cloudCache";

/** Running struggle totals for this user, kept across reloads and Reset. */
export function useFrictionLog(user: string | null, finished: FrictionSummary, events: InteractionEvent[], modality: Modality) {
  const last = useRef(parseTotals(null));
  useEffect(() => {
    const open = summarizeFriction(events, modality);
    const now = parseTotals(Object.fromEntries(COUNTED.map((k) => [k, finished[k] + open[k]])));
    try {
      const key = frictionKey(user);
      localStorage.setItem(key, JSON.stringify(addNew(parseTotals(readJsonItem(key)), last.current, now)));
    } catch {
      // storage full or blocked
    }
    last.current = now;
  }, [user, finished, events, modality]);
}
