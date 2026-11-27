import { contributions } from "@/lib/attune-ui/bandit/policy";
import type { SurfaceConfig } from "@/lib/attune-ui/surface/catalog";
import { FEATURES } from "@/lib/attune-ui/telemetry/context";
import { summarizeFriction } from "@/lib/attune-ui/telemetry/friction";
import { ARM_IDS, type InteractionEvent, type Modality } from "@/lib/attune-ui/types";
import { median, type DemoSession } from "@/lib/demo/session";

export function XRayHud({ session, surface, events, modality, renderedBy }: {
  session: DemoSession;
  surface: SurfaceConfig;
  events: InteractionEvent[];
  modality: Modality;
  renderedBy: string;
}) {
  const friction = summarizeFriction(events, modality);
  const { decision, active, models } = session;
  const ms = median(session.decisionMs);
  const why =
    decision && active && models
      ? contributions(models[active.modality][decision.action], decision.context)
      : null;
  return (
    <aside className="space-y-3 rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100">
      <h2 className="text-sm font-bold">X-Ray</h2>
      <p>
        Layout: {renderedBy}
        <br />
        Updates: {session.liveUpdates} live · {session.simulatedUpdates} SIMULATED (prior is SIMULATED)
        <br />
        Decision latency on this device:{" "}
        {ms === null ? "not measured yet" : `${ms.toFixed(2)} ms median of ${session.decisionMs.length}`}
      </p>
      <div>
        <h3 className="font-bold">This block ({modality} model)</h3>
        rage {friction.rage} · dead {friction.dead} · miss {friction.miss} · dwell {friction.dwell} · thrash{" "}
        {friction.thrash} · backtrack {friction.backtrack}
      </div>
      {decision && (
        <div>
          <h3 className="font-bold">Arm probabilities (logged exactly)</h3>
          {ARM_IDS.map((a) => (
            <div key={a} className="flex items-center gap-2">
              <span className="w-20">{a}</span>
              <span className="h-2 flex-1 rounded bg-slate-800">
                <span
                  className={`block h-2 rounded ${a === decision.action ? "bg-emerald-400" : "bg-slate-500"}`}
                  style={{ width: `${decision.probs[a] * 100}%` }}
                />
              </span>
              <span className="w-10 text-right">{(decision.probs[a] * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
      {why && decision && (
        <div>
          <h3 className="font-bold">Score of {decision.action}: context × weight</h3>
          {FEATURES.map((f, i) => (
            <div key={f} className="flex justify-between">
              <span>{f} = {decision.context[i].toFixed(2)}</span>
              <span>{why[i] >= 0 ? "+" : ""}{why[i].toFixed(3)}</span>
            </div>
          ))}
          {!session.liveUpdates && !session.simulatedUpdates && <p>Weights come from the SIMULATED prior.</p>}
        </div>
      )}
      <div>
        <h3 className="font-bold">Log</h3>
        <ol>{session.log.map((line, i) => <li key={`${session.log.length - i}`}>• {line}</li>)}</ol>
      </div>
      <details>
        <summary className="cursor-pointer font-bold">Surface JSON</summary>
        <pre className="overflow-x-auto">{JSON.stringify(surface, null, 2)}</pre>
      </details>
    </aside>
  );
}
