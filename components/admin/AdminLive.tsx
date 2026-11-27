"use client";

import { useEffect, useState } from "react";
import { COUNTED, findUsers, groupUsers, type Row } from "@/lib/demo/aggregate";
import { SURFACE_NAMES } from "@/lib/demo/explain";
import type { Storage } from "@/lib/server/live";
import { GlobalOverview } from "./GlobalOverview";
import { useLiveRows } from "./useLiveRows";
import { VisitorXRay } from "./VisitorXRay";

const tab = "min-h-10 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold aria-pressed:border-blue-700 aria-pressed:bg-blue-700 aria-pressed:text-white";

/** "All users", or search one person by username or email and open their X-Ray. */
export function AdminLive() {
  const { rows, storage, now, error } = useLiveRows();
  const [view, setView] = useState<"all" | "one">("all");
  const [query, setQuery] = useState("");
  const [emailHash, setEmailHash] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  // Only hashes of addresses are stored, so a full email is matched by hashing what was typed.
  useEffect(() => {
    const address = query.trim().toLowerCase();
    if (!address.includes("@")) return setEmailHash("");
    let stale = false;
    void crypto.subtle.digest("SHA-256", new TextEncoder().encode(address)).then((bytes) => {
      if (!stale) setEmailHash(Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join(""));
    });
    return () => { stale = true; };
  }, [query]);

  const users = groupUsers(rows as Row[], now);
  const found = findUsers(users, query, emailHash);
  const current = found.find((u) => u.name === selected) ?? found[0];
  const pick = (name: string) => { setQuery(""); setSelected(name); setView("one"); };

  return (
    <main className="min-h-dvh bg-slate-100 p-2 text-slate-900 sm:p-4">
      <div className="mx-auto max-w-6xl space-y-3">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-2xl font-bold">Admin · Live X-Ray</h1>
          <a href="/demo" target="_blank" rel="noopener" className="text-sm font-semibold text-blue-700 underline">Open store</a>
        </header>
        <p className="text-sm text-slate-600">
          Store users from the last 24 hours, updating live. {storageNote(storage)}
        </p>
        <div role="group" aria-label="View" className="flex gap-2">
          <button type="button" className={tab} aria-pressed={view === "all"} onClick={() => setView("all")}>All users</button>
          <button type="button" className={tab} aria-pressed={view === "one"} onClick={() => setView("one")}>Find a user</button>
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        {users.length === 0 && !error && (
          <p className="rounded-xl bg-white p-4 shadow-sm">No users yet. Open the store on a phone or in another window and sign in.</p>
        )}
        {users.length > 0 && view === "all" && <GlobalOverview users={users} onPick={pick} />}
        {users.length > 0 && view === "one" && (
          <div className="grid items-start gap-3 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <div className="space-y-2">
              <input type="search" aria-label="Search username or email" placeholder="Username or full email" value={query}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                onChange={(e) => setQuery(e.target.value)} />
              {found.length === 0 && <p className="text-sm">No user matches.</p>}
              <ul aria-label="Users" className="space-y-2">
                {found.map((u) => (
                  <li key={u.name}>
                    <button type="button" aria-pressed={u.name === current?.name} onClick={() => setSelected(u.name)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm aria-pressed:border-blue-700 aria-pressed:ring-2 aria-pressed:ring-blue-200">
                      <strong>{u.online ? "●" : "○"} {u.name}</strong>
                      {u.latest.snapshot.email && <span className="block break-all text-slate-600">{u.latest.snapshot.email}</span>}
                      <span className="block text-slate-600">{u.latest.snapshot.page} · {SURFACE_NAMES[u.latest.snapshot.arm]}</span>
                      <span className="block text-slate-600">seen {new Date(u.latest.updatedAt).toLocaleTimeString()}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {current && (
              <div className="min-w-0 space-y-3">
                <section className="rounded-xl bg-white p-3 text-sm shadow-sm">
                  <h2 className="text-base font-bold">{current.name}: details</h2>
                  <p>
                    {current.latest.snapshot.email ?? "username account"} · {current.latest.snapshot.viewportWidth}px screen ·{" "}
                    {current.adaptations} layout decisions · {current.sessions} browser session(s)
                  </p>
                  <p>Totals: {COUNTED.map((k) => `${k} ${current.totals[k]}`).join(" · ")}</p>
                  <p className="text-slate-600">
                    Layout history: {current.latest.snapshot.history.map((h) => `block ${h.block} ${SURFACE_NAMES[h.arm]}`).join(" → ") || "no decisions yet"}
                  </p>
                </section>
                <VisitorXRay s={current.latest.snapshot} />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const storageNote = (storage: Storage | null) =>
  storage === "memory" ? "Warning: no database yet (set FIREBASE_SERVICE_ACCOUNT), so users may disappear on Vercel." : "";
