"use client";

import { STRINGS, taskText } from "@/components/portal/strings";
import { TaskRun } from "./TaskRun";
import { useStudy } from "./useStudy";

const primary = "min-h-12 w-full rounded bg-indigo-600 px-4 font-semibold text-white disabled:opacity-50";
const secondary = "min-h-12 rounded border px-3 text-sm disabled:opacity-50";

export function StudyShell() {
  const d = useStudy();
  const { block, index } = d.position;
  const s = STRINGS.en;

  if (d.stage === "task") {
    return (
      <main className="mx-auto max-w-7xl space-y-3 p-4">
        <TaskRun key={`${block}-${index}`} task={d.task} number={index + 1} surface={d.surface} onDone={d.taskDone} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Usability study</h1>

      {(d.stage === "consent" || d.stage === "starting") && (
        <>
          <p>
            Anonymous: we record taps, clicks, scrolling, task times and your ratings, no personal
            data, and you can stop at any time by closing this page.
          </p>
          <p className="text-sm text-gray-600">
            Two rounds of 3 short tasks on a made-up order screen. Each task ends after 90 seconds.
          </p>
          <button type="button" className={primary} disabled={d.stage === "starting"}
            // The pointer used to agree decides the stratum; keyboard users fall back to the media query.
            onClick={(e) => {
              const type = (e.nativeEvent as PointerEvent).pointerType;
              void d.begin(
                type === "touch" || type === "pen" || type === "mouse" ? type
                : matchMedia("(pointer: coarse)").matches ? "touch" : "mouse",
              );
            }}>
            {d.stage === "starting" ? "Starting…" : "I agree – start"}
          </button>
          {d.stage === "consent" && d.pending + d.rejected > 0 && (
            <div role="status" className="space-y-2 border-t pt-4 text-sm">
              <p>Data from an earlier session on this device has not uploaded.</p>
              <button type="button" className={secondary} onClick={d.download}>Download saved data (JSON)</button>
            </div>
          )}
        </>
      )}

      {d.stage === "ready" && (
        <>
          <p className="text-sm text-gray-600">Round {block} of 2 · Task {index + 1} of 3</p>
          <p className="text-lg font-semibold">{taskText(d.task, "en")}</p>
          {d.showChip && (
            <div role="status" className="flex flex-wrap items-center gap-2 rounded border border-indigo-400 bg-indigo-50 p-2 text-sm">
              <strong>{s.adapted}</strong>
              <button type="button" className={secondary} disabled={d.undone} onClick={() => d.chip("undo")}>{s.undo}</button>
              <button type="button" className={secondary} disabled={d.pinned} onClick={() => d.chip("pin")}>{s.pin}</button>
            </div>
          )}
          <button type="button" className={primary} onClick={d.start}>Start task</button>
        </>
      )}

      {d.stage === "rating" && (
        <fieldset className="space-y-2">
          <legend className="font-semibold">Overall, how difficult or easy was that task?</legend>
          <div className="grid grid-cols-7 gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              // Keyed per task so focus never carries over to the next rating.
              <button key={`${block}-${index}-${n}`} type="button" className="min-h-12 rounded border text-lg"
                aria-label={`${n} of 7${n === 1 ? ", very difficult" : n === 7 ? ", very easy" : ""}`}
                onClick={() => d.rate(n)}>{n}</button>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Very difficult</span><span>Very easy</span>
          </div>
        </fieldset>
      )}

      {d.stage === "done" && (
        <>
          <p className="text-lg font-semibold">Finished. Thank you.</p>
          <p role="status">
            {d.pending === 0 && d.rejected === 0
              ? "All data uploaded. You can close this page."
              : `${d.pending} uploads waiting, ${d.rejected} refused. Keep this page open, or download the file and send it to the study team.`}
          </p>
          <button type="button" className={d.pending + d.rejected > 0 ? primary : secondary} onClick={d.download}>
            Download my data (JSON)
          </button>
        </>
      )}

      {d.offline && d.stage !== "consent" && (
        <p className="text-sm text-amber-800">Offline mode: this session is flagged and analysed separately.</p>
      )}
    </main>
  );
}
