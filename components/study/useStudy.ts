"use client";

import { useEffect, useRef, useState } from "react";
import { SURFACES } from "@/lib/attune-ui/surface/catalog";
import { summarizeFriction } from "@/lib/attune-ui/telemetry/friction";
import { modalityOf } from "@/lib/attune-ui/telemetry/context";
import type { ArmId, FrictionSummary, PointerKind } from "@/lib/attune-ui/types";
import { simulatorPrior } from "@/lib/demo/prior";
import { blockCount, offlineAssignment, variantFor, type Block, type Phase } from "@/lib/study/assignment";
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

export function useStudy(phase: Phase) {
  const blocks = blockCount(phase);
  const uploads = useUploads();
  const [stage, setStage] = useState<Stage>("consent");
  const [position, setPosition] = useState<{ block: Block; index: number }>({ block: 1, index: 0 });
  const [adapted, setAdapted] = useState<ArmId>("baseline"); // decided at the last boundary
  const [undone, setUndone] = useState(false);
  const [pinned, setPinned] = useState(false);
  const participant = useRef<ParticipantRecord | null>(null);
  const blockFriction = useRef<FrictionSummary[]>([]); // current block only
  const [refused, setRefused] = useState(false);

  // Built up front (and cached): at the block boundary the freeze let extra taps hit Undo.
  useEffect(() => {
    const timer = setTimeout(simulatorPrior, 0);
    return () => clearTimeout(timer);
  }, []);

  const begin = async (pointer: PointerKind) => {
    setStage("starting");
    setRefused(false);
    const base = {
      id: newParticipantId(), pointer, viewportWidth: window.innerWidth, repeatDevice: markDevice(), phase,
      code: new URLSearchParams(window.location.search).get("code")?.slice(0, 64) ?? "",
    };
    let assigned: Registered;
    try {
      const response = await post("/api/participants", base);
      // A wrong code must stop here, not fall through to offline mode.
      if (response.status === 403) {
        setRefused(true);
        setStage("consent");
        return;
      }
      if (!response.ok) throw new Error(String(response.status));
      assigned = (await response.json()) as Registered;
    } catch {
      const local = offlineAssignment(base.id, phase);
      assigned = { ...local, offline: true, phase };
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
  const arm: ArmId = position.block > 1 && !undone ? adapted : "baseline";

  const taskDone = ({ success, timeMs, events }: TaskResult) => {
    if (!p) return;
    const raw = roundEvents(events);
    const friction = summarizeFriction(raw, modalityOf(p.pointer));
    blockFriction.current.push(friction);
    const key = { taskIndex: position.index, taskId: task.id, variant };
    chunk(raw).forEach((part, i) =>
      uploads.record(position.block, "interactions", { ...key, part: i, events: part }));
    uploads.record(position.block, "task", {
      ...key, surface: arm, success, timeMs, friction, viewportWidth: window.innerWidth,
    });
    setStage("rating");
  };

  /** One decision per boundary, from the finished block's events only. */
  const decideBlock = (record: ParticipantRecord, block: Block) => {
    const { models, marginals } = simulatorPrior();
    const decision = boundaryDecision({
      arm: record.arm, previous: blockFriction.current, block, pointer: record.pointer,
      viewportWidth: window.innerWidth, participantId: record.id, policy: { models, marginals },
    });
    const provenance = record.arm === "P" ? "uniform random (pilot)" : "SIMULATED prior; not frozen";
    uploads.record(block, "decision", { ...decision, provenance });
    blockFriction.current = [];
    setAdapted(decision.action);
    setUndone(false);
    setPinned(false);
  };

  const rate = (seq: number) => {
    if (!p) return;
    uploads.record(position.block, "rating", { taskIndex: position.index, taskId: task.id, seq });
    if (position.index < TASKS[variant].length - 1) {
      setPosition({ ...position, index: position.index + 1 });
    } else if (position.block < blocks) {
      const next = (position.block + 1) as Block;
      decideBlock(p, next);
      setPosition({ block: next, index: 0 });
    } else {
      uploads.record(position.block, "done", {});
      setStage("done");
      return;
    }
    setStage("ready");
  };

  // Undo and Pin are logged and analysed intention-to-treat; they only act between tasks.
  const chip = (action: "undo" | "pin") => {
    uploads.record(position.block, "chip", { action, beforeTask: position.index, surface: arm });
    if (action === "undo") setUndone(true);
    else setPinned(true);
  };

  return {
    stage, position, blocks, refused, task, surface: SURFACES[arm], offline: p?.offline ?? false,
    showChip: position.block > 1 && adapted !== "baseline", undone, pinned,
    pending: uploads.pending, rejected: uploads.rejected, download: uploads.download,
    begin, start: () => setStage("task"), taskDone, rate, chip,
  };
}
