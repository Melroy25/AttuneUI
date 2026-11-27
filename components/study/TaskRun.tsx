"use client";

import { useEffect, useRef } from "react";
import { Portal } from "@/components/portal/Portal";
import { taskText } from "@/components/portal/strings";
import { DEFAULT_PREFERENCES } from "@/lib/attune-ui/preferences/rules";
import { TASK_CAP_MS } from "@/lib/attune-ui/bandit/reward";
import type { SurfaceConfig } from "@/lib/attune-ui/surface/catalog";
import { startCapture } from "@/lib/attune-ui/telemetry/capture";
import type { InteractionEvent } from "@/lib/attune-ui/types";
import { isComplete, type Task } from "@/lib/study/tasks";

export interface TaskResult { success: boolean; timeMs: number; events: InteractionEvent[] }

const ignore = () => {};

/** One timed task on a fresh portal. Mount it with a new key for every task. */
export function TaskRun({ task, number, surface, onDone }: {
  task: Task;
  number: number;
  surface: SurfaceConfig;
  onDone: (result: TaskResult) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const finish = useRef<(success: boolean) => void>(ignore);
  const view = useRef<(view: string) => void>(ignore);
  const done = useRef(onDone);

  useEffect(() => {
    if (!rootRef.current) return;
    const capture = startCapture(rootRef.current);
    const started = performance.now();
    let finished = false;
    view.current = capture.view;
    finish.current = (success) => {
      if (finished) return;
      finished = true;
      const elapsed = performance.now() - started;
      done.current({
        // Background tabs throttle timers, so the cap is checked on the clock too.
        success: success && elapsed <= TASK_CAP_MS,
        timeMs: Math.round(Math.min(Math.max(elapsed, 1), TASK_CAP_MS)),
        events: capture.drain(),
      });
    };
    const timer = setTimeout(() => finish.current(false), TASK_CAP_MS);
    window.scrollTo(0, 0);
    return () => {
      clearTimeout(timer);
      capture.stop();
    };
  }, []);

  return (
    <>
      <p className="sticky top-0 z-20 rounded bg-amber-100 p-2 text-sm font-semibold">
        Task {number}/3 · {taskText(task, "en")}
      </p>
      <div ref={rootRef}>
        {/* The study uses default preferences and collects no preference signals. */}
        <Portal surface={surface} preferences={DEFAULT_PREFERENCES} task={task} onSignal={ignore}
          onView={(v) => view.current(v)}
          onAction={(action) => { if (isComplete(task, action)) finish.current(true); }} />
      </div>
    </>
  );
}
