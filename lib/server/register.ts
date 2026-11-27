import { assign, type Assignment, type StudyArm, type VariantOrder } from "../study/assignment";
import type { Registration } from "../study/validate";
import type { Db, Doc } from "./db";

export type Registered = Assignment & { offline: boolean; phase: string };

const MAX_SLOTS = 2000; // per phase and pointer type; the study targets tens of people

const stored = (d: Doc): Registered => ({
  arm: d.arm as StudyArm, order: d.variant_order as VariantOrder, offline: d.offline as boolean, phase: d.phase as string,
});

/**
 * The route has checked r.phase against the server's phase. Idempotent per participant id.
 * A slot document is created together with the participant, so two people cannot take one slot.
 */
export async function register(db: Db, r: Registration, now = new Date()): Promise<Registered> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const existing = await db.get("participants", r.id);
    if (existing) {
      if (!r.offline || existing.offline) return stored(existing);
      // The server assigned a slot but the reply was lost: record what the person actually saw.
      const seen = { ...existing, arm: r.offline.arm, variant_order: r.offline.order, offline: true };
      await db.set("participants", r.id, seen);
      return stored(seen);
    }

    const stratum = `${r.phase}_${r.pointer}`;
    let seq: number | null = null;
    let assignment = r.offline;
    if (!assignment) {
      const taken = await db.where("slots", "stratum", "==", stratum, MAX_SLOTS);
      seq = taken.reduce((next, s) => Math.max(next, (s.data.seq as number) + 1), 0);
      assignment = assign(r.phase, r.pointer, seq);
    }
    const participant: Doc = {
      id: r.id, phase: r.phase, pointer: r.pointer, viewport_width: r.viewportWidth,
      arm: assignment.arm, variant_order: assignment.order, seq,
      offline: r.offline !== null, repeat_device: r.repeatDevice, created_at: now.toISOString(),
    };
    const created = await db.create([
      { collection: "participants", id: r.id, data: participant },
      ...(seq === null ? [] : [{ collection: "slots", id: `${stratum}_${seq}`, data: { stratum, seq } }]),
    ]);
    if (created) return stored(participant);
  }
  throw new Error("assignment contention");
}
