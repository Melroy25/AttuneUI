import type { Metadata } from "next";
import { connection } from "next/server";
import { StudyShell } from "@/components/study/StudyShell";
import { parsePhase } from "@/lib/study/assignment";

export const metadata: Metadata = { title: "AttuneUI study" };

export default async function StudyPage() {
  await connection(); // read STUDY_PHASE per request, not at build time
  const phase = parsePhase(process.env.STUDY_PHASE);
  if (!phase) return <main className="p-6">The study is not configured. Tell the study team.</main>;
  return <StudyShell phase={phase} />;
}
