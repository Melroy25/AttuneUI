"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveRow, Storage } from "@/lib/server/live";

const POLL_MS = 2500;
const OVERLAP_MS = 3000; // re-read the last moments, in case server clocks differ slightly

/** Polls only for rows that changed, which keeps database reads low. */
export function useLiveRows() {
  const [state, setState] = useState<{ rows: LiveRow[]; storage: Storage | null; now: number; error: string }>(
    { rows: [], storage: null, now: 0, error: "" });
  const rows = useRef(new Map<string, LiveRow>());

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let newest = "";
    const poll = async () => {
      if (!document.hidden || !newest) {
        try {
          const since = newest ? new Date(Date.parse(newest) - OVERLAP_MS).toISOString() : "";
          const response = await fetch(`/api/live${since ? `?since=${since}` : ""}`, {
            cache: "no-store", signal: AbortSignal.timeout(8000),
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? String(response.status));
          for (const row of body.sessions as LiveRow[]) {
            rows.current.set(row.snapshot.id, row);
            if (row.updatedAt > newest) newest = row.updatedAt;
          }
          if (!stopped) setState({ rows: [...rows.current.values()], storage: body.storage, now: Date.now(), error: "" });
        } catch (e) {
          if (!stopped) setState((s) => ({ ...s, now: Date.now(), error: `Cannot load users: ${(e as Error).message}` }));
        }
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, []);

  return state;
}
