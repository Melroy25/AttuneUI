import { contributions } from "@/lib/attune-ui/bandit/policy";
import type { SurfaceConfig } from "@/lib/attune-ui/surface/catalog";
import { FEATURES } from "@/lib/attune-ui/telemetry/context";
import { ARM_IDS } from "@/lib/attune-ui/types";
import { median, type DemoSession } from "@/lib/demo/session";

export function DecisionPanel({ session, surface, renderedBy }: {
  session: DemoSession;
  surface: SurfaceConfig;
  renderedBy: string;
}) {
  const { decision, active, models } = session;
  const ms = median(session.decisionMs);
  const why =
    decision && active && models ? contributions(models[active.modality][decision.action], decision.context) : null;
  return (
    <>
      <section>
        <h3 className="mb-1 font-bold">Thompson sampling: arm probabilities</h3>
        {!decision && <p className="text-slate-400">No sampled decision yet.</p>}
        {decision && ARM_IDS.map((a) => (
          <div key={a} className="flex items-center gap-2 py-0.5">
            <span className="w-24">{a}{a === decision.action ? " ✓" : ""}</span>
            <span aria-hidden className="h-2.5 flex-1 rounded-r bg-slate-900">
              <span className={`block h-2.5 rounded-r ${a === decision.action ? "bg-[#3987e5]" : "bg-slate-500"}`}
                style={{ width: `${decision.probs[a] * 100}%` }} />
            </span>
            <span className="w-10 text-right font-mono">{(decision.probs[a] * 100).toFixed(0)}%</span>
          </div>
        ))}
        {decision && <p className="mt-1 text-slate-400">Values of the last decision, as logged. ✓ = sampled.</p>}
      </section>

      <section className="space-y-1 text-slate-300">
        <p>Layout: {renderedBy}</p>
        <p>
          Updates: {session.liveUpdates} live · {session.simulatedUpdates} SIMULATED (prior is SIMULATED)
        </p>
        <p>
          Decision latency on this device:{" "}
          {ms === null ? "not measured yet" : `${ms.toFixed(2)} ms median of ${session.decisionMs.length}`}
        </p>
      </section>

      {why && decision && (
        <details>
          <summary className="cursor-pointer py-1 font-bold">Score of {decision.action}: context × weight</summary>
          {FEATURES.map((f, i) => (
            <div key={f} className="flex justify-between font-mono">
              <span>{f} = {decision.context[i].toFixed(2)}</span>
              <span>{why[i] >= 0 ? "+" : ""}{why[i].toFixed(3)}</span>
            </div>
          ))}
          {!session.liveUpdates && !session.simulatedUpdates && <p>Weights come from the SIMULATED prior.</p>}
        </details>
      )}
      <details>
        <summary className="cursor-pointer py-1 font-bold">Log</summary>
        <ol>{session.log.map((line, i) => <li key={`${session.log.length - i}`}>• {line}</li>)}</ol>
      </details>
      <details>
        <summary className="cursor-pointer py-1 font-bold">Surface JSON</summary>
        <pre className="overflow-x-auto">{JSON.stringify(surface, null, 2)}</pre>
      </details>
    </>
  );
}
