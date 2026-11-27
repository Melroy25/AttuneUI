// Server only: the latest snapshot per demo visitor. Database if available, else this process.
import type { LiveSnapshot } from "../demo/live";
import { rows, type Rest } from "./supabase";

/** How long a user's latest snapshot is shown and kept. */
export const KEEP_MS = 24 * 3_600_000;
const MAX_SHOWN = 100;
const MAX_IN_MEMORY = 100;

export interface LiveRow { snapshot: LiveSnapshot; updatedAt: string }
export type Storage = "database" | "memory";

// shortcut: memory only works on one long-running server; on Vercel create the table (schema.sql).
const memory = new Map<string, LiveRow>();

export async function saveLive(rest: Rest | null, snapshot: LiveSnapshot, now = Date.now()): Promise<Storage> {
  const updatedAt = new Date(now).toISOString();
  if (rest) {
    try {
      const response = await rest("live_sessions?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: snapshot.id, snapshot, updated_at: updatedAt }),
      });
      if (response.ok) return "database";
    } catch (error) {
      console.error("live:", error);
    }
  }
  memory.delete(snapshot.id); // re-insert, so the oldest is first
  memory.set(snapshot.id, { snapshot, updatedAt });
  if (memory.size > MAX_IN_MEMORY) memory.delete(memory.keys().next().value!);
  return "memory";
}

export async function listLive(rest: Rest | null, now = Date.now()): Promise<{ storage: Storage; sessions: LiveRow[] }> {
  const since = new Date(now - KEEP_MS).toISOString();
  if (rest) {
    try {
      const found = await rows<{ snapshot: LiveSnapshot; updated_at: string }>(
        rest, `live_sessions?updated_at=gt.${since}&select=snapshot,updated_at&order=updated_at.desc&limit=${MAX_SHOWN}`,
      );
      // Old visitors are not kept.
      await rest(`live_sessions?updated_at=lt.${since}`, { method: "DELETE" });
      return { storage: "database", sessions: found.map((r) => ({ snapshot: r.snapshot, updatedAt: r.updated_at })) };
    } catch (error) {
      console.error("live:", error);
    }
  }
  const sessions = [...memory.values()].filter((r) => r.updatedAt > since).reverse();
  return { storage: "memory", sessions };
}
