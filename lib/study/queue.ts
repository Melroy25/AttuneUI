// Offline-tolerant upload queue. FIFO, so a participant row always precedes its events.
export interface QueueItem { url: string; body: unknown }
export type KeyValue = Pick<Storage, "getItem" | "setItem">;

const PENDING = "attune-study-pending";
const REJECTED = "attune-study-rejected";
/** The server will never accept these; keep them for export instead of blocking the queue. */
const PERMANENT = [400, 403, 409, 413];

// shortcut: two tabs would overwrite each other's queue; the study runs in one tab.
export function createQueue(storage: KeyValue | null, send: (item: QueueItem) => Promise<number>) {
  const load = (key: string): QueueItem[] => {
    try {
      const value: unknown = JSON.parse(storage?.getItem(key) ?? "[]");
      return Array.isArray(value) ? (value as QueueItem[]) : [];
    } catch {
      return [];
    }
  };
  const pending = load(PENDING);
  const rejected = load(REJECTED);
  const save = () => {
    // A full or blocked store must not stop the study: the items stay in memory.
    try {
      storage?.setItem(PENDING, JSON.stringify(pending));
      storage?.setItem(REJECTED, JSON.stringify(rejected));
    } catch {}
  };
  let running: Promise<void> | null = null;

  const drain = async () => {
    while (pending.length > 0) {
      const status = await send(pending[0]).catch(() => 0);
      if (status >= 200 && status < 300) pending.shift();
      else if (PERMANENT.includes(status)) rejected.push(pending.shift()!);
      else return; // offline or server trouble: retry later
      save();
    }
  };

  return {
    push(item: QueueItem) {
      pending.push(item);
      save();
    },
    flush(): Promise<void> {
      running ??= drain().finally(() => { running = null; });
      return running;
    },
    pending: () => [...pending],
    rejected: () => [...rejected],
  };
}
