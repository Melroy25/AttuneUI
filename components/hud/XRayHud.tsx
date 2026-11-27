import type { useDemo } from "@/components/demo/useDemo";
import type { SurfaceConfig } from "@/lib/attune-ui/surface/catalog";
import { FEATURES, buildContext } from "@/lib/attune-ui/telemetry/context";
import { summarizeFriction } from "@/lib/attune-ui/telemetry/friction";
import { explain } from "@/lib/demo/explain";
import { DecisionPanel } from "./DecisionPanel";
import { HudControls } from "./HudControls";

const SIGNALS = ["rage", "dead", "miss", "dwell", "thrash", "backtrack", "tortuosity"] as const;

/** Non-blocking drawer: bottom sheet below 1024 px, right-hand panel above. */
export function XRayHud({ d, surface, renderedBy, onClose }: {
  d: ReturnType<typeof useDemo>;
  surface: SurfaceConfig;
  renderedBy: string;
  onClose: () => void;
}) {
  const { session, events, modality } = d;
  const friction = summarizeFriction(events, modality);
  // The drawer only mounts after a click, so window exists here.
  const context = buildContext({ friction, viewportWidth: window.innerWidth, priorSessions: session.blocks });
  return (
    <aside aria-label="X-Ray HUD" lang="en"
      className="fixed inset-x-0 bottom-0 z-[25] h-[55dvh] space-y-4 overflow-y-auto overscroll-contain rounded-t-2xl bg-slate-950 p-3 text-xs text-slate-100 shadow-2xl lg:inset-y-0 lg:left-auto lg:h-auto lg:w-96 lg:rounded-none lg:rounded-l-2xl">
      <div className="sticky -top-3 z-10 -mx-3 -mt-3 flex items-center justify-between bg-slate-950 px-3 py-2">
        <h2 className="text-sm font-bold">X-Ray HUD · Block {session.blocks + 1}</h2>
        <button type="button" onClick={onClose} aria-label="Close X-Ray HUD" data-tip="Close AI logs" className="h-10 w-10 rounded-lg text-lg hover:bg-slate-800">✕</button>
      </div>

      <HudControls d={d} />

      <section aria-label="Why this layout" className="space-y-1 rounded-lg border border-slate-700 p-2 text-sm">
        <h3 className="font-bold">Why this layout</h3>
        {explain(session).map((line) => <p key={line}>{line}</p>)}
      </section>

      <section>
        <h3 className="mb-1 font-bold">Friction this block</h3>
        <dl className="grid grid-cols-4 gap-1">
          {SIGNALS.map((k) => (
            <div key={k} className="rounded bg-slate-900 p-1.5">
              <dt className="truncate text-slate-400">{k}</dt>
              <dd className="font-mono text-base">{k === "tortuosity" ? friction[k].toFixed(1) : friction[k]}</dd>
            </div>
          ))}
          <div className="rounded bg-slate-900 p-1.5">
            <dt className="truncate text-slate-400">undo · pin</dt>
            <dd className="font-mono text-base">{session.overrides.undo} · {session.overrides.pin}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="mb-1 font-bold">
          Model: {modality} ({modality === "coarse" ? "touch" : "mouse / pen"}) · live context
        </h3>
        <dl className="grid grid-cols-2 gap-x-3 font-mono">
          {FEATURES.map((f, i) => (
            <div key={f} className="flex justify-between"><dt>{f}</dt><dd>{context[i].toFixed(2)}</dd></div>
          ))}
        </dl>
      </section>

      <DecisionPanel session={session} surface={surface} renderedBy={renderedBy} />
    </aside>
  );
}
