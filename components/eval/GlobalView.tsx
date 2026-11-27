"use client";

import { useMemo } from "react";
import type { Models } from "@/lib/attune-ui/bandit/policy";
import { surfaceBreakdown } from "@/lib/eval/inspect";
import { evaluate } from "@/lib/eval/ope";
import { sampleTable, verifyCommand } from "@/lib/eval/report";
import { analyse } from "@/lib/eval/stats";
import type { Phase } from "@/lib/study/assignment";
import { Ope, Surfaces, Verifier } from "./OpeSurfaces";
import { Primary } from "./Primary";
import type { Loaded } from "./SourcePicker";

/** The policy whose value OPE estimates, and the file the verifier needs to reproduce it. */
export interface EvalPolicy { models: Models; label: string; path: string }

export function GlobalView({ loaded, phase, policy }: { loaded: Loaded; phase: string; policy: EvalPolicy }) {
  const { log } = loaded.dataset;
  const computed = useMemo(() => {
    try {
      const p = phase as Phase;
      return {
        result: analyse(log, p),
        sample: sampleTable(log, p),
        ope: evaluate(log, p, policy.models),
        surfaces: surfaceBreakdown(log, phase),
      };
    } catch (error) {
      console.error("eval:", error);
      return null;
    }
  }, [log, phase, policy]);

  if (!computed) {
    return <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">This file could not be analysed. Check it with the Python verifier.</p>;
  }
  return (
    <div className="space-y-3">
      <Primary result={computed.result} sample={computed.sample} />
      <Ope result={computed.ope} policyLabel={policy.label} />
      <Surfaces rows={computed.surfaces} />
      <Verifier command={verifyCommand(loaded.fileName, policy.path)} />
    </div>
  );
}
