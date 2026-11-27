// Where the tooltip pill goes: above its control, below if there is no room, never off screen.
const GAP = 6;
const EDGE = 8;

export function placeTooltip(
  target: { top: number; bottom: number; left: number; width: number },
  tip: { width: number; height: number },
  viewportWidth: number,
) {
  const above = target.top - GAP - tip.height;
  const centred = target.left + target.width / 2 - tip.width / 2;
  return {
    top: above >= EDGE ? above : target.bottom + GAP,
    left: Math.max(EDGE, Math.min(centred, viewportWidth - tip.width - EDGE)),
  };
}

/** A popover under its anchor, pulled back inside the window on every side. */
export function placeBelow(
  anchor: { bottom: number; right: number },
  box: { width: number; height: number },
  view: { width: number; height: number },
) {
  const clamp = (v: number, most: number) => Math.max(EDGE, Math.min(v, most - EDGE));
  return {
    top: clamp(anchor.bottom + GAP, view.height - box.height),
    left: clamp(anchor.right - box.width, view.width - box.width), // the anchor sits at the right
  };
}
