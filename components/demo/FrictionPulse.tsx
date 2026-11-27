"use client";

import { useEffect, useState, type RefObject } from "react";
import type { Tap } from "@/lib/demo/comfort";
import { pulseFor, type Pulse } from "@/lib/demo/pulse";
import { measure } from "./useComfort";

const SHOWN_MS = 700;
const LABELLED = "[data-attune-id],[data-attune-tap],[data-dead-context]";

/** Mounted only while the X-Ray is open. A red ring and tag where friction was just sensed. */
export function FrictionPulse({ rootRef }: { rootRef: RefObject<HTMLElement | null> }) {
  const [marks, setMarks] = useState<{ id: number; x: number; y: number; label: Pulse }[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let earlier: Tap[] = [];
    let id = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onClick = (e: MouseEvent) => {
      if (e.detail === 0 || (e.target as Element).closest("[data-attune-ignore]")) return;
      const tap = measure(root, e);
      const label = pulseFor(earlier, tap, (e.target as Element).closest(LABELLED) !== null);
      earlier = [...earlier, tap].slice(-5);
      if (!label) return;
      const mine = ++id;
      setMarks((all) => [...all, { id: mine, x: tap.x, y: tap.y, label }]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setMarks((all) => all.filter((m) => m.id !== mine));
      }, SHOWN_MS);
      timers.add(timer);
    };
    // Capture phase: measured before a click changes the page.
    root.addEventListener("click", onClick, true);
    return () => {
      root.removeEventListener("click", onClick, true);
      timers.forEach(clearTimeout);
    };
  }, [rootRef]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
      {marks.map((m) => (
        <div key={m.id} className="absolute" style={{ left: m.x, top: m.y }}>
          <span data-part="pulse" />
          <span className="absolute left-4 top-3 whitespace-nowrap rounded bg-red-700 px-1.5 py-0.5 text-xs font-bold text-white">
            {m.label}
          </span>
        </div>
      ))}
    </div>
  );
}
