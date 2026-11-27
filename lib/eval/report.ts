// Wording, numbers and tables for the /eval dashboard. No statistics are defined here.
import type { EventLog } from "../attune-ui/bandit/replay";
import { STUDY_ARMS, type Phase } from "../study/assignment";
import type { Participant } from "./dataset";
import { analyse, subjectsFromLog } from "./stats";

export const ALPHA = 0.05; // pre-registered, Holm-adjusted
export const ARM_NAMES: Record<string, string> = {
  A: "Static", B: "Placebo", C: "AttuneUI", P: "Pilot (uniform)",
};

export const seconds = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1)} s`);
export const fixed = (v: number | null | undefined, digits = 3) =>
  v === null || v === undefined ? "—" : v.toFixed(digits);
export const signed = (v: number | null, digits = 1, unit = "") =>
  v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}${unit}`;
export const pValue = (p: number | null | undefined) =>
  p === null || p === undefined ? "—" : p < 0.001 ? "<0.001" : p.toFixed(3);

/** Percent less time implied by a log-time difference; negative means slower. */
export const speedup = (logDifference: number) => (1 - Math.exp(logDifference)) * 100;
export const speedText = (logDifference: number | null) => {
  if (logDifference === null) return "—";
  const s = speedup(logDifference);
  return `${Math.abs(s).toFixed(1)}% ${s >= 0 ? "faster" : "slower"}`;
};
/** The interval on the same "percent faster" scale, lower bound first. */
export const speedInterval = (ci: [number, number] | null) =>
  ci ? `${signed(speedup(ci[1]))}% to ${signed(speedup(ci[0]))}%` : "—";

export type Contrast = ReturnType<typeof analyse>["contrasts"][number];

export function verdict(c: Contrast): { text: string; tone: "good" | "bad" | "none" } {
  const other = ARM_NAMES[c.name.slice(2)];
  if (c.difference === null || c.pHolm === null) return { text: "Not testable: an arm has no participants", tone: "none" };
  if (c.pHolm >= ALPHA) return { text: "No clear difference (null result)", tone: "none" };
  return c.difference < 0
    ? { text: `AttuneUI faster than ${other}`, tone: "good" }
    : { text: `AttuneUI slower than ${other}`, tone: "bad" };
}

/** Per arm: enrolled, analysed by pointer type, and each exclusion. */
export function sampleTable(log: { participants: Participant[]; events: EventLog["events"] }, phase: Phase) {
  const { subjects, exclusions } = subjectsFromLog(log, phase);
  const people = log.participants.filter((p) => p.phase === phase);
  const pointers = [...new Set(["touch", "mouse", ...people.map((p) => p.pointer)])];
  const rows = [...new Set<string>([...STUDY_ARMS, ...people.map((p) => p.arm)])].map((arm) => {
    const mine = subjects.filter((s) => s.arm === arm);
    const known = STUDY_ARMS.find((a) => a === arm);
    return {
      arm,
      enrolled: people.filter((p) => p.arm === arm).length,
      byPointer: pointers.map((k) => mine.filter((s) => s.stratum === k).length),
      included: mine.length,
      repeatDevice: known ? exclusions.repeatDevice[known] : 0,
      incomplete: known ? exclusions.incomplete[known] : 0,
      offline: known ? exclusions.offline[known] : 0,
    };
  });
  return { total: people.length, pointers, rows, otherPhase: exclusions.otherPhase, unknownArm: exclusions.unknownArm };
}

/** The file name goes into a shell command, so anything unusual becomes a placeholder. */
export function verifyCommand(fileName: string | null, policyPath: string): string {
  const safe = fileName && /^[\w][\w./-]*\.json$/.test(fileName) ? fileName : "<export.json>";
  return `python evaluation/verify_results.py ${safe} --policy ${policyPath}`;
}
