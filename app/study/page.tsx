import type { Metadata } from "next";
import { connection } from "next/server";
import { StudyShell } from "@/components/study/StudyShell";
import { loadFrozenPolicy } from "@/lib/server/frozen";
import { parsePhase } from "@/lib/study/assignment";

export const metadata: Metadata = { title: "AttuneUI study" };

export default async function StudyPage() {
  await connection(); // read STUDY_PHASE per request, not at build time
  const phase = parsePhase(process.env.STUDY_PHASE);
  const frozen = phase === "confirmatory" ? loadFrozenPolicy() : null;
  if (!phase || frozen?.error) {
    return (
      <main className="space-y-2 p-6">
        <p>The study is not configured. Tell the study team.</p>
        {frozen?.error && <p role="alert" className="text-sm text-red-700">{frozen.error}</p>}
      </main>
    );
  }
  return <StudyShell phase={phase} frozen={frozen?.policy ?? null} />;
}
