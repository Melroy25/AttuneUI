import type { ReactNode } from "react";

export const cell = "border-b border-slate-200 px-2 py-1.5 text-right tabular-nums";
export const head = "border-b border-slate-300 px-2 py-1.5 text-right text-xs font-semibold text-slate-600";
export const field = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";
export const button = "min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50";
export const primary = "min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50";

export function Card({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-3 rounded-xl bg-white p-3 shadow-sm sm:p-4">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {note && <p className="text-sm text-slate-600">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** Wide tables scroll inside their card, never the page. First column is left-aligned. */
export function Table({ columns, children, label }: { columns: string[]; children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={label}>
      <table className="w-full border-collapse text-sm [&_td:first-child]:text-left [&_th:first-child]:text-left">
        <thead>
          <tr>{columns.map((c) => <th key={c} scope="col" className={head}>{c}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Pills({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1 text-sm">
      <span className="mr-1 text-slate-600">{label}</span>
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}
          className="min-h-10 min-w-10 rounded-full border border-slate-300 px-3 aria-pressed:border-blue-700 aria-pressed:bg-blue-700 aria-pressed:text-white">
          {o}
        </button>
      ))}
    </div>
  );
}
