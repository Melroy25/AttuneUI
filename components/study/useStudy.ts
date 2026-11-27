"use client";

import { useEffect, useRef, useState } from "react";
import { SURFACES } from "@/lib/attune-ui/surface/catalog";
import { summarizeFriction } from "@/lib/attune-ui/telemetry/friction";
import { modalityOf } from "@/lib/attune-ui/telemetry/context";
import type { ArmId, FrictionSummary, PointerKind } from "@/lib/attune-ui/types";
import { simulatorPrior } from "@/lib/demo/prior";
import { STUDY_PHASE, offlineAssignment, variantFor } from "@/lib/study/assignment";
import { boundaryDecision } from "@/lib/study/boundary";
import { chunk, newParticipantId, roundEvents, type ParticipantRecord } from "@/lib/study/records";
import { TASKS } from "@/lib/study/tasks";
import type { Registered } from "@/lib/server/register";
import type { TaskResult } from "./TaskRun";
import { post, useUploads } from "./useUploads";

export type Stage = "consent" | "starting" | "ready" | "task" | "rating" | "done";
const SEEN = "attune-study-seen";

/** True if this browser has started the study before (flag only, no fingerprinting). */
function markDevice(): boolean {
  try {
    const seen = localStorage.getItem(SEEN) !== null;
    localStorage.setItem(SEEN, "1");
    return seen;
  } catch {
    return false;
  }
}

export function useStudy() {
  const uploads = useUploads();
  const [stage, setStage] = useState<Stage>("consent");
  const [position, setPosition] = useState<{ block: 1 | 2; index: number }>({ block: 1, index: 0 });
  const [adapted, setAdapted] = useState<ArmId>("baseline"); // Block 2 surface
  const [undone, setUndone] = useState(false);
  const [pinned, setPinned] = useState(false);
  const participant = useRef<ParticipantRecord | null>(null);
  const block1 = useRef<FrictionSummary[]>([]);

  // Built up front (and cached): at the block boundary the freeze let extra taps hit Undo.
  useEffect(() => {
    const timer = setTimeout(simulatorPrior, 0);
    return () => clearTimeout(timer);
  }, []);

  const begin = async (pointer: PointerKind) => {
    setStage("starting");
    const base = {
      id: newParticipantId(), pointer, viewportWidth: window.innerWidth, repeatDevice: markDevice(),
    };
    let assigned: Registered;
    try {
      const response = await post("/api/participants", base);
      if (!response.ok) throw new Error(String(response.status));
      assigned = (await response.json()) as Registered;
    } catch {
      const local = offlineAssignment(base.id);
      assigned = { ...local, offline: true, phase: STUDY_PHASE };
      // Queued first, so it reaches the server before any of this person's events.
      uploads.enqueue({ url: "/api/participants", body: { ...base, offline: local } });
    }
    participant.current = {
      id: base.id, phase: assigned.phase, pointer, viewport_width: base.viewportWidth,
      arm: assigned.arm, variant_order: assigned.order, offline: assigned.offline,
      repeat_device: base.repeatDevice,
    };
    uploads.identify(participant.current);
    setStage("ready");
  };

  const p = participant.current;
  const variant = p ? variantFor(p.variant_order, position.block) : "A";
  const task = TASKS[variant][position.index];
  const arm: ArmId = position.block === 2 && !undone ? adapted : "baseline";

  const taskDone = ({ success, timeMs, events }: TaskResult) => {
    if (!p) return;
    const raw = roundEvents(events);
    const friction = summarizeFriction(raw, modalityOf(p.pointer));
    if (position.block === 1) block1.current.push(friction);
    const key = { taskIndex: position.index, taskId: task.id, variant };
    chunk(raw).forEach((part, i) =>
      uploads.record(position.block, "interactions", { ...key, part: i, events: part }));
    uploads.record(position.block, "task", {
      ...key, surface: arm, success, timeMs, friction, viewportWidth: window.innerWidth,
    });
    setStage("rating");
  };

  /** Exactly one decision per participant, from Block 1 events only. */
  const decideBlock2 = (record: ParticipantRecord) => {
    const { models, marginals } = simulatorPrior();
    const decision = boundaryDecision({
      arm: record.arm, block1: block1.current, pointer: record.pointer,
      viewportWidth: window.innerWidth, participantId: record.id, policy: { models, marginals },
    });
    uploads.record(2, "decision", { ...decision, provenance: "SIMULATED prior; not frozen" });
    setAdapted(decision.action);
  };

  const rate = (seq: number) => {
    if (!p) return;
    uploads.record(position.block, "rating", { taskIndex: position.index, taskId: task.id, seq });
    if (position.index < TASKS[variant].length - 1) {
      setPosition({ ...position, index: position.index + 1 });
    } else if (position.block === 1) {
      decideBlock2(p);
      setPosition({ block: 2, index: 0 });
    } else {
      uploads.record(2, "done", {});
      setStage("done");
      return;
    }
    setStage("ready");
  };

  // Undo and Pin are logged and analysed intention-to-treat; they only act between tasks.
  const chip = (action: "undo" | "pin") => {
    uploads.record(2, "chip", { action, beforeTask: position.index, surface: arm });
    if (action === "undo") setUndone(true);
    else setPinned(true);
  };

  return {
    stage, position, task, surface: SURFACES[arm], offline: p?.offline ?? false,
    showChip: position.block === 2 && adapted !== "baseline", undone, pinned,
    pending: uploads.pending, rejected: uploads.rejected, download: uploads.download,
    begin, start: () => setStage("task"), taskDone, rate, chip,
  };
}
