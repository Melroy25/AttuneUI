// /demo only: which enlarged text "Is that okay?" is about, and whether the question still stands.
import type { Scales } from "./textSize";

export interface Ask { id: string; size: number }

/** The most recently enlarged text: the one Undo works on. */
export function newestText(scales: Scales): Ask | null {
  const id = Object.keys(scales).at(-1);
  return id ? { id, size: scales[id] } : null;
}

/** An Undo from elsewhere (⚙ menu, Reset) closes the question, so its Undo never hits another text. */
export const stillAsking = (asked: Ask | null, scales: Scales) => {
  const now = newestText(scales);
  return asked !== null && now !== null && now.id === asked.id && now.size === asked.size;
};
