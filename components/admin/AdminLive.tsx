"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { COUNTED, groupUsers } from "@/lib/demo/aggregate";
import { SURFACE_NAMES } from "@/lib/demo/explain";
import type { LiveRow, Storage } from "@/lib/server/live";
import { GlobalOverview } from "./GlobalOverview";
import { VisitorXRay } from "./VisitorXRay";

const POLL_MS = 1000;
const tab = "min-h-10 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold aria-pressed:border-blue-700 aria-pressed:bg-blue-700 aria-pressed:text-white";

export function AdminLive() {
  const router = useRouter();
  const [data, setData] = useState<{ storage: Storage; sessions: LiveRow[]; at: number } | null>(null);
  const [view, setView] = useState<"all" | "one">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch("/api/live", { cache: "no-store", signal: AbortSignal.timeout(8000) });
        if (response.status === 401) return router.refresh();
        if (!response.ok) throw new Error(String(response.status));
        const next = await response.json();
        if (!stopped) { setData({ ...next, at: Date.now() }); setError(""); }
      } catch {
        if (!stopped) setError("Connection lost. Retrying…");
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [router]);

  const users = data ? groupUsers(data.sessions, data.at) : [];
  const current = users.find((u) => u.name === selected) ?? users[0];
  const pick = (name: string) => { setSelected(name); setView("one"); };

  return (
    <main className="min-h-dvh bg-slate-100 p-2 text-slate-900 sm:p-4">
      <div className="mx-auto max-w-6xl space-y-3">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-2xl font-bold">Live X-Ray</h1>
          <a href="/demo" target="_blank" rel="noopener" className="text-sm font-semibold text-blue-700 underline">Open store</a>
          <a href="/eval" target="_blank" rel="noopener" className="text-sm font-semibold text-blue-700 underline">Study results</a>
          <button type="button" className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            onClick={async () => { await fetch("/api/admin", { method: "DELETE" }); router.refresh(); }}>
            Sign out
          </button>
        </header>
        <p className="text-sm text-slate-600">
          Store users seen in the last 24 hours. Updates every second. Demo activity is not study data.
          {data?.storage === "memory" && " Storage: this server's memory (fine locally; on Vercel run supabase/schema.sql)."}
        </p>
        <div role="group" aria-label="View" className="flex gap-2">
          <button type="button" className={tab} aria-pressed={view === "all"} onClick={() => setView("all")}>All users</button>
          <button type="button" className={tab} aria-pressed={view === "one"} onClick={() => setView("one")}>One user</button>
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        {data && users.length === 0 && (
          <p className="rounded-xl bg-white p-4 shadow-sm">No users yet. Open the store in another window or on your phone and sign in.</p>
        )}
        {users.length > 0 && view === "all" && <GlobalOverview users={users} onPick={pick} />}
        {current && view === "one" && (
          <div className="grid items-start gap-3 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <ul aria-label="Users" className="space-y-2">
              {users.map((u) => (
                <li key={u.name}>
                  <button type="button" aria-pressed={u.name === current.name} onClick={() => setSelected(u.name)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm aria-pressed:border-blue-700 aria-pressed:ring-2 aria-pressed:ring-blue-200">
                    <strong>{u.online ? "●" : "○"} {u.name}</strong>
                    <span className="block text-slate-600">{u.latest.snapshot.page} · {SURFACE_NAMES[u.latest.snapshot.arm]} · {u.latest.snapshot.viewportWidth}px</span>
                    <span className="block text-slate-600">seen {new Date(u.latest.updatedAt).toLocaleTimeString()}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="min-w-0 space-y-3">
              <section className="rounded-xl bg-white p-3 text-sm shadow-sm">
                <h2 className="text-base font-bold">{current.name}: totals</h2>
                <p>
                  {current.adaptations} layout decisions · {current.sessions} browser session(s) ·{" "}
                  {COUNTED.map((k) => `${k} ${current.totals[k]}`).join(" · ")}
                </p>
                <p className="text-slate-600">
                  Layout history: {current.latest.snapshot.history.map((h) => `block ${h.block} ${SURFACE_NAMES[h.arm]}`).join(" → ") || "no decisions yet"}
                </p>
              </section>
              <VisitorXRay s={current.latest.snapshot} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
