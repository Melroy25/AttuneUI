"use client";

import { useId, type ReactNode } from "react";

const WIDTH = 256;

/** A small icon that explains its neighbour when clicked. Native popover: closes on outside click. */
export function InfoTip({ about, warn, children }: { about: string; warn?: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <>
      <button type="button" popoverTarget={id} aria-label={warn ? `Warning: ${about}` : `About ${about}`}
        className={`grid h-6 w-6 flex-none place-items-center rounded-full border text-xs font-bold leading-none ${
          warn ? "border-amber-600 bg-amber-100 text-amber-900" : "border-slate-300 bg-white text-slate-500 hover:border-blue-600 hover:text-blue-700"}`}
        onClick={(e) => {
          // Runs before the popover opens, so it appears under this icon.
          const icon = e.currentTarget.getBoundingClientRect();
          const tip = document.getElementById(id);
          if (!tip) return;
          const space = document.documentElement.clientWidth - WIDTH - 8;
          tip.style.top = `${icon.bottom + 6}px`;
          tip.style.left = `${Math.max(8, Math.min(icon.right - WIDTH, space))}px`;
        }}>
        {warn ? "!" : "i"}
      </button>
      <div id={id} popover="auto" style={{ width: WIDTH }}
        className="fixed inset-auto m-0 space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-normal text-slate-800 shadow-xl">
        {children}
      </div>
    </>
  );
}

export function Box({ title, info, children }: { title: string; info: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-2 rounded-xl bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-bold">{title}</h2>
        <InfoTip about={title}>{info}</InfoTip>
      </div>
      {children}
    </section>
  );
}

/** Horizontal bars, one hue; `chosen` marks one row. */
export function Bars({ rows, chosen, unit = "" }: { rows: [string, number][]; chosen?: string; unit?: string }) {
  const most = unit === "%" ? 100 : Math.max(1, ...rows.map(([, n]) => n));
  return (
    <>
      {rows.map(([label, n]) => (
        <div key={label} className="flex items-center gap-2 text-sm">
          <span className={`w-36 shrink-0 ${label === chosen ? "font-semibold" : ""}`}>{label}{label === chosen ? " ✓" : ""}</span>
          <span aria-hidden className="h-3 flex-1">
            <span className={`block h-3 rounded-r ${chosen && label !== chosen ? "bg-slate-300" : "bg-[#2a78d6]"}`}
              style={{ width: `${(n / most) * 100}%` }} />
          </span>
          <span className="w-10 text-right tabular-nums">{n}{unit}</span>
        </div>
      ))}
    </>
  );
}

const cell = "border-b border-slate-100 px-2 py-2 text-left align-top";

export function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
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
