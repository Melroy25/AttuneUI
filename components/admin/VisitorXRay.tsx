import { FEATURES } from "@/lib/attune-ui/telemetry/context";
import { ARM_IDS } from "@/lib/attune-ui/types";
import { COUNTED, type UserView } from "@/lib/demo/aggregate";
import { SURFACE_NAMES } from "@/lib/demo/explain";
import { STRUGGLE_LABELS, plainLog } from "@/lib/demo/labels";
import { ActivityList } from "./ActivityList";
import { Bars, Box } from "./ui";

const chip = "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium";

export function VisitorXRay({ u }: { u: UserView }) {
  const s = u.latest.snapshot;
  const chosen = s.decision?.action;
  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      <div className="min-w-0 md:col-span-2">
        <Box title={u.name} info="Who this is and what they are doing. Visits counts browser tabs in the last 24 hours. Learned counts how often their browser scored a layout from real use.">
          <div className="flex flex-wrap gap-1.5">
            <span className={chip}>{u.online ? "● Online" : "○ Away"}</span>
            {s.email && <span className={chip}>{s.email}</span>}
            <span className={chip}>Page: <span className="capitalize">{s.page}</span></span>
            <span className={chip}>{s.viewportWidth < 768 ? "Phone" : "Computer"} · {s.viewportWidth}px</span>
            <span className={chip}>Changes: {u.adaptations}</span>
            <span className={chip}>Visits: {u.sessions}</span>
            <span className={chip}>Learned: {s.learned ?? 0}</span>
          </div>
        </Box>
      </div>
      <Box title="Screen now" info={<>{s.why.map((line, i) => <p key={i}>{line}</p>)}</>}>
        <p className="text-xl font-bold">{SURFACE_NAMES[s.arm]}</p>
        {chosen && s.decision && (
          <p className="text-sm">Picked: {SURFACE_NAMES[chosen]} ({Math.round(s.decision.propensity * 100)}% chance)</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}>Auto-change: {s.auto ? "on" : "off"}</span>
          {s.pinned && <span className={chip}>Locked</span>}
          {chosen && chosen !== s.arm && <span className={chip}>Changed back</span>}
          {s.locale === "kn" && <span className={chip}>ಕನ್ನಡ</span>}
        </div>
        {s.changes.length > 0 && <ul className="list-disc pl-5 text-sm">{s.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>}
      </Box>
      <Box title="Struggles" info="Totals for this user. An orange box marks signs seen since the last change.">
        <dl className="grid grid-cols-3 gap-1.5 text-sm">
          {COUNTED.map((k) => (
            <div key={k} className={`rounded-lg p-2 ${s.friction[k] > 0 ? "bg-amber-100" : "bg-slate-100"}`}>
              <dt className="text-xs text-slate-600">{STRUGGLE_LABELS[k]}</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {u.totals[k]}{s.friction[k] > 0 && <span className="ml-1 text-xs font-medium">+{s.friction[k]} now</span>}
              </dd>
            </div>
          ))}
        </dl>
      </Box>
      <Box title="Why this layout" info="The chance each layout had at the last change. The tick marks the one picked; it is not always the highest, because the system also explores.">
        {!s.decision && <p className="text-sm text-slate-600">No change yet.</p>}
        {s.decision && (
          <Bars unit="%" chosen={SURFACE_NAMES[s.decision.action]}
            rows={ARM_IDS.map((a) => [SURFACE_NAMES[a], Math.round(s.decision!.probs[a] * 100)])} />
        )}
        <details className="text-sm">
          <summary className="min-h-8 cursor-pointer text-slate-600">Technical details</summary>
          <p>{s.modality === "coarse" ? "Touch" : "Mouse"} model · {s.mode} · block {s.block}</p>
          <dl className="grid grid-cols-2 gap-x-4">
            {FEATURES.map((f, i) => (
              <div key={f} className="flex justify-between"><dt className="text-slate-600">{f}</dt><dd className="tabular-nums">{s.context[i].toFixed(2)}</dd></div>
            ))}
          </dl>
        </details>
      </Box>
      <Box title="Activity" info="Each screen change and what caused it, newest first. System notes list decisions and learning.">
        <ActivityList entries={s.activity ?? []} />
        {s.log.length > 0 && (
          <details className="text-sm">
            <summary className="min-h-8 cursor-pointer text-slate-600">System notes</summary>
            <ol className="space-y-1">{s.log.map((line, i) => <li key={i}>• {plainLog(line)}</li>)}</ol>
          </details>
        )}
      </Box>
    </div>
  );
}
