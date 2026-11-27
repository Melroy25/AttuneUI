// Server only: the latest snapshot of each open store tab, for the admin page.
import type { LiveSnapshot } from "../demo/live";
import { memoryDb, type Db } from "./db";

/** How long a snapshot is shown and kept. */
export const KEEP_MS = 24 * 3_600_000;
const MAX_ROWS = 100;
const COLLECTION = "live_sessions";

export interface LiveRow { snapshot: LiveSnapshot; updatedAt: string }
export type Storage = "database" | "memory";

// shortcut: memory only works on one long-running server; on Vercel set FIREBASE_SERVICE_ACCOUNT.
const memory = memoryDb();

const pick = (db: Db | null) => ({ db: db ?? memory, storage: (db ? "database" : "memory") as Storage });

export async function saveLive(configured: Db | null, snapshot: LiveSnapshot, now = Date.now()): Promise<Storage> {
  const { db, storage } = pick(configured);
  await db.set(COLLECTION, snapshot.id, { updatedAt: new Date(now).toISOString(), data: JSON.stringify(snapshot) });
  return storage;
}

/** Rows changed after `since` (never older than 24 hours), so polling reads only what is new. */
export async function listLive(configured: Db | null, since?: string, now = Date.now()) {
  const { db, storage } = pick(configured);
  const oldest = new Date(now - KEEP_MS).toISOString();
  const from = since && since > oldest ? since : oldest;
  const found = await db.where(COLLECTION, "updatedAt", ">", from, MAX_ROWS);
  if (from === oldest) {
    // On a full load, drop what has expired.
    const expired = await db.where(COLLECTION, "updatedAt", "<", oldest, 20);
    await Promise.all(expired.map((row) => db.remove(COLLECTION, row.id)));
  }
  const sessions: LiveRow[] = found.map((row) => ({
    snapshot: JSON.parse(row.data.data as string) as LiveSnapshot, updatedAt: row.data.updatedAt as string,
  }));
  return { storage, sessions };
}
