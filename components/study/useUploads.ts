"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createQueue, type QueueItem } from "@/lib/study/queue";
import type { EventRow, ParticipantRecord } from "@/lib/study/records";

const RETRY_MS = 5_000;

export const post = (url: string, body: unknown) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Upload queue with retry, plus the JSON export that works without any server. */
export function useUploads() {
  const queue = useRef<ReturnType<typeof createQueue> | null>(null);
  const participant = useRef<ParticipantRecord | null>(null);
  const log = useRef<EventRow[]>([]);
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState(0);

  const getQueue = useCallback(
    () => (queue.current ??= createQueue(storage(), async (i) => (await post(i.url, i.body)).status)),
    [],
  );
  const flush = useCallback(async () => {
    const q = getQueue();
    await q.flush();
    setPending(q.pending().length);
    setRejected(q.rejected().length);
  }, [getQueue]);

  useEffect(() => {
    void flush(); // anything left over from an earlier visit
    const timer = setInterval(() => void flush(), RETRY_MS);
    window.addEventListener("online", flush);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", flush);
    };
  }, [flush]);

  const enqueue = useCallback((item: QueueItem) => {
    getQueue().push(item);
    setPending(getQueue().pending().length);
    void flush();
  }, [flush, getQueue]);

  /** One request per row keeps every body under the API size limit. */
  const record = useCallback((block: 1 | 2, kind: EventRow["kind"], payload: Record<string, unknown>) => {
    if (!participant.current) return;
    const row: EventRow = {
      seq: log.current.length, block, kind, payload: { ...payload, at: new Date().toISOString() },
    };
    log.current.push(row);
    enqueue({ url: "/api/events", body: { participantId: participant.current.id, events: [row] } });
  }, [enqueue]);

  /** Same shape as GET /api/export, plus whatever is still waiting to upload. */
  const download = useCallback(() => {
    const p = participant.current;
    const data = {
      exportedAt: new Date().toISOString(),
      participants: p ? [p] : [],
      events: p ? log.current.map((e) => ({ participant_id: p.id, ...e })) : [],
      pendingUploads: getQueue().pending(),
      rejectedUploads: getQueue().rejected(),
    };
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
    link.download = `attune-study-${p?.id.slice(0, 8) ?? "queue"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  }, [getQueue]);

  return {
    pending, rejected, record, enqueue, download,
    identify: useCallback((p: ParticipantRecord) => { participant.current = p; }, []),
  };
}
