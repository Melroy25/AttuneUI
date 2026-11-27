import type { ReactNode } from "react";
import { FEATURES } from "@/lib/attune-ui/telemetry/context";
import { ARM_IDS } from "@/lib/attune-ui/types";
import { SURFACE_NAMES, describeFriction } from "@/lib/demo/explain";
import type { LiveSnapshot } from "@/lib/demo/live";

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-2 rounded-xl bg-white p-3 shadow-sm">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

const SIGNALS = ["rage", "dead", "miss", "dwell", "thrash", "backtrack", "tortuosity"] as const;

export function VisitorXRay({ s }: { s: LiveSnapshot }) {
  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      <Box title={`Showing now: ${SURFACE_NAMES[s.arm]}`}>
        <p className="text-sm">
          Page {s.page} · block {s.block} · {s.mode} mode · language {s.locale} · automatic {s.auto ? "on" : "off"}
          {s.pinned ? " · layout pinned" : ""}
        </p>
        <h3 className="text-sm font-semibold">What happened</h3>
        {s.why.map((line, i) => <p key={i} className="text-sm">{line}</p>)}
        {s.changes.length > 0 && <ul className="list-disc pl-5 text-sm">{s.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>}
      </Box>
      <Box title="Struggle since the last change">
        <p className="text-sm">Detected: {describeFriction(s.friction)}.</p>
        <dl className="grid grid-cols-4 gap-1 text-sm">
          {SIGNALS.map((k) => (
            <div key={k} className={`rounded-lg p-2 ${k !== "tortuosity" && s.friction[k] > 0 ? "bg-amber-100" : "bg-slate-100"}`}>
              <dt className="truncate text-xs text-slate-600">{k}</dt>
              <dd className="text-lg font-semibold tabular-nums">{k === "tortuosity" ? s.friction[k].toFixed(1) : s.friction[k]}</dd>
            </div>
          ))}
        </dl>
      </Box>
      <Box title="Last decision: arm probabilities">
        {!s.decision && <p className="text-sm text-slate-600">No sampled decision yet.</p>}
        {s.decision && ARM_IDS.map((a) => (
          <div key={a} className="flex items-center gap-2 text-sm">
            <span className="w-24">{a}{a === s.decision!.action ? " ✓" : ""}</span>
            <span aria-hidden className="h-3 flex-1 rounded-r bg-slate-100">
              <span className={`block h-3 rounded-r ${a === s.decision!.action ? "bg-[#2a78d6]" : "bg-slate-400"}`}
                style={{ width: `${s.decision!.probs[a] * 100}%` }} />
            </span>
            <span className="w-10 text-right tabular-nums">{Math.round(s.decision!.probs[a] * 100)}%</span>
          </div>
        ))}
        <h3 className="pt-1 text-sm font-semibold">Live context ({s.modality} model)</h3>
        <dl className="grid grid-cols-2 gap-x-4 text-sm">
          {FEATURES.map((f, i) => (
            <div key={f} className="flex justify-between"><dt className="text-slate-600">{f}</dt><dd className="tabular-nums">{s.context[i].toFixed(2)}</dd></div>
          ))}
        </dl>
      </Box>
      <Box title="Event log (newest first)">
        {s.log.length === 0 && <p className="text-sm text-slate-600">Nothing yet.</p>}
        <ol className="space-y-1 text-sm">{s.log.map((line, i) => <li key={i}>• {line}</li>)}</ol>
      </Box>
    </div>
  );
}
