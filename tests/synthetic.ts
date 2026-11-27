// SIMULATED study exports for tests and evaluation/fixtures. Never human data.
import type { EventLog } from "../lib/attune-ui/bandit/replay";
import { makeRng } from "../lib/attune-ui/rng";
import { SURFACES } from "../lib/attune-ui/surface/catalog";
import { frictionCount } from "../lib/attune-ui/telemetry/friction";
import type { FrictionSummary } from "../lib/attune-ui/types";
import { sampleUser, simulateTask } from "../lib/eval/simulator";
import { assign, blockCount, type Block, type Phase } from "../lib/study/assignment";
import { boundaryDecision } from "../lib/study/boundary";
import { priorFile } from "../lib/study/freeze";

export function simulatedLog(phase: Phase, count: number, seed = 7): EventLog {
  const rng = makeRng(seed);
  const policy = priorFile();
  const participants: (EventLog["participants"][number] & { arm: string })[] = [];
  const events: EventLog["events"] = [];
  const slots = { mouse: 0, touch: 0 };
  for (let i = 0; i < count; i++) {
    const user = sampleUser(rng);
    const pointer = user.modality === "coarse" ? ("touch" as const) : ("mouse" as const);
    const id = `sim-${phase}-${String(i).padStart(4, "0")}`;
    const { arm } = assign(phase, pointer, slots[pointer]++);
    participants.push({ id, phase, pointer, arm, offline: false, repeat_device: false });
    let seq = 0;
    const add = (block: number, kind: string, payload: unknown) =>
      events.push({ participant_id: id, seq: seq++, block, kind, payload });
    let surface = SURFACES.baseline;
    let previous: FrictionSummary[] = [];
    for (let block = 1; block <= blockCount(phase); block++) {
      if (block > 1) {
        const decision = boundaryDecision({
          arm, previous, block: block as Block, pointer, viewportWidth: user.viewportWidth,
          participantId: id, policy,
        });
        add(block, "decision", { ...decision });
        surface = SURFACES[decision.action];
      }
      previous = [];
      for (let taskIndex = 0; taskIndex < 3; taskIndex++) {
        const { outcome, friction } = simulateTask(user, surface, rng);
        if (frictionCount(friction) !== outcome.friction) throw new Error("friction mismatch");
        previous.push(friction);
        add(block, "task", { taskIndex, success: outcome.success, timeMs: Math.round(outcome.timeMs), friction });
      }
    }
  }
  return { participants, events };
}

export const pilotLog = (count: number) => simulatedLog("pilot", count);

/** The committed verifier fixture: confirmatory and pilot rows plus every exclusion case. */
export function fixture() {
  const main = simulatedLog("confirmatory", 36);
  const pilot = pilotLog(10);
  const test = simulatedLog("test", 2);
  const [repeat, offline, partial, failed] = main.participants;
  repeat.repeat_device = true;
  offline.offline = true;
  const events = main.events.filter((e) => !(e.participant_id === partial.id && e.block === 2 && e.seq > 5));
  const task = events.find((e) => e.participant_id === failed.id && e.kind === "task" && e.block === 2)!;
  task.payload = { ...(task.payload as object), success: false, timeMs: 20_000 };
  return {
    provenance: "SIMULATED fixture (lib/eval/simulator.ts); not human data",
    participants: [...main.participants, ...pilot.participants, ...test.participants],
    events: [...events, events[0], ...pilot.events, ...test.events], // one retried upload
  };
}
