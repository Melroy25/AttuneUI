"use client";

import { useState } from "react";
import { SHORTCUTS } from "@/lib/bandit/shortcutBandit";
import { COUNTED } from "@/lib/demo/aggregate";
import { counts, type CloudRecord } from "@/lib/demo/cloud";
import type { Tally } from "@/lib/demo/comfort";
import { SURFACE_NAMES } from "@/lib/demo/explain";
import { STRUGGLE_LABELS } from "@/lib/demo/labels";
import { Box } from "./ui";
import { useSavedLogs, type LogRow } from "./useSavedLogs";

const SHOWN = 200;
const cell = "border-b border-slate-100 px-2 py-2 text-left align-top";
const COUNT_LABELS = {
  supportHovers: "Support hovers", supportClicks: "Support clicks", orderOpens: "Order opens", wishlist: "Wishlist presses",
};
const shortcutsOf = (u: CloudRecord) => SHORTCUTS.filter((k) => u.state.shortcuts.promoted[k]).join(", ") || "default";

const behaviours = (users: CloudRecord[]): [string, number][] => [
  ...COUNTED.map((k): [string, number] => [STRUGGLE_LABELS[k], users.reduce((s, u) => s + u.state.friction[k], 0)]),
  ...(Object.keys(COUNT_LABELS) as (keyof typeof COUNT_LABELS)[])
    .map((k): [string, number] => [COUNT_LABELS[k], users.reduce((s, u) => s + counts(u.state.habits)[k], 0)]),
];

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr>{head.map((h) => <th key={h} scope="col" className={cell}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} className={cell}>{v}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

const rate = (t: Tally) => {
  const problems = t.misses + t.rage + t.nearby;
  return t.taps === 0 ? "—"
    : `${problems} of ${t.taps} taps (${Math.round((problems / t.taps) * 100)}%): ${t.misses} missed, ${t.rage} rage, ${t.nearby} accidental`;
};
const comfortRow = ({ id, state: s }: CloudRecord) => [
  id, (s.language ?? s.preferences.locale) === "kn" ? "Kannada" : "English",
  s.comfort.on ? "Bigger" : s.comfort.reverted ? "Normal (undone)" : "Normal", rate(s.comfort.before), rate(s.comfort.after),
];

const logRow = (r: LogRow, all: boolean) => [
  new Date(r.at).toLocaleString(), ...(all ? [r.user] : []), r.trigger, r.change,
  r.confidence === undefined ? "—" : `${Math.round(r.confidence * 100)}%`,
];

/** Everything saved per user, across visits: behaviours, then each cause and the change it led to. */
export function SavedLogs() {
  const [selected, setSelected] = useState(""); // "" means all users
  const { users, rows, storage, error, loading, refresh } = useSavedLogs(selected);
  const current = users.find((u) => u.id === selected);
  const shown = selected ? users.filter((u) => u.id === selected) : users;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold">User{" "}
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3">
            <option value="">All users ({users.length})</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.id}</option>)}
          </select>
        </label>
        <button type="button" onClick={refresh} disabled={loading}
          className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      {storage === "memory" && <p role="alert" className="text-sm font-semibold text-amber-800">No database: saved users last only while this server runs.</p>}
      {!loading && users.length === 0 && <p className="rounded-xl bg-white p-4 shadow-sm">No saved users yet.</p>}
      {shown.length > 0 && (
        <>
          <Box title="Logged user behaviours" info="Totals kept across visits. Reset in the store does not clear them.">
            <dl className="grid grid-cols-2 gap-1.5 text-sm sm:grid-cols-5">
              {behaviours(shown).map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-100 p-2">
                  <dt className="text-xs text-slate-600">{label}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            {current && (
              <p className="text-sm">
                Layout: <strong>{SURFACE_NAMES[current.state.arm]}</strong> · Shortcuts: <strong>{shortcutsOf(current)}</strong>
                {current.updatedAt ? ` · Saved ${new Date(current.updatedAt).toLocaleString()}` : " · Only in this browser"}
              </p>
            )}
            {!selected && (
              <Table head={["User", "Layout", "Shortcuts"]}
                rows={users.map((u) => [u.id, SURFACE_NAMES[u.state.arm], shortcutsOf(u)])} />
            )}
          </Box>
          <Box title="Tap targets: before and after, and language"
            info="Problem taps at each size, counted the same way. Descriptive only: not a controlled comparison.">
            <Table head={["User", "Language", "Size now", "At normal size", "At bigger size"]} rows={shown.map(comfortRow)} />
          </Box>
          <Box title="UI changes applied (cause → effect)"
            info="Newest first. Confidence is the model's chance of picking that layout or shortcut; rule-based and manual changes have none.">
            {rows.length === 0 && <p className="text-sm text-slate-600">Nothing yet.</p>}
            {rows.length > 0 && (
              <Table
                head={["Time", ...(selected ? [] : ["User"]), "What was logged", "UI change applied", "Model confidence"]}
                rows={rows.slice(0, SHOWN).map((r) => logRow(r, !selected))} />
            )}
            {rows.length > SHOWN && <p className="text-xs text-slate-600">Showing the newest {SHOWN} of {rows.length}.</p>}
          </Box>
        </>
      )}
    </div>
  );
}
