"use client";

import { useEffect, useState } from "react";
import { findUsers, groupUsers, type Row } from "@/lib/demo/aggregate";
import { SURFACE_NAMES } from "@/lib/demo/explain";
import { GlobalOverview } from "./GlobalOverview";
import { SavedLogs } from "./SavedLogs";
import { InfoTip } from "./ui";
import { useLiveRows } from "./useLiveRows";
import { VisitorXRay } from "./VisitorXRay";

const tab = "min-h-10 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold aria-pressed:border-blue-700 aria-pressed:bg-blue-700 aria-pressed:text-white";
const TABS = [
  ["saved", "Saved logs", "Every user ever saved: behaviours, and each change with its cause."],
  ["all", "All users", "Totals and a list of everyone using the store."],
  ["one", "Find a user", "Search by username or full email to see one person."],
] as const;

/** "All users", or search one person by username or email and open their X-Ray. */
export function AdminLive() {
  const { rows, storage, now, error } = useLiveRows();
  const [view, setView] = useState<"saved" | "all" | "one">("saved");
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
        <header className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Admin</h1>
          <InfoTip about="this page">Live view of how people use the store and how it adapts to them. Saved logs keep everything; the other two tabs cover the last 24 hours.</InfoTip>
          {storage === "memory" && (
            <InfoTip warn about="no database">
              No database yet, so users can disappear from this page. Add FIREBASE_SERVICE_ACCOUNT in Vercel and redeploy.
            </InfoTip>
          )}
          <a href="/demo" target="_blank" rel="noopener" className="ml-auto text-sm font-semibold text-blue-700 underline">Open store</a>
        </header>
        <div role="group" aria-label="View" className="flex gap-4">
          {TABS.map(([id, label, info]) => (
            <span key={id} className="relative inline-flex">
              <button type="button" className={tab} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
              <span className="absolute -right-2 -top-2"><InfoTip about={label}>{info}</InfoTip></span>
            </span>
          ))}
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        {view === "saved" && <SavedLogs />}
        {view !== "saved" && users.length === 0 && !error && <p className="rounded-xl bg-white p-4 shadow-sm">No users yet.</p>}
        {users.length > 0 && view === "all" && <GlobalOverview users={users} onPick={pick} />}
        {users.length > 0 && view === "one" && (
          <div className="grid items-start gap-3 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <div className="space-y-2">
              <input type="search" aria-label="Search username or email" placeholder="Name or email" value={query}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                onChange={(e) => setQuery(e.target.value)} />
              {found.length === 0 && <p className="text-sm">No match.</p>}
              <ul aria-label="Users" className="space-y-2">
                {found.map((u) => (
                  <li key={u.name}>
                    <button type="button" aria-pressed={u.name === current?.name} onClick={() => setSelected(u.name)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm aria-pressed:border-blue-700 aria-pressed:ring-2 aria-pressed:ring-blue-200">
                      <strong><span className={u.online ? "text-green-700" : "text-slate-400"}>{u.online ? "●" : "○"}</span> {u.name}</strong>
                      <span className="block text-slate-600">{SURFACE_NAMES[u.latest.snapshot.arm]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {current && <VisitorXRay key={current.name} u={current} />}
          </div>
        )}
      </div>
    </main>
  );
}
