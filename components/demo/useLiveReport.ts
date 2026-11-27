"use client";

import { useEffect, useRef, useState } from "react";
import { buildContext } from "@/lib/attune-ui/telemetry/context";
import { summarizeFriction } from "@/lib/attune-ui/telemetry/friction";
import { explain } from "@/lib/demo/explain";
import type { LiveSnapshot } from "@/lib/demo/live";
import { newParticipantId } from "@/lib/study/records";
import type { useDemo } from "./useDemo";

const EVERY_MS = 1000;
const HEARTBEAT_MS = 5000;

/** Sends what the X-Ray shows to the admin page. Failures never disturb the visitor. */
export function useLiveReport(d: ReturnType<typeof useDemo>, page: string) {
  const [id] = useState(() => (typeof window === "undefined" ? "" : newParticipantId()));
  const latest = useRef({ d, page });
  useEffect(() => { latest.current = { d, page }; });

  useEffect(() => {
    let sent = "";
    let sentAt = 0;
    let busy = false;
    const timer = setInterval(async () => {
      const { d, page } = latest.current;
      const { session } = d;
      const friction = summarizeFriction(d.events, d.modality);
      const { decision } = session;
      const snapshot: LiveSnapshot = {
        id, user: null, totals: session.totals, history: session.history, page, arm: d.ui.arm, mode: d.mode, block: session.blocks + 1, auto: d.auto, pinned: session.pinned,
        locale: d.ui.preferences.locale, viewportWidth: window.innerWidth, modality: d.modality, friction,
        context: buildContext({ friction, viewportWidth: window.innerWidth, priorSessions: session.blocks }),
        decision: decision && { action: decision.action, propensity: decision.propensity, probs: decision.probs },
        why: explain(session), changes: d.changes.slice(0, 12), log: session.log.slice(0, 8),
      };
      const body = JSON.stringify(snapshot);
      if (busy || (body === sent && Date.now() - sentAt < HEARTBEAT_MS)) return;
      busy = true;
      try {
        const response = await fetch("/api/live", {
          method: "POST", body, headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(8000),
        });
        if (response.ok) { sent = body; sentAt = Date.now(); }
      } catch {
        // offline: the next tick tries again
      } finally {
        busy = false;
      }
    }, EVERY_MS);
    return () => clearInterval(timer);
  }, [id]);
}
