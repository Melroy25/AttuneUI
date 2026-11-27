import { ARM_IDS } from "@/lib/attune-ui/types";
import { COUNTED, summariseAll, type UserView } from "@/lib/demo/aggregate";
import { SURFACE_NAMES } from "@/lib/demo/explain";
import { STRUGGLE_LABELS, plainLog } from "@/lib/demo/labels";
import { Bars, Box, InfoTip } from "./ui";

const cell = "border-b border-slate-100 px-2 py-2 text-left tabular-nums";
const struggleCount = (t: Record<(typeof COUNTED)[number], number>) => COUNTED.reduce((s, k) => s + t[k], 0);

export function GlobalOverview({ users, onPick }: { users: UserView[]; onPick: (name: string) => void }) {
  const all = summariseAll(users);
  const tiles: [string, number, string][] = [
    ["Users", all.users, "People who used the store in the last 24 hours."],
    ["Online", all.online, "Users active in about the last minute."],
    ["Changes", all.adaptations, "Times the store chose a layout (the latest 10 per visit are counted)."],
    ["Struggles", struggleCount(all.struggles), "All signs of difficulty sensed, added together."],
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, value, info]) => (
          <div key={label} className="rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-slate-600">{label}</p>
              <InfoTip about={label}>{info}</InfoTip>
            </div>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Box title="Struggles" info={<>
          <p><b>Rage clicks</b>: fast repeated clicks. <b>Dead clicks</b>: clicks on things that do nothing.</p>
          <p><b>Missed taps</b>: just beside a button. <b>Long hovers</b>: pointer resting over 1.5 s.</p>
          <p><b>Scroll shaking</b>: up and down quickly. <b>Going back</b>: returning to the previous item.</p>
        </>}>
          <Bars rows={COUNTED.map((k) => [STRUGGLE_LABELS[k], all.struggles[k]])} />
        </Box>
        <Box title="On screen now" info="How many users are currently seeing each layout.">
          <Bars rows={ARM_IDS.map((a) => [SURFACE_NAMES[a], all.showing[a]])} />
        </Box>
        <Box title="Picked so far" info="How often each layout was picked, across recent changes.">
          <Bars rows={ARM_IDS.map((a) => [SURFACE_NAMES[a], all.chosen[a]])} />
        </Box>
      </div>
      <Box title="Users" info="Click a name to open that user's details. A filled dot means online.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>{["User", "Page", "Layout", "Changes", "Struggles"].map((h) => <th key={h} scope="col" className={cell}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.name}>
                  <td className={cell}>
                    <span aria-label={u.online ? "online" : "away"} className={u.online ? "text-green-700" : "text-slate-400"}>{u.online ? "●" : "○"}</span>{" "}
                    <button type="button" className="min-h-8 font-semibold text-blue-700 underline" onClick={() => onPick(u.name)}>{u.name}</button>
                  </td>
                  <td className={`${cell} capitalize`}>{u.latest.snapshot.page}</td>
                  <td className={cell}>{SURFACE_NAMES[u.latest.snapshot.arm]}</td>
                  <td className={cell}>{u.adaptations}</td>
                  <td className={cell}>{struggleCount(u.totals)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>
      <Box title="Activity" info="The latest things that happened, up to three per user.">
        {all.activity.length === 0 && <p className="text-sm text-slate-600">Nothing yet.</p>}
        <ul className="space-y-1 text-sm">
          {all.activity.slice(0, 12).map((a, i) => <li key={i}><strong>{a.name}</strong> · {plainLog(a.line)}</li>)}
        </ul>
      </Box>
    </div>
  );
}
