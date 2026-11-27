import type { useDemo } from "@/components/demo/useDemo";
import { SURFACE_NAMES } from "@/lib/demo/explain";
import type { DemoMode } from "@/lib/demo/session";
import { ARM_IDS, type ArmId } from "@/lib/attune-ui/types";

const MODES: [DemoMode, string][] = [["static", "Static"], ["placebo", "Random placebo"], ["attune", "AttuneUI"]];
const btn = "min-h-10 rounded-lg border border-slate-600 px-3 hover:bg-slate-800";

/** Demo-only triggers, kept here so the store itself looks like a product. */
export function HudControls({ d }: { d: ReturnType<typeof useDemo> }) {
  return (
    <section aria-label="Demo controls" className="space-y-2">
      <div role="group" aria-label="Policy" className="flex gap-1">
        {MODES.map(([mode, label]) => (
          <button key={mode} type="button" aria-pressed={d.mode === mode} onClick={() => d.setMode(mode)}
            className={`${btn} flex-1 px-1 aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-slate-900`}>
            {label}
          </button>
        ))}
      </div>
      <label className="flex min-h-8 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={d.auto} onChange={(e) => d.setAuto(e.target.checked)} />
        Adapt automatically after 3 struggles
      </label>
      <button type="button" onClick={d.endBlock}
        className="min-h-11 w-full rounded-lg bg-emerald-700 px-3 text-sm font-semibold hover:bg-emerald-600">
        Trigger Adaptation (finish block)
      </button>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-amber-500 p-2">
        <strong className="text-amber-300">SIMULATED learning</strong>
        {[10, 50].map((n) => (
          <button key={n} type="button" className={btn} onClick={() => d.forward(n)}>+{n} users</button>
        ))}
      </div>
      <label className="flex items-center gap-2">
        <span className="shrink-0">Preview a layout (manual)</span>
        <select value="" onChange={(e) => d.preview(e.target.value as ArmId)}
          className="min-h-10 w-full min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-900 px-2">
          <option value="" disabled>Choose…</option>
          {ARM_IDS.map((a) => <option key={a} value={a}>{a} · {SURFACE_NAMES[a]}</option>)}
        </select>
      </label>
      <label className="flex min-h-8 items-center gap-2">
        <input type="checkbox" checked={d.demoReading} onChange={(e) => d.setDemoReading(e.target.checked)} />
        Demo reading threshold (5 s, else 60 s)
      </label>
    </section>
  );
}
