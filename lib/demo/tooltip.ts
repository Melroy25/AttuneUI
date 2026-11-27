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
