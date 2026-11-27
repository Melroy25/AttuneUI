import { FEATURES } from "@/lib/attune-ui/telemetry/context";
import { ARM_IDS } from "@/lib/attune-ui/types";
import type { Participant } from "@/lib/eval/dataset";
import { buildTimeline, type BlockView, type DecisionView, type Delta } from "@/lib/eval/inspect";
import { ARM_NAMES, fixed, seconds, signed } from "@/lib/eval/report";
import type { EventLog } from "@/lib/attune-ui/bandit/replay";
import { Card, Table, cell } from "./ui";

const DECISIONS: Record<string, string> = {
  A: "Control decision (static, no bandit)", B: "Placebo decision (context-blind)", P: "Pilot decision (uniform random)",
};

function Decision({ d, arm }: { d: DecisionView; arm: string }) {
  return (
    <Card title={`${DECISIONS[arm] ?? "Bandit decision"}: ${d.action ?? "unreadable"}`}
      note={`Propensity ${fixed(d.propensity)} · ${d.modality ?? "?"} model · policy ${d.policyHash ?? "?"} · ${d.provenance ?? "provenance not recorded"}`}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Arm probabilities</h3>
          {ARM_IDS.map((a) => {
            const p = d.probs[a];
            return (
              <div key={a} className="flex items-center gap-2 py-0.5 text-sm">
                <span className="w-24">{a}{a === d.action ? " ✓" : ""}</span>
                <span aria-hidden className="h-3 flex-1 rounded-r bg-slate-100">
                  <span className={`block h-3 rounded-r ${a === d.action ? "bg-[#2a78d6]" : "bg-slate-400"}`}
                    style={{ width: `${Math.min((p ?? 0) * 100, 100)}%` }} />
                </span>
                <span className="w-14 text-right tabular-nums">{p === undefined ? "—" : `${(p * 100).toFixed(1)}%`}</span>
              </div>
            );
          })}
        </div>
        <div>
          <h3 className="text-sm font-semibold">Context vector (before the decision)</h3>
          <dl className="grid grid-cols-2 gap-x-4 text-sm">
            {FEATURES.map((f, i) => (
              <div key={f} className="flex justify-between border-b border-slate-100 py-0.5">
                <dt className="text-slate-600">{f}</dt><dd className="tabular-nums">{fixed(d.context[i], 2)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  );
}

const change = (v: number | null, unit: string, less: string, more: string, digits = 1) =>
  v === null ? "—" : Number(v.toFixed(digits)) === 0 ? "no change" : `${signed(v, digits, unit)} (${v < 0 ? less : more})`;

function Block({ b, arm, delta }: { b: BlockView; arm: string; delta: Delta | undefined }) {
  const title = b.block === 1 ? "Block 1 (Baseline)"
    : `Block ${b.block} (${arm === "A" ? "Control: static" : `${ARM_NAMES[arm] ?? arm}: ${b.decision?.action ?? "?"}`})`;
  return (
    <Card title={title}
      note={`Total ${seconds(b.totalMs)} (failed task = 90 s) · friction events ${b.frictionTotal ?? "—"} · mean ease ${fixed(b.meanEase, 1)}${b.chips.length ? ` · ${b.chips.join(", ")}` : ""}`}>
      <Table label={`${title} tasks`} columns={["Task", "Time", "Result", "Rage", "Dead", "Miss", "Thrash", "All friction", "Ease 1–7", "Surface"]}>
        {b.tasks.map((t) => (
          <tr key={t.index}>
            <td className={`${cell} whitespace-nowrap`}>{t.index + 1} · {t.taskId ?? "task"}</td>
            <td className={`${cell} whitespace-nowrap`}>{seconds(t.timeMs)}</td>
            <td className={`${cell} whitespace-nowrap`}>{t.success === null ? "—" : t.success ? "✓ success" : "✕ failed / timeout"}</td>
            {[t.friction?.rage, t.friction?.dead, t.friction?.miss, t.friction?.thrash, t.frictionTotal, t.ease].map((v, i) => (
              <td key={i} className={cell}>{v ?? "—"}</td>
            ))}
            <td className={cell}>{t.surface ?? "—"}</td>
          </tr>
        ))}
      </Table>
      {delta && (
        <p className="rounded-lg bg-slate-100 p-2 text-sm">
          <strong>Versus Block 1:</strong> time {change(delta.timeMs === null ? null : delta.timeMs / 1000, " s", "faster", "slower")} ·
          friction {change(delta.friction, "", "fewer", "more", 0)} · ease {change(delta.ease, "", "harder", "easier")}.
          <span className="block text-slate-600">One person’s change (different matched tasks) is not evidence of an effect.</span>
        </p>
      )}
    </Card>
  );
}

export function Timeline({ participant: p, events }: { participant: Participant; events: EventLog["events"] }) {
  const { blocks, deltas } = buildTimeline(events, p.id);
  const meta: [string, string][] = [
    ["participant_id", p.id], ["phase", p.phase], ["arm", `${p.arm} · ${ARM_NAMES[p.arm] ?? "unknown"}`],
    ["pointer", p.pointer], ["viewport_width", String(p.viewport_width ?? "—")],
    ["variant_order", p.variant_order ?? "—"], ["offline", String(p.offline)], ["repeat_device", String(p.repeat_device)],
  ];
  return (
    <div className="min-w-0 space-y-3">
      <Card title="User journey">
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {meta.map(([k, v]) => (
            <div key={k} className="min-w-0"><dt className="text-xs text-slate-600">{k}</dt><dd className="break-all font-semibold">{v}</dd></div>
          ))}
        </dl>
      </Card>
      {blocks.length === 0 && <p className="text-sm">No task events for this participant.</p>}
      {blocks.map((b) => (
        <div key={b.block} className="space-y-3">
          {b.decision && <Decision d={b.decision} arm={p.arm} />}
          <Block b={b} arm={p.arm} delta={deltas.find((d) => d.block === b.block)} />
        </div>
      ))}
    </div>
  );
}
