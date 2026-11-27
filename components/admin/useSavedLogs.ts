"use client";

import { useCallback, useEffect, useState } from "react";
import { guestId, readActivity, readLocal } from "@/components/demo/cloudCache";
import type { Activity } from "@/lib/demo/activity";
import { mergeActivity, mergeUsers, type CloudRecord } from "@/lib/demo/cloud";

export type LogRow = Activity & { user: string };
// Each log entry is one database read, so "All users" reads fewer of them.
const MAX_LOGS = 25;
const EACH = 20;
const CACHE_PREFIX = "attune-ui:";

/** What this browser holds, for entries not uploaded yet. */
function cached() {
  const users: CloudRecord[] = [];
  const logs = new Map<string, Activity[]>();
  try {
    const names = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX)).map((k) => k.slice(CACHE_PREFIX.length));
    for (const name of names) {
      const user = name === "guest" ? null : name;
      const state = readLocal(user);
      if (!state) continue;
      const id = user ?? guestId();
      users.push({ id, updatedAt: "", state });
      logs.set(id, readActivity(user));
    }
  } catch {
    // storage blocked: the database copy is shown alone
  }
  return { users, logs };
}

async function load<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? String(response.status));
  return body as T;
}

/** Reads on opening, on a new selection and on Refresh: no polling, to spare database reads. */
export function useSavedLogs(selected: string) {
  const [state, setState] = useState<{ users: CloudRecord[]; rows: LogRow[]; storage: string; error: string; loading: boolean }>(
    { users: [], rows: [], storage: "", error: "", loading: true });
  const [round, setRound] = useState(0);

  useEffect(() => {
    let stale = false;
    void (async () => {
      setState((s) => ({ ...s, loading: true }));
      const mine = cached();
      let users = mine.users;
      let storage = "";
      let error = "";
      const remote = new Map<string, Activity[]>();
      try {
        const list = await load<{ users: CloudRecord[]; storage: string }>("/api/demo-user");
        storage = list.storage;
        users = mergeUsers(list.users, mine.users);
        const ids = selected ? [selected] : list.users.slice(0, MAX_LOGS).map((u) => u.id);
        await Promise.all(ids.map(async (id) => {
          remote.set(id, (await load<{ activity: Activity[] }>(`/api/demo-user?id=${id}${selected ? "" : `&activity=${EACH}`}`)).activity);
        }));
      } catch (e) {
        error = `Cannot reach the database, showing what loaded and this browser's copy: ${(e as Error).message}`;
        users = mergeUsers(users, mine.users);
      }
      const rows = (selected ? [selected] : users.map((u) => u.id))
        .flatMap((user) => mergeActivity(remote.get(user) ?? [], mine.logs.get(user) ?? []).map((a) => ({ ...a, user })))
        .sort((a, b) => b.at - a.at);
      if (!stale) setState({ users, rows, storage, error, loading: false });
    })();
    return () => { stale = true; };
  }, [selected, round]);

  return { ...state, refresh: useCallback(() => setRound((n) => n + 1), []) };
}
