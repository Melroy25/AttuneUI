// /demo only: clicking one piece of text again and again (4 times in 2.5 s) makes it one step bigger.
// A double click or double tap is too easy to do by accident, so it does nothing.

/** Percent of the text's own normal size. */
export const SIZES = [100, 112.5, 125, 137.5] as const;
export const BURST = { ms: 2500, clicks: 4 };
export const MAX_TEXTS = 100;
export interface Burst { id: string; start: number; count: number }
/** Enlarged texts by data-text-id. The newest change is the last key: that is what Undo takes. */
export type Scales = Record<string, number>;

export const textKey = (user: string | null) => `attune-text:${user ?? "guest"}`;

/** Clicks on one text within the window add up; another text, or a pause, starts again. */
export function nextBurst(last: Burst | null, id: string, t: number): Burst {
  const same = last !== null && last.id === id && t - last.start <= BURST.ms;
  return same ? { ...last, count: last.count + 1 } : { id, start: t, count: 1 };
}

export const deliberate = (b: Burst) => b.count >= BURST.clicks;

const without = (scales: Scales, id: string): Scales =>
  Object.fromEntries(Object.entries(scales).filter(([k]) => k !== id));
const stepOf = (size: number | undefined) => Math.max(SIZES.findIndex((s) => s === size), 0);

/** One step bigger, or null when that text is already at the largest size. */
export function enlarge(scales: Scales, id: string): Scales | null {
  const size = SIZES[stepOf(scales[id]) + 1];
  return size === undefined ? null : parseScales({ ...without(scales, id), [id]: size });
}

/** Takes the most recently enlarged text one step back; it stays the one Undo works on. */
export function undoLast(scales: Scales): { scales: Scales; id: string; size: number } | null {
  const id = Object.keys(scales).at(-1);
  if (!id) return null;
  const size = SIZES[Math.max(stepOf(scales[id]) - 1, 0)];
  const rest = without(scales, id);
  return { scales: size === 100 ? rest : { ...rest, [id]: size }, id, size };
}

const ID = /^[a-z][A-Za-z0-9:_-]{0,79}$/;

/** Storage, uploads and documents are untrusted. Accepts the object or its JSON. */
export function parseScales(v: unknown): Scales {
  let from = v;
  if (typeof v === "string") {
    try {
      from = JSON.parse(v);
    } catch {
      return {};
    }
  }
  if (typeof from !== "object" || from === null || Array.isArray(from)) return {};
  const kept = Object.entries(from).filter(([id, size]) => ID.test(id) && size !== 100 && SIZES.includes(size as never));
  return Object.fromEntries(kept.slice(-MAX_TEXTS)) as Scales;
}
