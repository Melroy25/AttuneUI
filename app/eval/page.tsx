import type { Metadata } from "next";
import { connection } from "next/server";
import { EvalLab } from "@/components/eval/EvalLab";
import type { Models } from "@/lib/attune-ui/bandit/policy";
import { loadFrozenPolicy } from "@/lib/server/frozen";
import prior from "@/data/policy.prior.json";

export const metadata: Metadata = { title: "AttuneUI judge inspector" };

export default async function EvalPage() {
  await connection(); // the frozen policy is read per request
  const frozen = loadFrozenPolicy().policy;
  // The JSON import widens arrays; the file is checked against its hash in the tests.
  const policy = frozen
    ? { models: frozen.models, label: `frozen ${frozen.hash}`, path: "data/policy.frozen.json" }
    : { models: prior.models as unknown as Models, label: `SIMULATED prior ${prior.hash}`, path: "data/policy.prior.json" };
  return <EvalLab policy={policy} />;
}
