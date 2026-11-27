// Pre-registered primary analysis. Unit = participant. evaluation/verify_results.py mirrors this.
import type { EventLog } from "../attune-ui/bandit/replay";
import { TASK_CAP_MS } from "../attune-ui/bandit/reward";
import { makeRng } from "../attune-ui/rng";
import { STUDY_ARMS, type Phase } from "../study/assignment";
import { hedgesG, holm, mannWhitney, mean, quantile } from "./tests";

export const SEED = 2026;
export const RESAMPLES = 10_000;
const CONTRASTS = [["C", "A"], ["C", "B"]] as const;

type Arm = (typeof STUDY_ARMS)[number];
/** y = log Block-2 total, x = log Block-1 total; failed tasks count as the 90 s cap. */
export interface Subject { id: string; arm: Arm; stratum: string; x: number; y: number }

const perArm = () => ({ A: 0, B: 0, C: 0 });
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Block total in ms, or null unless all three tasks are present and valid. */
function total(rows: EventLog["events"]): number | null {
  const tasks = new Map<unknown, number | null>();
  for (const { kind, payload } of rows) {
    if (kind !== "task" || !isRecord(payload) || ![0, 1, 2].includes(payload.taskIndex as number)) continue;
    const { success, timeMs } = payload;
    const valid = typeof success === "boolean" && typeof timeMs === "number" && timeMs > 0 && Number.isFinite(timeMs);
    tasks.set(payload.taskIndex, !valid ? null : success ? Math.min(timeMs, TASK_CAP_MS) : TASK_CAP_MS);
  }
  const times = [0, 1, 2].map((i) => tasks.get(i));
  return times.every((t) => typeof t === "number") ? (times as number[]).reduce((s, t) => s + t, 0) : null;
}

/** Exclusions are applied in this order: phase, repeat device, incomplete, offline assignment. */
export function subjectsFromLog(log: EventLog, phase: Phase = "confirmatory") {
  const rows = new Map<string, EventLog["events"][number]>(); // retried uploads repeat rows
  for (const e of log.events) rows.set(`${e.participant_id}:${e.seq}`, e);
  const byPerson = new Map<string, EventLog["events"]>();
  for (const e of [...rows.values()].sort((a, b) => a.seq - b.seq)) {
    const list = byPerson.get(e.participant_id);
    if (list) list.push(e);
    else byPerson.set(e.participant_id, [e]);
  }
  const people = new Map(log.participants.map((p) => [p.id, p]));
  const exclusions = { otherPhase: 0, unknownArm: 0, repeatDevice: perArm(), incomplete: perArm(), offline: perArm() };
  const subjects: Subject[] = [];
  const offline: Subject[] = [];
  for (const id of [...people.keys()].sort()) {
    const p = people.get(id)! as EventLog["participants"][number] & { arm?: unknown };
    if (p.phase !== phase) { exclusions.otherPhase++; continue; }
    const arm = STUDY_ARMS.find((a) => a === p.arm);
    if (!arm) { exclusions.unknownArm++; continue; }
    if (p.repeat_device) { exclusions.repeatDevice[arm]++; continue; }
    const own = byPerson.get(id) ?? [];
    const first = total(own.filter((e) => e.block === 1));
    const second = total(own.filter((e) => e.block === 2));
    if (first === null || second === null || !own.some((e) => e.block === 2 && e.kind === "decision")) {
      exclusions.incomplete[arm]++;
      continue;
    }
    const subject = { id, arm, stratum: p.pointer, x: Math.log(first), y: Math.log(second) };
    if (p.offline) { exclusions.offline[arm]++; offline.push(subject); } else subjects.push(subject);
  }
  return { subjects, offline, exclusions };
}

