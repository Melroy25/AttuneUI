import { useState, type MouseEvent } from "react";
import type { PortalContext } from "@/components/portal/context";

/** Taps on a card itself, not on a button, before its arrow starts to glow. */
const HINT_AFTER = 2;

/** A fixed rule, not the bandit. It lasts until the card is opened or the block ends. */
export function useCardHint(log?: PortalContext["logChange"]) {
  const [taps, setTaps] = useState<Record<string, number>>({});
  return {
    hinted: (id: string) => (taps[id] ?? 0) >= HINT_AFTER,
    clear: (id: string) => setTaps((t) => ({ ...t, [id]: 0 })),
    cardProps: (id: string) => ({
      "data-attune-tap": `card-${id}`,
      // Repeated taps must not select the card's text.
      onMouseDown: (e: MouseEvent) => { if (e.detail > 1) e.preventDefault(); },
      onClick: (e: MouseEvent) => {
        if ((e.target as Element).closest("button")) return;
        if ((taps[id] ?? 0) + 1 === HINT_AFTER) {
          log?.({ trigger: `Tapped the ${id} card ${HINT_AFTER}× without opening it`, change: "Highlighted its arrow" });
        }
        setTaps((t) => ({ ...t, [id]: (t[id] ?? 0) + 1 }));
      },
    }),
  };
}

export function ArrowButton({ ctx, label, hint, onClick }: {
  ctx: PortalContext;
  label: string;
  hint: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" data-part="open" data-hint={hint} aria-label={label} onClick={onClick}
      className={`grid flex-none place-items-center ${ctx.large ? ctx.control : `${ctx.control} w-6`}`}>
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
        <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
