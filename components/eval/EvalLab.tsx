"use client";

import { useState } from "react";
import { badgeFor } from "@/lib/eval/dataset";
import { GlobalView, type EvalPolicy } from "./GlobalView";
import { Participants } from "./Participants";
import { SourcePicker, type Loaded } from "./SourcePicker";
import { Pills } from "./ui";

const TABS = ["Global", "Participants"];

export function EvalLab({ policy }: { policy: EvalPolicy }) {
  const [loaded, setLoaded] = useState<Loaded & { key: number } | null>(null);
  const [phase, setPhase] = useState("");
  const [tab, setTab] = useState(TABS[0]);
  const dataset = loaded?.dataset;
  const badge = dataset && badgeFor(dataset, phase);

  return (
    <main className="min-h-dvh bg-slate-100 p-2 text-slate-900 sm:p-4">
      <div className="mx-auto max-w-6xl space-y-3">
        <header>
          <h1 className="text-2xl font-bold">Judge inspector</h1>
          <p className="text-sm text-slate-600">AttuneUI evaluation: causal metrics, off-policy estimates and every participant’s journey.</p>
        </header>
        <SourcePicker onLoad={(next) => {
          setLoaded((old) => ({ ...next, key: (old?.key ?? 0) + 1 }));
          setPhase(next.dataset.phases[0].phase);
        }} />
        {dataset && (
          <>
            <div role="status" className={`space-y-1 rounded-xl border-2 p-3 ${dataset.simulated ? "border-amber-600 bg-amber-50" : "border-blue-700 bg-blue-50"}`}>
              <p className="flex flex-wrap items-center gap-2">
                <strong className={`rounded px-2 py-1 text-sm text-white ${dataset.simulated ? "bg-amber-800" : "bg-blue-800"}`}>{badge}</strong>
                <span className="text-sm">
                  Participants in phase “{phase}”: {dataset.log.participants.filter((p) => p.phase === phase).length} ·{" "}
                  {dataset.log.participants.length} in file · exported {dataset.exportedAt ?? "time not recorded"} · {loaded.source}
                </span>
              </p>
              {dataset.simulated && (
                <p className="text-sm font-semibold">
                  SIMULATED data from our own simulator (times, friction and ease ratings are generated). It checks the
                  pipeline and is not evidence about real people.
                </p>
              )}
              {dataset.provenance && <p className="text-xs text-slate-700">Provenance: {dataset.provenance}</p>}
              {(dataset.dropped.participants > 0 || dataset.dropped.events > 0) && (
                <p className="text-sm font-semibold text-red-800">
                  Ignored malformed rows: {dataset.dropped.participants} participants, {dataset.dropped.events} events.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Pills label="View" options={TABS} value={tab} onChange={setTab} />
              {tab === TABS[0] && (
                <Pills label="Phase" options={dataset.phases.map((p) => p.phase)} value={phase} onChange={setPhase} />
              )}
            </div>
            {tab === TABS[0]
              ? <GlobalView key={loaded.key} loaded={loaded} phase={phase} policy={policy} />
              : <Participants key={loaded.key} dataset={dataset} />}
          </>
        )}
      </div>
    </main>
  );
}