/** Y_adj = Y - theta (X - mean X), theta pooled over all analysed participants. */
export function cuped(subjects: Subject[]) {
  const mx = mean(subjects.map((s) => s.x));
  const my = mean(subjects.map((s) => s.y));
  let cov = 0;
  let varX = 0;
  for (const s of subjects) {
    cov += (s.x - mx) * (s.y - my);
    varX += (s.x - mx) ** 2;
  }
  const theta = varX > 0 ? cov / varX : 0;
  return { theta, adjusted: subjects.map((s) => s.y - theta * (s.x - mx)) };
}

/** Two-sided, labels shuffled within pointer stratum. p = (hits + 1) / (resamples + 1). */
function permutationP(values: number[], treated: boolean[], strata: string[], resamples: number) {
  const groups = [...new Set(strata)].sort().map((k) => strata.flatMap((s, i) => (s === k ? [i] : [])));
  const diff = (labels: boolean[]) =>
    mean(values.filter((_, i) => labels[i])) - mean(values.filter((_, i) => !labels[i]));
  const observed = Math.abs(diff(treated));
  const rng = makeRng(SEED);
  let hits = 0;
  for (let r = 0; r < resamples; r++) {
    const labels = treated.slice();
    for (const idx of groups) {
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [labels[idx[i]], labels[idx[j]]] = [labels[idx[j]], labels[idx[i]]];
      }
    }
    if (Math.abs(diff(labels)) >= observed - 1e-12) hits++;
  }
  return (hits + 1) / (resamples + 1);
}

/** Percentile bootstrap of mean(a) - mean(b), resampling within arm. */
function bootstrapCi(a: number[], b: number[], resamples: number): [number, number] {
  const rng = makeRng(SEED);
  const draw = (v: number[]) => {
    let sum = 0;
    for (let i = 0; i < v.length; i++) sum += v[Math.floor(rng.next() * v.length)];
    return sum / v.length;
  };
  const diffs = Array.from({ length: resamples }, () => draw(a) - draw(b)).sort((x, y) => x - y);
  return [quantile(diffs, 0.025), quantile(diffs, 0.975)];
}

export function analyse(log: EventLog, phase: Phase = "confirmatory", resamples = RESAMPLES) {
  const { subjects, offline, exclusions } = subjectsFromLog(log, phase);
  const { theta, adjusted } = cuped(subjects);
  const n = perArm();
  for (const s of subjects) n[s.arm]++;
  const contrasts = CONTRASTS.map(([first, second]) => {
    const picked = subjects.flatMap((s, i) => (s.arm === first || s.arm === second ? [i] : []));
    const a = picked.filter((i) => subjects[i].arm === first).map((i) => adjusted[i]);
    const b = picked.filter((i) => subjects[i].arm === second).map((i) => adjusted[i]);
    const ok = a.length > 0 && b.length > 0;
    const enough = a.length > 1 && b.length > 1;
    const difference = ok ? mean(a) - mean(b) : null; // negative: C is faster
    return {
      name: `${first}-${second}`,
      n: [a.length, b.length],
      difference,
      timeRatio: difference === null ? null : Math.exp(difference),
      hedgesG: enough ? hedgesG(a, b) : null,
      ci95: enough ? bootstrapCi(a, b, resamples) : null,
      p: ok ? permutationP(picked.map((i) => adjusted[i]), picked.map((i) => subjects[i].arm === first),
        picked.map((i) => subjects[i].stratum), resamples) : null,
      mannWhitney: ok ? mannWhitney(a, b) : null,
    };
  });
  const adjustedP = holm(contrasts.map((c) => c.p));
  return {
    phase,
    n,
    theta,
    exclusions,
    // Offline-assigned participants are reported apart, unadjusted.
    offlineMeanLogBlock2: Object.fromEntries(STUDY_ARMS.map((arm) => {
      const y = offline.filter((s) => s.arm === arm).map((s) => s.y);
      return [arm, y.length > 0 ? mean(y) : null];
    })),
    contrasts: contrasts.map((c, i) => ({ ...c, pHolm: adjustedP[i] })),
  };
}
