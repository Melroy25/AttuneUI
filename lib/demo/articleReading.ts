// Silent reading signals inside the article reader. Long reading alone is never confusion.

export const READING = {
  turnPx: 60, // travel needed before a change of direction counts
  windowMs: 60_000,
  revisits: 2, // times scrolled back to the same paragraph
  reversals: 2, // changes of scroll direction in the window
  pinAfterMs: 8000, pinProgress: 0.15, activeMs: 30_000, finished: 0.95, finishAfterMs: 10_000,
  idleUnpinMs: 120_000, awayUnpinMs: 600_000,
};

export interface Tracker {
  y: number | null;
  turn: number; // the furthest point in the current direction
  direction: -1 | 0 | 1;
  reversals: number[]; // times
  travelled: number;
  left: Record<string, boolean>; // seen before and now out of view
  revisits: Record<string, number>;
}

export const newTracker = (): Tracker =>
  ({ y: null, turn: 0, direction: 0, reversals: [], travelled: 0, left: {}, revisits: {} });

export function scrolled(s: Tracker, t: number, y: number): Tracker {
  if (s.y === null) return { ...s, y, turn: y };
  const travelled = s.travelled + Math.abs(y - s.y);
  const step = y - s.turn;
  const way = Math.sign(step) as -1 | 0 | 1;
  // Still going the same way: move the turning point along.
  if (s.direction !== 0 && way === s.direction) return { ...s, y, travelled, turn: y };
  if (Math.abs(step) < READING.turnPx) return { ...s, y, travelled };
  const reversals = s.direction === 0 ? s.reversals : [...s.reversals.filter((r) => t - r <= READING.windowMs), t];
  return { ...s, y, travelled, turn: y, direction: way, reversals };
}

/** A paragraph came into or went out of view. Coming back while scrolling up is a revisit. */
export function seen(s: Tracker, id: string, visible: boolean): Tracker {
  if (!visible) return id in s.left ? { ...s, left: { ...s.left, [id]: true } } : s;
  const back = s.left[id] === true && s.direction === -1;
  const revisits = back ? { ...s.revisits, [id]: (s.revisits[id] ?? 0) + 1 } : s.revisits;
  return { ...s, revisits, left: { ...s.left, [id]: false } };
}

/** The paragraph to help with: on screen, returned to repeatedly, during back-and-forth scrolling. */
export function confusedAbout(s: Tracker, t: number, onScreen: string[], helped: string[]): string | null {
  if (s.reversals.filter((r) => t - r <= READING.windowMs).length < READING.reversals) return null;
  const candidates = onScreen.filter((id) => !helped.includes(id) && (s.revisits[id] ?? 0) >= READING.revisits);
  return candidates.sort((a, b) => s.revisits[b] - s.revisits[a])[0] ?? null;
}

export const progressOf = (top: number, height: number, viewport: number) =>
  height > 0 ? Math.min(Math.max((viewport - top) / height, 0), 1) : 0;

export interface Moment { activeMs: number; progress: number; travelled: number; idleMs: number }

/** "reading": worth pinning. "finished": worth unpinning. */
export function readingState(m: Moment): "reading" | "finished" | "other" {
  if (m.travelled < READING.turnPx) return "other"; // never scrolled: nothing to come back to
  if (m.progress >= READING.finished && m.activeMs >= READING.finishAfterMs) return "finished";
  const going = m.idleMs < READING.activeMs && m.activeMs >= READING.pinAfterMs && m.progress >= READING.pinProgress;
  return going ? "reading" : "other";
}
