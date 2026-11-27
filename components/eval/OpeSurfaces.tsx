"use client";

import { useState } from "react";
import type { evaluate } from "@/lib/eval/ope";
import type { surfaceBreakdown } from "@/lib/eval/inspect";
import { fixed, seconds } from "@/lib/eval/report";
import { SURFACE_NAMES } from "@/lib/demo/explain";
import type { ArmId } from "@/lib/attune-ui/types";
import { Card, Table, button, cell } from "./ui";

const LOW_ESS = 10; // display flag only

export function Ope({ result, policyLabel }: { result: ReturnType<typeof evaluate>; policyLabel: string }) {
  const name = (target: string) =>
    target === "policy" ? `Policy: ${policyLabel}`
    : target === "uniform" ? "Uniform random"
    : `Always ${target.slice("always:".length)}`;
  return (
    <Card title="Off-policy evaluation"
      note={`Estimated block reward (0–1) from ${result.n} randomised decisions; logged mean ${fixed(result.meanLoggedReward)}. Exploratory on human data.`}>
      <Table label="Off-policy estimates" columns={["Target policy", "IPS", "SNIPS", "Doubly robust", "ESS"]}>
        {Object.entries(result.targets).map(([target, v]) => (
          <tr key={target}>
            <td className={cell}>{name(target)}</td>
            <td className={cell}>{fixed(v.ips)}</td>
            <td className={cell}>{fixed(v.snips)}</td>
            <td className={cell}>{fixed(v.dr)}</td>
            <td className={cell}>{v.ess.toFixed(1)}{v.ess < LOW_ESS ? " ⚠ low" : ""}</td>
          </tr>
        ))}
      </Table>
      <p className="text-sm text-slate-600">
        Low effective sample size (ESS) means an estimate rests on very few decisions. IPS can leave the 0–1 range.
        Skipped: {Object.entries(result.skipped).map(([k, v]) => `${k} ${v}`).join(", ")}.
      </p>
    </Card>
  );
}

export function Surfaces({ rows }: { rows: ReturnType<typeof surfaceBreakdown> }) {
  const most = Math.max(1, ...rows.map((r) => r.selected));
  return (
    <Card title="Global adaptation breakdown"
      note="Every participant in this phase, before exclusions. Descriptive only: surfaces are chosen from context, so these averages do not compare surfaces causally.">
      <Table label="Surface selections" columns={["Surface", "Times selected", "Tasks shown", "Mean task time", "Success", "Mean ease (1–7)"]}>
        {rows.map((r) => (
          <tr key={r.surface}>
            <td className={cell} title={SURFACE_NAMES[r.surface as ArmId]}>{r.surface}</td>
            <td className={`${cell} min-w-40`}>
              <span className="flex items-center gap-2">
                <span aria-hidden className="h-3 flex-1">
                  <span className="block h-3 rounded-r bg-[#2a78d6]" style={{ width: `${(r.selected / most) * 100}%` }} />
                </span>
                <span className="w-8">{r.selected}</span>
              </span>
            </td>
            <td className={cell}>{r.tasks}</td>
            <td className={cell}>{seconds(r.meanTimeMs)}</td>
            <td className={cell}>{r.successRate === null ? "—" : `${Math.round(r.successRate * 100)}%`}</td>
            <td className={cell}>{fixed(r.meanEase, 2)}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

export function Verifier({ command }: { command: string }) {
  const [copied, setCopied] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied("Copied");
    } catch {
      setCopied("Copy failed: select the text and copy it");
    }
  };
  return (
    <Card title="Independent verifier"
      note="Python recomputes the confirmatory statistics and the pilot and confirmatory off-policy numbers from the same file.">
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 select-all break-all rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{command}</code>
        <button type="button" className={button} onClick={copy}>Copy</button>
      </div>
      <p role="status" className="text-sm text-green-800">{copied}</p>
      <p className="text-sm text-slate-600">First: pip install -r evaluation/requirements.txt</p>
    </Card>
  );
}
