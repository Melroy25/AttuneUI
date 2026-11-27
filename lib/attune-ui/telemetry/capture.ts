// DOM listeners that turn raw browser events into InteractionEvents.
import type { InteractionEvent, PointerKind } from "../types";

const INTERACTIVE = "button:not(:disabled),a[href],input,select,textarea,summary,label";
const MOVE_EVERY_MS = 50;
/** App chrome (e.g. the /demo settings menu) that is not part of the measured task. */
const IGNORE = "[data-attune-ignore]";

export interface Rect { left: number; top: number; right: number; bottom: number }

export function distanceToRect(x: number, y: number, r: Rect): number {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
}

export interface Capture {
  pointer(): PointerKind;
  view(view: string): void;
  /** Returns events since the last drain, in time order. */
  drain(): InteractionEvent[];
  /** The same events plus any hover still in progress, without ending or removing anything. */
  peek(): InteractionEvent[];
  stop(): void;
}

export function startCapture(root: HTMLElement, onEvent?: () => void): Capture {
  let events: InteractionEvent[] = [];
  let pointer: PointerKind = matchMedia("(pointer: coarse)").matches ? "touch" : "mouse";
  let pending: Extract<InteractionEvent, { type: "down" }> | null = null;
  let hover: { id: string; t: number } | null = null;
  let lastMove = 0;
  const abort = new AbortController();
  const options = { signal: abort.signal, passive: true, capture: true };
  const push = (e: InteractionEvent) => {
    events.push(e);
    onEvent?.();
  };
  const labelled = (t: EventTarget | null) =>
    t instanceof Element ? t.closest("[data-attune-id]")?.getAttribute("data-attune-id") ?? null : null;
  const endHover = () => {
    if (!hover) return;
    push({ type: "hover", t: hover.t, targetId: hover.id, durationMs: performance.now() - hover.t });
    hover = null;
  };

  root.addEventListener("pointerdown", (e) => {
    pointer = e.pointerType === "touch" || e.pointerType === "pen" ? e.pointerType : "mouse";
    if (e.target instanceof Element && e.target.closest(IGNORE)) {
      pending = null;
      return;
    }
    const interactive = e.target instanceof Element && e.target.closest(INTERACTIVE) !== null;
    let nearTargetPx: number | null = interactive ? 0 : null;
    if (!interactive) {
      for (const el of root.querySelectorAll(INTERACTIVE)) {
        const d = distanceToRect(e.clientX, e.clientY, el.getBoundingClientRect());
        if (nearTargetPx === null || d < nearTargetPx) nearTargetPx = d;
      }
    }
    pending = {
      type: "down", t: performance.now(), x: e.clientX, y: e.clientY,
      targetId: labelled(e.target), interactive, nearTargetPx,
    };
  }, options);
  // Committed on release: a touch that turns into a scroll fires pointercancel instead.
  root.addEventListener("pointerup", () => {
    if (pending) push(pending);
    pending = null;
  }, options);
  root.addEventListener("pointercancel", () => { pending = null; }, options);

  root.addEventListener("pointermove", (e) => {
    const t = performance.now();
    if (e.pointerType === "touch" || t - lastMove < MOVE_EVERY_MS) return;
    lastMove = t;
    events.push({ type: "move", t, x: e.clientX, y: e.clientY });
  }, options);
  root.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const id = labelled(e.target);
    if (id === hover?.id) return;
    endHover();
    if (id) hover = { id, t: performance.now() };
  }, options);
  root.addEventListener("pointerleave", endHover, { signal: abort.signal });
  window.addEventListener("scroll", () => {
    events.push({ type: "scroll", t: performance.now(), y: window.scrollY });
  }, options);

  return {
    pointer: () => pointer,
    view: (view) => push({ type: "view", t: performance.now(), view }),
    peek() {
      const open: InteractionEvent[] = hover
        ? [{ type: "hover", t: hover.t, targetId: hover.id, durationMs: performance.now() - hover.t }]
        : [];
      return [...events, ...open].sort((a, b) => a.t - b.t);
    },
    drain() {
      endHover();
      const out = events.sort((a, b) => a.t - b.t);
      events = [];
      return out;
    },
    stop: () => abort.abort(),
  };
}
