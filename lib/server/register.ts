import { STUDY_PHASE, assign, type Assignment, type StudyArm, type VariantOrder } from "../study/assignment";
import type { Registration } from "../study/validate";
import { rows, type Rest } from "./supabase";

export type Registered = Assignment & { offline: boolean; phase: string };
interface Row { arm: StudyArm; variant_order: VariantOrder; offline: boolean; phase: string }

/** Idempotent per participant id. The unique (phase, pointer, seq) index settles races. */
export async function register(rest: Rest, r: Registration): Promise<Registered> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const [existing] = await rows<Row>(
      rest, `participants?id=eq.${r.id}&select=arm,variant_order,offline,phase`,
    );
    if (existing) {
      if (!r.offline || existing.offline) {
        return { arm: existing.arm, order: existing.variant_order, offline: existing.offline, phase: existing.phase };
      }
      // The server assigned a slot but the reply was lost: record what the person actually saw.
      const patched = await rest(`participants?id=eq.${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ arm: r.offline.arm, variant_order: r.offline.order, offline: true }),
      });
      if (!patched.ok) throw new Error(`database update failed (${patched.status})`);
      return { ...r.offline, offline: true, phase: existing.phase };
    }

    let seq: number | null = null;
    let assignment = r.offline;
    if (!assignment) {
      const [last] = await rows<{ seq: number }>(
        rest,
        `participants?phase=eq.${STUDY_PHASE}&pointer=eq.${r.pointer}&seq=not.is.null&select=seq&order=seq.desc&limit=1`,
      );
      seq = last ? last.seq + 1 : 0;
      assignment = assign(STUDY_PHASE, r.pointer, seq);
    }
    const inserted = await rest("participants", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: r.id, phase: STUDY_PHASE, pointer: r.pointer, viewport_width: r.viewportWidth,
        arm: assignment.arm, variant_order: assignment.order, seq,
        offline: r.offline !== null, repeat_device: r.repeatDevice,
      }),
    });
    if (inserted.ok) return { ...assignment, offline: r.offline !== null, phase: STUDY_PHASE };
    if (inserted.status !== 409) throw new Error(`database insert failed (${inserted.status})`);
  }
  throw new Error("assignment contention");
}
