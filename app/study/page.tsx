import type { Metadata } from "next";
import { StudyShell } from "@/components/study/StudyShell";

export const metadata: Metadata = { title: "AttuneUI study" };

export default function StudyPage() {
  return <StudyShell />;
}
