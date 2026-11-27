import {
  ALPHA, ARM_NAMES, fixed, pValue, sampleTable, speedInterval, speedText, verdict, type Contrast,
} from "@/lib/eval/report";
import type { analyse } from "@/lib/eval/stats";
import { Card, Table, cell } from "./ui";

const TONE = {
  good: ["▲", "border-green-700 bg-green-50 text-green-900"],
  bad: ["▼", "border-red-700 bg-red-50 text-red-900"],
  none: ["●", "border-slate-400 bg-slate-100 text-slate-800"],
} as const;

function ContrastCard({ c }: { c: Contrast }) {
  const v = verdict(c);
  const [icon, tone] = TONE[v.tone];
  const other = c.name.slice(2);
  const rows: [string, string][] = [
    ["95% bootstrap CI (faster)", speedInterval(c.ci95)],
    ["Adjusted log-time difference", fixed(c.difference)],
    ["Permutation p", pValue(c.p)],
    ["Holm-adjusted p", pValue(c.pHolm)],
    ["Mann-Whitney U · p", c.mannWhitney ? `${c.mannWhitney.u} · ${pValue(c.mannWhitney.p)}` : "—"],
    ["Hedges g", fixed(c.hedgesG, 2)],
    [`N (C · ${other})`, c.n.join(" · ")],
  ];
  return (
    <article className="min-w-0 space-y-2 rounded-lg border border-slate-200 p-3">
      <h3 className="font-semibold">AttuneUI (C) vs {ARM_NAMES[other]} ({other})</h3>
      <p className="text-3xl font-bold">{speedText(c.difference)}</p>
      <p className={`rounded border-l-4 px-2 py-1 text-sm font-semibold ${tone}`}><span aria-hidden>{icon} </span>{v.text}</p>
      <dl className="text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-b border-slate-100 py-1">
            <dt className="text-slate-600">{label}</dt><dd className="text-right tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function Primary({ result, sample }: {
  result: ReturnType<typeof analyse>;
  sample: ReturnType<typeof sampleTable>;
}) {
  // C vs B (the placebo test) first.
  const ordered = [...result.contrasts].sort((a, b) => b.name.localeCompare(a.name));
  const columns = ["Arm", "Enrolled", ...sample.pointers.map((p) => `Analysed ${p}`), "Analysed", "Repeat device", "Incomplete", "Offline"];
  return (
    <>
      <Card title="Primary causal metrics"
        note={`CUPED-adjusted log Block-2 task time (failed task = 90 s; θ = ${fixed(result.theta)}). Two-sided, Holm-corrected, α = ${ALPHA}.`}>
        {result.phase !== "confirmatory" && (
          <p className="rounded bg-amber-100 p-2 text-sm font-semibold text-amber-900">
            Phase “{result.phase}” is not the confirmatory study: no confirmatory claim can be made from it.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">{ordered.map((c) => <ContrastCard key={c.name} c={c} />)}</div>
      </Card>
      <Card title="Sample and exclusions"
        note={`${sample.total} participants in this phase. Exclusions apply in order: repeat device, incomplete, offline assignment.`}>
        <Table label="Sample and exclusions by arm" columns={columns}>
          {sample.rows.map((r) => (
            <tr key={r.arm}>
              <td className={cell}>{r.arm} · {ARM_NAMES[r.arm] ?? "unknown"}</td>
              {[r.enrolled, ...r.byPointer, r.included, r.repeatDevice, r.incomplete, r.offline].map((v, i) => (
                <td key={columns[i + 1]} className={cell}>{v}</td>
              ))}
            </tr>
          ))}
        </Table>
        <p className="text-sm text-slate-600">
          Rows from other phases in this file: {sample.otherPhase} (never pooled). Participants without arm A, B or C: {sample.unknownArm}.
        </p>
      </Card>
    </>
  );
}
