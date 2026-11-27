"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { cursorKey, syncKey, type CloudRecord } from "@/lib/demo/cloud";
import { guestId, pendingActivity, readLocal, writeLocal } from "./cloudCache";
import { DemoShell } from "./DemoShell";

const EVERY_MS = 2000;

/**
 * The store runs from the browser cache. This loads a newer saved copy once (and restarts the
 * store on it), then uploads changes. Nothing is uploaded before that load has succeeded.
 */
export function DemoSync(props: ComponentProps<typeof DemoShell>) {
  const { user } = props;
  const [restored, setRestored] = useState(0);

  useEffect(() => {
    let stopped = false;
    let pulled = false;
    let busy = false;
    let sent = "";
    const call = (url: string, init?: RequestInit) =>
      fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000), ...init });
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        const id = user ?? guestId();
        if (!pulled) {
          const response = await call(`/api/demo-user?id=${id}&activity=0`);
          if (!response.ok) return;
          const saved = ((await response.json()) as { user: CloudRecord | null }).user;
          if (stopped) return;
          // The marker is the last copy this browser agreed on; "local" (after Reset) outranks any date.
          if (saved && saved.updatedAt > (localStorage.getItem(syncKey(user)) ?? "")) {
            writeLocal(user, saved.state);
            localStorage.setItem(syncKey(user), saved.updatedAt);
            setRestored((n) => n + 1);
          }
          pulled = true;
          return;
        }
        const state = readLocal(user);
        if (!state) return;
        const activity = pendingActivity(user);
        const body = JSON.stringify({ guest: user ? undefined : id, ...state, activity });
        if (body === sent) return;
        const response = await call("/api/demo-user", { method: "POST", body, headers: { "Content-Type": "application/json" } });
        if (!response.ok) return;
        sent = body;
        localStorage.setItem(syncKey(user), ((await response.json()) as { updatedAt: string }).updatedAt);
        const last = activity.at(-1);
        if (last) localStorage.setItem(cursorKey(user), String(last.at));
      } catch {
        // offline or storage blocked: the next tick tries again
      } finally {
        busy = false;
      }
    };
    void tick();
    const timer = setInterval(tick, EVERY_MS);
    return () => { stopped = true; clearInterval(timer); };
  }, [user]);

  return <DemoShell key={restored} {...props} />;
}
