import type { ReactNode } from "react";
import { ARM_IDS } from "@/lib/attune-ui/types";
import { COUNTED, summariseAll, type UserView } from "@/lib/demo/aggregate";
import { SURFACE_NAMES } from "@/lib/demo/explain";

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-2 rounded-xl bg-white p-3 shadow-sm">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Bars({ rows }: { rows: [string, number][] }) {
  const most = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <>
      {rows.map(([label, n]) => (
        <div key={label} className="flex items-center gap-2 text-sm">
          <span className="w-36 shrink-0">{label}</span>
          <span aria-hidden className="h-3 flex-1">
            <span className="block h-3 rounded-r bg-[#2a78d6]" style={{ width: `${(n / most) * 100}%` }} />
          </span>
          <span className="w-8 text-right tabular-nums">{n}</span>
        </div>
      ))}
    </>
  );
}

const cell = "border-b border-slate-200 px-2 py-2 text-left tabular-nums";

export function GlobalOverview({ users, onPick }: { users: UserView[]; onPick: (name: string) => void }) {
  const all = summariseAll(users);
  const tiles = [
    ["Users", all.users], ["Online now", all.online], ["Layout decisions", all.adaptations],
    ["Struggles sensed", COUNTED.reduce((s, k) => s + all.struggles[k], 0)],
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-sm text-slate-600">{label}</p><p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Box title="Where users struggle"><Bars rows={COUNTED.map((k) => [k, all.struggles[k]])} /></Box>
        <Box title="Layout each user sees"><Bars rows={ARM_IDS.map((a) => [SURFACE_NAMES[a], all.showing[a]])} /></Box>
        <Box title="Layouts chosen (recent decisions)"><Bars rows={ARM_IDS.map((a) => [SURFACE_NAMES[a], all.chosen[a]])} /></Box>
      </div>
      <Box title="All users">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>{["User", "Status", "Page", "Layout", "Decisions", ...COUNTED].map((h) => <th key={h} scope="col" className={cell}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.name}>
                  <td className={cell}>
                    <button type="button" className="min-h-8 font-semibold text-blue-700 underline" onClick={() => onPick(u.name)}>{u.name}</button>
                  </td>
                  <td className={cell}>{u.online ? "● online" : "○ away"}</td>
                  <td className={cell}>{u.latest.snapshot.page}</td>
                  <td className={cell}>{SURFACE_NAMES[u.latest.snapshot.arm]}</td>
                  <td className={cell}>{u.adaptations}</td>
                  {COUNTED.map((k) => <td key={k} className={cell}>{u.totals[k]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>
      <Box title="Recent activity">
        {all.activity.length === 0 && <p className="text-sm text-slate-600">Nothing yet.</p>}
        <ul className="space-y-1 text-sm">
          {all.activity.slice(0, 20).map((a, i) => <li key={i}><strong>{a.name}</strong>: {a.line}</li>)}
        </ul>
        {all.pages.length > 0 && <p className="text-sm text-slate-600">Online by page: {all.pages.map(([p, n]) => `${p} ${n}`).join(" · ")}</p>}
      </Box>
    </div>
  );
}
