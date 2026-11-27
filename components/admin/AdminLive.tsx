"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SURFACE_NAMES } from "@/lib/demo/explain";
import type { LiveRow, Storage } from "@/lib/server/live";
import { VisitorXRay } from "./VisitorXRay";

const POLL_MS = 1000;

export function AdminLive() {
  const router = useRouter();
  const [data, setData] = useState<{ storage: Storage; sessions: LiveRow[] } | null>(null);
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
        if (!stopped) { setData(next); setError(""); }
      } catch {
        if (!stopped) setError("Connection lost. Retrying…");
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [router]);

  const sessions = data?.sessions ?? [];
  const current = sessions.find((s) => s.snapshot.id === selected) ?? sessions[0];

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
          Demo visitors active in the last minute. Updates every second. Demo activity is not study data.
          {data?.storage === "memory" && " Storage: this server's memory (fine locally; on Vercel create the live_sessions table)."}
        </p>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        {data && sessions.length === 0 && (
          <p className="rounded-xl bg-white p-4 shadow-sm">No visitors yet. Open the store in another window.</p>
        )}
        {current && (
          <div className="grid items-start gap-3 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <ul aria-label="Visitors" className="space-y-2">
              {sessions.map(({ snapshot: s, updatedAt }) => (
                <li key={s.id}>
                  <button type="button" aria-pressed={s.id === current.snapshot.id} onClick={() => setSelected(s.id)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm aria-pressed:border-blue-700 aria-pressed:ring-2 aria-pressed:ring-blue-200">
                    <strong className="font-mono">Visitor {s.id.slice(0, 6)}</strong>
                    <span className="block text-slate-600">{s.page} · {SURFACE_NAMES[s.arm]} · {s.viewportWidth}px</span>
                    <span className="block text-slate-600">seen {new Date(updatedAt).toLocaleTimeString()}</span>
                  </button>
                </li>
              ))}
            </ul>
            <VisitorXRay s={current.snapshot} />
          </div>
        )}
      </div>
    </main>
  );
}
